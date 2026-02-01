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

    console.log(`[API] Searching Route: ${startObj.name} -> ${endObj.name}`);

    // 2. Parallel Processing: VIP (Taxi) & Saver (Transit)
    const [taxiEst, transitData] = await Promise.all([
      getTaxiEstimate(startObj, endObj).catch(e => {
        console.error("[API] Taxi Check Failed:", e);
        return null;
      }),
      fetchODSay('searchPubTransPathT', {
        SX: startObj.lon,
        SY: startObj.lat,
        EX: endObj.lon,
        EY: endObj.lat,
      }).catch(e => {
        console.error("[API] ODSay Check Failed:", e);
        return null;
      })
    ]);

    // Debug Logs
    console.log("[API] Taxi Result:", taxiEst ? "Success" : "Failed");
    console.log("[API] ODSay Result:", transitData ? (transitData.result ? "Success" : "No Result Data") : "Failed/Null",
      transitData?.error ? JSON.stringify(transitData.error) : "");

    // --- Build VIP Option ---
    let vipOption = null;
    if (taxiEst) {
      vipOption = {
        type: 'VIP',
        title: 'VIP',
        tag: '리치 모드',
        time: taxiEst.time,
        cost: taxiEst.cost,
        description: '프라이빗하고 편안한 이동',
        details: `택시 이동 포함 약 ${taxiEst.time}분`
      };
    } else {
      // Fallback VIP (Estimated) if API fails but coordinates exist?
      // Or just omit.
    }

    // --- Build Saver Option ---
    let saverOption = null;
    let smartOption = null;

    const paths = transitData?.result?.path;
    if (paths && paths.length > 0) {
      const bestPath = paths[0];
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
      try {
        const subwaySegments = bestPath.subPath.filter((p: any) => p.trafficType === 1 || p.trafficType === 2);
        const lastSubway = subwaySegments[subwaySegments.length - 1];

        if (lastSubway) {
          const mainStationLat = lastSubway.startY;
          const mainStationLon = lastSubway.startX;

          // Calculate Cost/Time for [Origin -> Main Station] by Taxi
          const jumpTaxiEst = await getTaxiEstimate(startObj, { lat: String(mainStationLat), lon: String(mainStationLon) })
            .catch(e => null);

          if (jumpTaxiEst) {
            let timeBeforeMain = 0;
            for (const sub of bestPath.subPath) {
              if (sub === lastSubway) break;
              timeBeforeMain += sub.sectionTime;
            }

            const remainingTransitTime = totalTime - timeBeforeMain;
            const smartTotalTime = jumpTaxiEst.time + remainingTransitTime;
            // Base Transit Cost (approx) + Taxi Cost
            const smartTransitCost = 1500;

            smartOption = {
              type: 'Smart',
              title: 'Smart',
              tag: '가성비 전술가',
              time: smartTotalTime,
              cost: jumpTaxiEst.cost + smartTransitCost,
              description: `환승 ${bestPath.info.busTransitCount + bestPath.info.subwayTransitCount - 1}회 생략`,
              details: `택시(${jumpTaxiEst.time}분) + ${lastSubway.lane[0].name}`,
              badge: smartTotalTime < totalTime ? `${totalTime - smartTotalTime}분 단축` : undefined
            };
          }
        }
      } catch (smartError) {
        console.error("[API] Smart Logic Failed:", smartError);
        // Don't crash entire response if smart logic fails
      }
    } else {
      console.warn("[API] No transit paths found from ODSay");
    }

    const availableOptions = [saverOption, smartOption, vipOption].filter(Boolean);

    // If absolutely no options, return error or empty
    if (availableOptions.length === 0) {
      console.warn("[API] No valid options generated.");
    }

    return NextResponse.json({
      start: startObj.name,
      end: endObj.name,
      options: availableOptions
    });

  } catch (error) {
    console.error("API Handler Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
