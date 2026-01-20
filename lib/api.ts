import { getRecommendation, Recommendation } from './mockData';

// 실제 API 연동 시 사용할 키 (현재는 코드상에서 사용하지 않지만 구조만 잡아둠)
const API_KEY = process.env.NEXT_PUBLIC_WAITSTOP_API_KEY;

export interface FetchRoutesParams {
    origin: string;
    destination: string;
    scenario: 'day' | 'night';
}

/**
 * 경로 데이터를 가져오는 API 함수
 * 현재는 mockData를 사용하여 지연 시간(simulated latency) 후 결과를 반환합니다.
 */
export async function fetchRoutes({ origin, destination, scenario }: FetchRoutesParams): Promise<Recommendation> {
    // 실제 API 호출 로직이 들어갈 자리
    // const response = await fetch(`https://api.waitstop.com/routes?origin=${origin}&dest=${destination}&key=${API_KEY}`);
    // return response.json();

    console.log(`[API] Fetching routes from ${origin} to ${destination} (${scenario})`);

    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(getRecommendation(scenario));
        }, 1500); // 1.5초 로딩 시뮬레이션
    });
}
