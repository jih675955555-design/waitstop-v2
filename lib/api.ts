import { Recommendation, RouteOption } from './mockData';

export interface FetchRoutesParams {
    origin: string;
    destination: string;
    scenario: 'day' | 'night';
}

export async function fetchRoutes({ origin, destination, scenario }: FetchRoutesParams): Promise<Recommendation> {
    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ origin, destination }),
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        // Transform API response to UI model
        const options: RouteOption[] = data.options.map((opt: any) => ({
            type: opt.type.toLowerCase(), // 'saver', 'smart', 'vip'
            label: opt.title,
            duration: opt.time,
            cost: opt.cost,
            transportation: [], // Can be populated if needed
            tag: opt.tag,
            badge: opt.badge,
            description: opt.details // Mapping details to description for UI
        }));

        return {
            scenario,
            options: options
        };
    } catch (error) {
        console.error("Fetch Routes Error:", error);
        throw error;
    }
}

export async function getReverseGeo(lat: number, lng: number): Promise<string> {
    // Keep this client side for now or move to API if key exposure is blocked.
    // TMAP key is exposed in client env? The user setup seems to have it in NEXT_PUBLIC.
    // Safe to keep for standard usage if CORS allows, otherwise move to API.
    // For now, assuming basic usage works or will fail gracefully.
    try {
        const TMAP_APPKEY = process.env.NEXT_PUBLIC_WAITSTOP_API_KEY || '';
        const res = await fetch(`https://apis.openapi.sk.com/tmap/geo/reversegeocoding?version=1&lat=${lat}&lon=${lng}&coordType=WGS84GEO&addressType=A10&appKey=${TMAP_APPKEY}`);
        const data = await res.json();
        return data.addressInfo?.fullAddress || "Unknown Location";
    } catch (e) {
        return "Current Location";
    }
}
