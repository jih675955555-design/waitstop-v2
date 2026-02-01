import { NextResponse } from 'next/server';

// API Keys
const TMAP_KEY = process.env.NEXT_PUBLIC_WAITSTOP_API_KEY || process.env.NEXT_PUBLIC_TMAP_API_KEY || '';
const ODSAY_KEY = process.env.NEXT_PUBLIC_ODSAY_API_KEY || '';

// Types
type RouteRequest = {
  origin: string;
  destination: string;
};

// --- Helper Functions ---

// 1. TMap API Helper
async function fetchTMap(endpoint: string, params: Record<string, any>, method = 'GET', body: any = null) {
  const url = new URL(endpoint);
  if (method === 'GET') {
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
  }

  const options: RequestInit = {
    method,
    headers: {
      'appKey': TMAP_KEY,
      'Accept': 'application/json',
      ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {})
    }
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url.toString(), options);
  if (!res.ok) {
    if (res.status === 429) {
      console.warn("TMAP API Rate Limit Exceeded"); // Handle gracefully if needed
      return null;
    }
    const text = await res.text();
    console.error(`TMAP Error (${endpoint}): ${res.status} ${text}`);
    return null;
  }
  return res.json();
}

// 2. ODSay API Helper
async function fetchODSay(endpoint: string, params: Record<string, string>) {
  const url = new URL(`https://api.odsay.com/v1/api/${endpoint}`);
  url.searchParams.append('apiKey', ODSAY_KEY);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  const res = await fetch(url.toString());
  if (!res.ok) {
    console.error(`ODSay Error (${endpoint}): ${res.status}`);
    return null;
  }
  return res.json();
}

// 3. Geocoding (Text -> Lat/Lon)
async function getCoordinates(keyword: string) {
  const data = await fetchTMap('https://apis.openapi.sk.com/tmap/pois', {
    version: '1',
    searchKeyword: keyword,
    count: 1
  });
  const poi = data?.searchPoiInfo?.pois?.poi?.[0];
  if (poi) return { lat: poi.noorLat, lon: poi.noorLon, name: poi.name };
  return null;
}

// 4. Taxi Route Calculation (Time & Cost)
async function getTaxiEstimate(start: { lat: string, lon: string }, end: { lat: string, lon: string }) {
  const body = {
    startX: start.lon,
    startY: start.lat,
    endX: end.lon,
    endY: end.lat,
    totalValue: 2 // Request toll/fuel/taxi info
  };
  const data = await fetchTMap('https://apis.openapi.sk.com/tmap/routes?version=1', {}, 'POST', body);
  
  if (data && data.features?.[0]?.properties) {
    const props = data.features[0].properties;
    return {
      time: Math.round(props.totalTime / 60), // minutes
      cost: props.taxiFare || 0,
      distance: props.totalDistance
    };
  }
  return null;
}

// --- Main Route Handler ---

