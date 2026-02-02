```typescript
import { NextResponse } from 'next/server';


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
      console.warn("TMAP API Rate Limit Exceeded");
      return null;
    }
    const text = await res.text();
    console.error(`TMAP Error(${ endpoint }): ${ res.status } ${ text } `);
    return null;
  }
  return res.json();
}

// 2. Geocoding (Text -> Lat/Lon)
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

// 3. Taxi Route Calculation (Time & Cost)
async function getTaxiEstimate(start: { lat: string, lon: string }, end: { lat: string, lon: string }) {
  const body = {
    startX: start.lon,
    startY: start.lat,
    endX: end.lon,
    endY: end.lat,
    totalValue: 2
  };
  const data = await fetchTMap('https://apis.openapi.sk.com/tmap/routes?version=1', {}, 'POST', body);

  if (data && data.features?.[0]?.properties) {
    const props = data.features[0].properties;
    return {
      time: Math.round(props.totalTime / 60),
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

    console.log(`[API] Route: ${ startObj.name } -> ${ endObj.name } `);

    // 2. 택시 예상 정보 가져오기
    const taxiEst = await getTaxiEstimate(startObj, endObj).catch(e => {
      console.error("[API] Taxi Check Failed:", e);
      return null;
    });

    console.log("[API] Taxi Result:", taxiEst ? "Success" : "Failed");

    // 3. 좌표 + 택시 정보 반환 (ODSay는 클라이언트에서 호출)
    return NextResponse.json({
      start: {
        name: startObj.name,
        lat: startObj.lat,
        lon: startObj.lon
      },
      end: {
        name: endObj.name,
        lat: endObj.lat,
        lon: endObj.lon
      },
      taxiEstimate: taxiEst
    });

  } catch (error) {
    console.error("API Handler Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
