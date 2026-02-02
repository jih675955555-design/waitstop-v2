export interface RouteStep {
    type: 'WALK' | 'BUS' | 'SUBWAY' | 'TAXI';
    name: string; // e.g. "2호선", "강남역", "택시로 이동"
    desc?: string; // e.g. "3개 역 이동", "약 10분 소요"
    cost?: number; // 구간별 예상 비용
    time?: number; // 소요 시간(분)
    isTransferHub?: boolean; // Smart 옵션의 하이라이트 지점 여부
}

export interface RouteOption {
    type: 'saver' | 'smart' | 'vip' | 'taxi' | 'patience' | 'hybrid';
    label: string;
    duration: number;
    cost: number;
    transportation: string[];
    highlight?: string;
    tag?: string;
    badge?: string;
    description?: string;
    details?: string;
    steps?: RouteStep[]; // New Field
}

export interface Recommendation {
    scenario: 'day' | 'night';
    options: RouteOption[];
}