export async function POST(req: Request) {
  try {
    const { origin, destination } = await req.json() as RouteRequest;

    if (!origin || !destination) {
      return NextResponse.json({ error: 'Missing origin or destination' }, { status: 400 });
    }

    // 1. Geocoding
    const startObj = await getCoordinates(origin);
    const endObj = await getCoordinates(destination);

    if (!startObj || !endObj) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // 2. Parallel Processing: VIP (Taxi) & Saver (Transit)
    const [taxiEst, transitData] = await Promise.all([
      getTaxiEstimate(startObj, endObj),
      fetchODSay('searchPubTransPathT', {
        SX: startObj.lon,
        SY: startObj.lat,
        EX: endObj.lon,
        EY: endObj.lat,
      })
    ]);

    // --- Build VIP Option ---
    const vipOption = {
      type: 'VIP',
      title: 'VIP',
      tag: '리치 모드',
      time: taxiEst?.time || 0,
      cost: taxiEst?.cost || 0,
      description: '프라이빗하고 편안한 이동',
      details: taxiEst ? `택시 이동 포함 약 ${taxiEst.time}분` : '경로 정보 없음'
    };

    // --- Build Saver Option ---
    let saverOption = null;
    let smartOption = null;

    const paths = transitData?.result?.path;
    if (paths && paths.length > 0) {
      const bestPath = paths[0]; // ODSay usually returns best path first
      const totalTime = bestPath.info.totalTime;
      const totalPayment = bestPath.info.payment;
      
      saverOption = {
        type: 'Saver',
        title: 'Saver',
        tag: '지갑 수호자',
        time: totalTime,
        cost: totalPayment,
        description: '최저가 이동',
        details: `환승 ${bestPath.info.busTransitCount + bestPath.info.subwayTransitCount}회`
      };

      // --- Build Smart Option (The "Jump" Logic) ---
      // Strategy: Find a major subway line that goes DIRECTLY to destination (or close to it).
      // Then find a station on that line that is ~10-15 mins away by tax from origin.
      
      // 1. Identify "Main Line"
      // Look for the longest subway segment in the best path
      const subwaySegments = bestPath.subPath.filter((p: any) => p.trafficType === 1 || p.trafficType === 2); // 1: Subway, 2: Bus (Focus on Subway for 'Jump' usually)
      
      // Simplified Logic: If the best path has transfers, try to skip the first leg(s) with a taxi.
      // Let's iterate through the path from the END.
      // Find the last subway line.
      const lastSubway = subwaySegments[subwaySegments.length - 1]; // The subway that arrives at or near destination.
      
      if (lastSubway) {
        // This subway line leads to destination (or close to it).
        // We want to board this line EARLIER, skipping bus/transfer/walking from origin.
        
        // However, we need to find a station on this line that is close to origin by TAXI.
        // ODSay doesn't give us ALL stations easily without another call.
        // Heuristic:
        // If the current transit path starts with [Walk -> Bus -> Subway...],
        // The "Jump" is replacing [Walk -> Bus] with [Taxi -> Subway Station].
        
        // Let's identify the FIRST station of the MAIN subway leg.
        const mainStationName = lastSubway.startName;
        const mainStationLat = lastSubway.startY;
        const mainStationLon = lastSubway.startX;

        // Calculate Cost/Time for [Origin -> Main Station] by Taxi
        const jumpTaxiEst = await getTaxiEstimate(startObj, { lat: String(mainStationLat), lon: String(mainStationLon) });

        if (jumpTaxiEst) {
           // Smart Total Time = Taxi Time (to station) + Subway Time (station to dest) + Walk (dest)
           // Approx Subway Time: access from ODSay segment info?
           // The 'sectionTime' in ODSay subPath is for that segment.
           // However, if we simply take the segment time, it might be accurate enough.
           // But if the user takes taxi to that station, they might skip earlier segments.
           
           // Time = JumpTaxiTime + RemainingTransitTime (from that station)
           // We can approx RemainingTransitTime = TotalTransitTime - TimeSpentBeforeMainStation
           
           // Calculate time spent BEFORE the main station in the original path
           let timeBeforeMain = 0;
           for (const sub of bestPath.subPath) {
             if (sub === lastSubway) break;
             timeBeforeMain += sub.sectionTime;
           }
           
           const remainingTransitTime = totalTime - timeBeforeMain;
           const smartTotalTime = jumpTaxiEst.time + remainingTransitTime;
           const smartTotalCost = jumpTaxiEst.cost + lastSubway.sectionTime; // Rough cost: Taxi + Subway Fare (approx 1400)
           // Note: Subway fare is complex, let's assume standard 1500 for now or reuse base fare if simple.
           const smartTransitCost = 1500; 

           smartOption = {
             type: 'Smart',
             title: 'Smart',
             tag: '가성비 전술가',
             time: smartTotalTime,
             cost: jumpTaxiEst.cost + smartTransitCost,
             description: `환승 ${bestPath.info.busTransitCount + bestPath.info.subwayTransitCount - 1}회 생략`, // Approx
             details: `택시(${jumpTaxiEst.time}분) + ${lastSubway.lane[0].name}`,
             badge: smartTotalTime < totalTime ? `${totalTime - smartTotalTime}분 단축` : undefined
           };
        }
      }
    }

    // Fallback if Smart generation failed or isn't better
    if (!smartOption && saverOption && vipOption) {
        // Create a dummy Smart option if real one failed, or just omit?
        // User requested 3 cards. If logic fails, maybe return just 2 or a modified Saver.
        // Let's try to return what we have.
    }

    return NextResponse.json({
      start: startObj.name,
      end: endObj.name,
      options: [saverOption, smartOption, vipOption].filter(Boolean)
    });

  } catch (error) {
    console.error("API Handler Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
