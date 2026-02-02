import { Recommendation, RouteOption } from './mockData';

export interface FetchRoutesParams {
    origin: string;
    destination: string;
    scenario: 'day' | 'night';
}

// ODSay API Key (클라이언트용)
const ODSAY_KEY = process.env.NEXT_PUBLIC_ODSAY_API_KEY || '';

// 1. ODSay 대중교통 검색 (클라이언트에서 직접 호출)
async function fetchODSayTransit(startLat: string, startLon: string, endLat: string, endLon: string) {
    const url = new URL('https://api.odsay.com/v1/api/searchPubTransPathT');
    url.searchParams.append('apiKey', ODSAY_KEY);
    url.searchParams.append('SX', startLon);
    url.searchParams.append('SY', startLat);
    url.searchParams.append('EX', endLon);
    url.searchParams.append('EY', endLat);

    const res = await fetch(url.toString());
    if (!res.ok) {
        console.error('ODSay API Error:', res.status);
        return null;
    }
    return res.json();
}

// 2. 대중교통 데이터 -> Saver/Smart 옵션 생성
function buildTransitOptions(transitData: any, taxiEstimate: any): { saver: RouteOption | null, smart: RouteOption | null } {
    let saverOption: RouteOption | null = null;
    let smartOption: RouteOption | null = null;

    const paths = transitData?.result?.path;
    if (!paths || paths.length === 0) {
        return { saver: null, smart: null };
    }

    const bestPath = paths[0];
    const totalTime = bestPath.info.totalTime;
    const totalPayment = bestPath.info.payment;
    const transferCount = bestPath.info.busTransitCount + bestPath.info.subwayTransitCount;

    // --- Helper to parse SubPath into Steps ---
    const parseSteps = (subPaths: any[]): any[] => {
        return subPaths.map(p => {
            let type = 'WALK';
            let name = p.sectionTime + '분 걷기';
            let desc = '도보 이동';

            if (p.trafficType === 1) { // Subway
                type = 'SUBWAY';
                name = `${p.lane[0].name} (${p.startName}역)`;
                desc = `${p.stationCount}개 역 이동`;
            } else if (p.trafficType === 2) { // Bus
                type = 'BUS';
                name = `${p.lane[0].busNo}번 버스`;
                desc = `${p.stationCount}개 정류장 이동`;
            }

            return {
                type,
                name,
                desc,
                time: p.sectionTime,
                cost: p.sectionTime * 50 // Dummy incremental cost visualization? Or omit
            };
        });
    };

    // Saver 옵션
    saverOption = {
        type: 'saver',
        label: 'Saver',
        duration: totalTime,
        cost: totalPayment,
        transportation: [],
        tag: '지갑 수호자',
        description: '최저가 이동',
        details: `환승 ${transferCount}회`,
        steps: parseSteps(bestPath.subPath)
    };

    // Smart 옵션 (환승 점프 로직)
    try {
        const subwaySegments = bestPath.subPath.filter((p: any) => p.trafficType === 1 || p.trafficType === 2);
        const lastSubway = subwaySegments[subwaySegments.length - 1];

        if (lastSubway && taxiEstimate) {
            // 마지막 지하철역까지의 시간 계산
            let timeBeforeMain = 0;
            const smartSteps: any[] = [];

            // 1. Taxi Leg (Start -> Hub)
            const jumpTaxiTime = Math.round(taxiEstimate.time * 0.4);
            const jumpTaxiCost = Math.round(taxiEstimate.cost * 0.4);

            smartSteps.push({
                type: 'TAXI',
                name: '택시로 점프',
                desc: '교통 체증 구간 돌파',
                time: jumpTaxiTime,
                cost: jumpTaxiCost,
                isTransferHub: false
            });

            // 2. Transfer Hub (Highlight)
            // Add a virtual step or mark the next step?
            // Let's mark the start of the Subway leg as the Hub interaction.

            const remainingTransitTime = totalTime - timeBeforeMain;
            // Note: timeBeforeMain calculation needs to match the skipping logic below.

            // Logic: Skip all steps BEFORE the lastSubway.
            // Then add lastSubway step.

            // Find the subPath index of lastSubway
            const lastSubwayIdx = bestPath.subPath.indexOf(lastSubway);
            // Steps from lastSubway onwards
            const remainingSubPaths = bestPath.subPath.slice(lastSubwayIdx);

            // Convert remaining subpaths to steps
            const transitSteps = parseSteps(remainingSubPaths);

            // Mark the first transit step (which is the subway) as the HUB
            if (transitSteps.length > 0) {
                transitSteps[0].isTransferHub = true;
                transitSteps[0].desc = "여기서 환승하세요! (택시 하차)";
            }

            smartSteps.push(...transitSteps);

            const smartTotalTime = jumpTaxiTime + remainingSubPaths.reduce((acc: number, cur: any) => acc + cur.sectionTime, 0);
            const smartTransitCost = 1500;
            const timeSaved = totalTime - smartTotalTime;

            smartOption = {
                type: 'smart',
                label: 'Smart',
                duration: smartTotalTime,
                cost: jumpTaxiCost + smartTransitCost,
                transportation: [],
                tag: '가성비 전술가',
                description: `환승 ${Math.max(0, transferCount - 1)}회 생략`,
                details: `택시(${jumpTaxiTime}분) + ${lastSubway.lane?.[0]?.name || '지하철'}`,
                badge: timeSaved > 0 ? `${timeSaved}분 단축` : undefined,
                steps: smartSteps
            };
        }
    } catch (e) {
        console.error('Smart option build failed:', e);
    }

    return { saver: saverOption, smart: smartOption };
}

