import { NextResponse } from 'next/server';

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY || '';
const ODSAY_KEY = process.env.NEXT_PUBLIC_ODSAY_API_KEY || '';

// Kakao Mobility API Helper
async function getKakaoTaxiEstimate(origin: { lat: number, lon: number }, dest: { lat: number, lon: number }) {
  if (!KAKAO_REST_API_KEY) return null;
  const url = 'https://apis-navi.kakaomobility.com/v1/directions';
  const params = new URLSearchParams({
    origin: `${origin.lon},${origin.lat}`,
    destination: `${dest.lon},${dest.lat}`,
    priority: 'RECOMMEND',
    car_type: '1'
  });
  try {
    const res = await fetch(`${url}?${params.toString()}`, {
      headers: { 'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}`, 'Content-Type': 'application/json' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;
    return {
      time: Math.round(route.summary.duration / 60),
      cost: route.summary.fare?.taxi || route.summary.fare?.toll + 5000,
      distance: route.summary.distance
    };
  } catch (e) {
    console.error('Kakao Mobility Request Failed:', e);
    return null;
  }
}

// Server-side ODSay Helper (Proxies request to hide Referer/Key)
async function fetchODSay(startLat: number, startLon: number, endLat: number, endLon: number, referer: string) {
  const url = new URL('https://api.odsay.com/v1/api/searchPubTransPathT');
  url.searchParams.append('apiKey', ODSAY_KEY);
  url.searchParams.append('SX', startLon.toString());
  url.searchParams.append('SY', startLat.toString());
  url.searchParams.append('EX', endLon.toString());
  url.searchParams.append('EY', endLat.toString());

  try {
    const res = await fetch(url.toString(), {
      headers: { 'Referer': referer }
    });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function POST(req: Request) {
  const { origin, destination, startLat, startLon, endLat, endLon } = await req.json();

  if (!startLat || !startLon || !endLat || !endLon) {
    return NextResponse.json({ error: 'Coordinates missing' }, { status: 400 });
  }

  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = req.headers.get('x-forwarded-proto') || 'http';
  const currentReferer = `${protocol}://${host}`;

  const [taxiEst, transitData] = await Promise.all([
    getKakaoTaxiEstimate({ lat: startLat, lon: startLon }, { lat: endLat, lon: endLon }),
    fetchODSay(startLat, startLon, endLat, endLon, currentReferer)
  ]);

  return NextResponse.json({
    start: { lat: startLat, lon: startLon },
    end: { lat: endLat, lon: endLon },
    taxiEstimate: taxiEst,
    transitData: transitData
  });
}
