import { Recommendation, RouteOption, TransportStep } from './mockData';

const TMAP_APPKEY = process.env.NEXT_PUBLIC_TMAP_API_KEY || '';

export interface FetchRoutesParams {
    origin: string;
    destination: string;
    scenario: 'day' | 'night';
}

async function tmapFetch(endpoint: string, params: Record<string, any>, method: 'GET' | 'POST' = 'GET', body?: any) {
    const url = new URL(endpoint);

    if (method === 'GET') {
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }

    const options: RequestInit = {
        method,
        headers: {
            'appKey': TMAP_APPKEY,
            'Accept': 'application/json',
            ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {})
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    // For POST, params might be needed in URL too? TMAP usually uses body for complex reqs.
    // But let's stick to simple logic.

    const response = await fetch(url.toString(), options);

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`TMAP API Error: ${response.status} ${text}`);
    }
    return response.json();
}

// 1. POI Search
export async function getCoordinates(keyword: string): Promise<{ lat: string, lon: string, name: string } | null> {
    try {
        const data = await tmapFetch('https://apis.openapi.sk.com/tmap/pois', {
            version: '1',
            searchKeyword: keyword,
            count: 1
        });
        const poi = data.searchPoiInfo?.pois?.poi?.[0];
        if (poi) {
            return { lat: poi.noorLat, lon: poi.noorLon, name: poi.name };
        }
        return null;
    } catch (e) {
        console.error("POI Search Failed:", e);
        return null; // Handle gracefully
    }
}

// 2. Reverse Geocoding
export async function getReverseGeo(lat: number, lng: number): Promise<string> {
    try {
        const data = await tmapFetch('https://apis.openapi.sk.com/tmap/geo/reversegeocoding', {
            version: '1',
            lat: lat,
            lon: lng,
            coordType: "WGS84GEO",
            addressType: "A10"
        });
        return data.addressInfo?.fullAddress || "Unknown Location";
    } catch (e) {
        console.error("RevGeo Failed:", e);
        return "Current Location";
    }
}

// 3. Route API (Taxi)
async function getTaxiRoute(startLat: string, startLon: string, endLat: string, endLon: string) {
    // TMAP Routes v1 Doc: https://apis.openapi.sk.com/tmap/routes?version=1
    // POST is recommended for long paths but GET is easier for simple start/end.
    // Let's use POST to be safe with body.

    /* 
    Body:
    {
      "startX": "...",
      "startY": "...",
      "endX": "...",
      "endY": "...",
      "totalValue": 2 // Request Taxi Fare
    }
    */
    const body = {
        startX: startLon,
        startY: startLat,
        endX: endLon,
        endY: endLat,
        totalValue: 2
    };

    return await tmapFetch('https://apis.openapi.sk.com/tmap/routes?version=1&callback=function', {}, 'POST', body);
}

// 4. Transit API
async function getTransitRoute(startLat: string, startLon: string, endLat: string, endLon: string) {
    const body = {
        startX: startLon,
        startY: startLat,
        endX: endLon,
        endY: endLat,
        count: 5,
        lang: 0,
        format: "json"
    };
    return await tmapFetch('https://apis.openapi.sk.com/transit/routes', {}, 'POST', body);
}


export async function fetchRoutes({ origin, destination, scenario }: FetchRoutesParams): Promise<Recommendation> {
    console.log(`[API] Fetching real routes from ${origin} to ${destination}`);

    // 1. Resolve Coordinates
    // Assume origin/dest are keywords.
    const startPoint = await getCoordinates(origin);
    const endPoint = await getCoordinates(destination);

    if (!startPoint || !endPoint) {
        throw new Error("Cannot find location coordinates");
    }

    // 2. Fetch Data in Parallel
    const [taxiData, transitData] = await Promise.allSettled([
        getTaxiRoute(startPoint.lat, startPoint.lon, endPoint.lat, endPoint.lon),
        getTransitRoute(startPoint.lat, startPoint.lon, endPoint.lat, endPoint.lon)
    ]);

    const options: RouteOption[] = [];

    // Process Taxi Data
    if (taxiData.status === 'fulfilled') {
        const props = taxiData.value.features?.[0]?.properties;
        if (props) {
            options.push({
                type: 'taxi', // Using 'taxi' type for pure taxi
                label: '택시 (Taxi)',
                duration: Math.round(props.totalTime / 60),
                cost: props.taxiFare || props.totalFare || 0,
                transportation: ['택시'],
                steps: [{ type: 'taxi', description: '택시 이동', duration: Math.round(props.totalTime / 60), cost: props.taxiFare }]
            });
        }
    }

    // Process Transit Data
    if (transitData.status === 'fulfilled') {
        const itineraries = transitData.value.metaData?.plan?.itineraries;
        if (itineraries && itineraries.length > 0) {
            const bestItinerary = itineraries[0];
            const steps: TransportStep[] = bestItinerary.legs.map((leg: any) => {
                let type: 'walk' | 'bus' | 'subway' = 'walk';
                if (leg.mode === 'BUS') type = 'bus';
                if (leg.mode === 'SUBWAY') type = 'subway';

                return {
                    type,
                    description: leg.route || leg.mode, // Simplified
                    duration: Math.round(leg.sectionTime / 60)
                };
            });

            options.push({
                type: 'patience', // Mapping to 'patience' or 'smart' depending on logic
                label: '대중교통 (Transit)',
                duration: Math.round(bestItinerary.totalTime / 60),
                cost: bestItinerary.fare.regular.totalFare,
                transportation: ['대중교통'],
                steps: steps
            });
        }
    }

    // If we only have taxi or transit, maybe add fallback or just return what we have?
    // The UI expects options.

    return {
        scenario,
        options: options
    };
}