export async function fetchRoutes({ origin, destination, scenario }: FetchRoutesParams): Promise<Recommendation> {
    try {
        // 1단계: 서버에서 좌표 + 택시 정보 가져오기
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

        const serverData = await response.json();

        // 좌표 정보 추출
        const { start, end, taxiEstimate } = serverData;

        // 2단계: 클라이언트에서 ODSay 직접 호출
        const transitData = await fetchODSayTransit(
            start.lat, start.lon,
            end.lat, end.lon
        );

        console.log('[Client] ODSay Response:', transitData?.result ? 'Success' : 'Failed');

        // 3단계: 옵션들 생성
        const options: RouteOption[] = [];

        // Saver & Smart 옵션 (대중교통 기반)
        const { saver, smart } = buildTransitOptions(transitData, taxiEstimate);
        if (saver) options.push(saver);
        if (smart) options.push(smart);

        // VIP 옵션 (택시)
        if (taxiEstimate) {
            options.push({
                type: 'vip',
                label: 'VIP',
                duration: taxiEstimate.time,
                cost: taxiEstimate.cost,
                transportation: [],
                tag: '리치 모드',
                description: '프라이빗하고 편안한 이동',
                details: `택시 이동 약 ${taxiEstimate.time}분`,
                steps: [
                    {
                        type: 'TAXI',
                        name: '택시 탑승',
                        desc: '목적지까지 논스톱 이동',
                        time: taxiEstimate.time,
                        cost: taxiEstimate.cost
                    }
                ]
            });
        }

        // 옵션이 없으면 에러
        if (options.length === 0) {
            throw new Error('No route options available');
        }

        return {
            scenario,
            options
        };
    } catch (error) {
        console.error("Fetch Routes Error:", error);
        throw error;
    }
}

export async function getReverseGeo(lat: number, lng: number): Promise<string> {
    try {
        const TMAP_APPKEY = process.env.NEXT_PUBLIC_WAITSTOP_API_KEY || '';
        const res = await fetch(`https://apis.openapi.sk.com/tmap/geo/reversegeocoding?version=1&lat=${lat}&lon=${lng}&coordType=WGS84GEO&addressType=A10&appKey=${TMAP_APPKEY}`);
        const data = await res.json();
        return data.addressInfo?.fullAddress || "Unknown Location";
    } catch (e) {
        return "Current Location";
    }
}