export type RouteType = 'patience' | 'smart' | 'hybrid' | 'taxi';

export interface TransportStep {
    type: 'walk' | 'bus' | 'subway' | 'taxi' | 'nightbus';
    description: string;
    duration: number; // minutes
    cost?: number;
}

export interface RouteOption {
    type: RouteType;
    label: string;
    duration: number; // minutes
    cost: number; // KRW
    transportation: string[];
    steps: TransportStep[]; // 상세 경로 추가
    highlight?: string;
}

export interface Recommendation {
    scenario: 'day' | 'night';
    options: RouteOption[];
}

export const mockReverseGeocode = (lat: number, lng: number): string => {
    // 가짜 주소 반환
    return "서울특별시 강남구 테헤란로 427";
};

export const getRecommendation = (scenario: 'day' | 'night'): Recommendation => {
    if (scenario === 'day') {
        return {
            scenario: 'day',
            options: [
                {
                    type: 'patience',
                    label: '인내형 경로 (대중교통)',
                    duration: 45,
                    cost: 1500,
                    transportation: ['버스', '지하철'],
                    steps: [
                        { type: 'walk', description: '정류장까지 걷기', duration: 5 },
                        { type: 'bus', description: '146번 버스 탑승', duration: 15 },
                        { type: 'walk', description: '강남역으로 환승 이동', duration: 5 },
                        { type: 'subway', description: '2호선 강남역 탑승', duration: 20 },
                    ],
                },
                {
                    type: 'smart',
                    label: '실속형 경로 (택시+지하철)',
                    duration: 27,
                    cost: 6500,
                    transportation: ['택시', '지하철'],
                    highlight: '5,000원으로 18분을 샀어요!',
                    steps: [
                        { type: 'taxi', description: '카카오T 택시 호출 (기본요금 거리)', duration: 7, cost: 5000 },
                        { type: 'subway', description: '2호선 역삼역에서 지하철 환승', duration: 20, cost: 1500 },
                    ],
                },
            ],
        };
    } else {
        // 밤 모드 로직 (엄격한 심야 버스 판정)
        return {
            scenario: 'night',
            options: [
                {
                    type: 'taxi',
                    label: '전구간 택시',
                    duration: 40,
                    cost: 28000,
                    transportation: ['택시'],
                    steps: [
                        { type: 'taxi', description: '목적지까지 직통 택시 이동', duration: 40, cost: 28000 },
                    ]
                },
                {
                    type: 'hybrid',
                    label: '하이브리드 (택시+심야버스)',
                    duration: 60,
                    cost: 12000,
                    transportation: ['택시', '심야버스', '택시'],
                    highlight: '16,000원을 아꼈어요!',
                    steps: [
                        { type: 'taxi', description: '심야버스 거점(종로)까지 택시 이동', duration: 15, cost: 8000 },
                        { type: 'nightbus', description: 'N26 심야버스 탑승', duration: 35, cost: 2500 },
                        { type: 'taxi', description: '집 근처 역에서 기본요금 택시', duration: 10, cost: 4800 }, // 할증 감안
                    ],
                },
            ],
        };
    }
};
