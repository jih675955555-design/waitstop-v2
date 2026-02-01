export interface TransportStep {
    type: 'walk' | 'bus' | 'subway' | 'taxi' | 'nightbus';
    description: string;
    duration: number;
    cost?: number;
}

export interface RouteOption {
    type: 'saver' | 'smart' | 'vip' | 'taxi' | 'patience' | 'hybrid'; // Extended types to support legacy and new
    label: string;
    duration: number;
    cost: number;
    transportation: string[];
    highlight?: string;
    tag?: string;      // New: e.g. "Wallet Saver"
    badge?: string;    // New: e.g. "Save 10 mins"
    description?: string; // New: Summary text
    details?: string;     // New: Detail text
    steps?: TransportStep[];
}

export interface Recommendation {
    scenario: 'day' | 'night';
    options: RouteOption[];
}
