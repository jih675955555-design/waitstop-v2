import { Recommendation, RouteOption, RouteStep } from './mockData';

export interface FetchRoutesParams {
    origin: string;
    destination: string;
    startLat?: number;
    startLon?: number;
    endLat?: number;
    endLon?: number;
    scenario: 'day' | 'night';
}

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

    const parseSteps = (subPaths: any[], totalRefFare: number): RouteStep[] => {
        let fareAssigned = false;
        return subPaths.map((p: any) => {
            let type: 'WALK' | 'BUS' | 'SUBWAY' | 'TAXI' = 'WALK';
            let name = p.sectionTime + '분 걷기';
            let desc = '도보 이동';
            let stepCost = 0;

            if (p.trafficType === 1) { // Subway
                type = 'SUBWAY';
                name = `${p.lane[0].name} (${p.startName}역)`;
                desc = `${p.stationCount}개 역 이동`;
            } else if (p.trafficType === 2) { // Bus
                type = 'BUS';
                name = `${p.lane[0].busNo}번 버스`;
                desc = `${p.stationCount}개 정류장 이동`;
            }

            if ((type === 'SUBWAY' || type === 'BUS') && !fareAssigned) {
                stepCost = totalRefFare;
                fareAssigned = true;
            }

            return {
                type,
                name,
                desc,
                time: p.sectionTime,
                cost: stepCost
            };
        });
    };

    saverOption = {
        type: 'saver',
        label: 'Saver',
        duration: totalTime,
        cost: totalPayment,
        transportation: [],
        tag: '지갑 수호자',
        description: '최저가 이동',
        details: `환승 ${transferCount}회`,
        steps: parseSteps(bestPath.subPath, totalPayment)
    };

    try {
        for (const path of paths.slice(0, 5)) {
            const subwaySegments = path.subPath.filter((p: any) => p.trafficType === 1 || p.trafficType === 2);
            const lastSubway = subwaySegments[subwaySegments.length - 1];

            if (!lastSubway || !taxiEstimate) continue;

            let timeBeforeMain = 0;
            for (const sub of path.subPath) {
                if (sub === lastSubway) break;
                timeBeforeMain += sub.sectionTime;
            }

            if (timeBeforeMain < 10) continue;

            const estimatedTaxiJumpTime = Math.round(timeBeforeMain * 0.5) + 3;
            const jumpTaxiCost = Math.round(taxiEstimate.cost * (timeBeforeMain / totalTime)) + 3000;

            const smartSteps: RouteStep[] = [];
            smartSteps.push({
                type: 'TAXI',
                name: '택시로 점프',
                desc: '버스/도보 구간 단축',
                time: estimatedTaxiJumpTime,
                cost: jumpTaxiCost,
                isTransferHub: false
            });

            const lastSubwayIdx = path.subPath.indexOf(lastSubway);
            const remainingSubPaths = path.subPath.slice(lastSubwayIdx);
            const smartTransitCost = path.info.payment;

            const transitSteps = parseSteps(remainingSubPaths, smartTransitCost);
            if (transitSteps.length > 0) {
                transitSteps[0].isTransferHub = true;
                transitSteps[0].desc = "여기서 택시를 내려 갈아타세요";
                transitSteps[0].name = `${remainingSubPaths[0].startName || '환승역'} (환승)`;
            }
            smartSteps.push(...transitSteps);

            const smartTotalTime = estimatedTaxiJumpTime + remainingSubPaths.reduce((acc: number, cur: any) => acc + cur.sectionTime, 0);
            const smartTotalCost = jumpTaxiCost + smartTransitCost;
            const timeSaved = totalTime - smartTotalTime;

            smartOption = {
                type: 'smart',
                label: 'Smart',
                duration: smartTotalTime,
                cost: smartTotalCost,
                transportation: [],
                tag: '가성비 전술가',
                description: `환승 ${Math.max(0, path.info.busTransitCount + path.info.subwayTransitCount - 1)}회 생략`,
                details: `택시(${estimatedTaxiJumpTime}분) + ${lastSubway.lane?.[0]?.name || '지하철'}`,
                badge: timeSaved > 0 ? `${timeSaved}분 단축` : undefined,
                steps: smartSteps
            };
            break;
        }
    } catch (e) {
        console.error('Smart option build failed:', e);
    }

    return { saver: saverOption, smart: smartOption };
}

export async function fetchRoutes({ origin, destination, startLat, startLon, endLat, endLon, scenario }: FetchRoutesParams): Promise<Recommendation> {
    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ origin, destination, startLat, startLon, endLat, endLon }),
        });

        if (!response.ok) throw new Error('Network response was not ok');
        const { taxiEstimate, transitData } = await response.json();

        const options: RouteOption[] = [];
        const { saver, smart } = buildTransitOptions(transitData, taxiEstimate);

        if (saver) options.push(saver);
        if (smart) options.push(smart);

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
                steps: [{
                    type: 'TAXI',
                    name: '택시 탑승',
                    desc: '목적지까지 논스톱 이동',
                    time: taxiEstimate.time,
                    cost: taxiEstimate.cost
                }]
            });
        }

        if (options.length === 0) throw new Error('No route options available');

        return { scenario, options };
    } catch (error) {
        console.error("Fetch Routes Error:", error);
        throw error;
    }
}

// Deprecated: Handled by client-side Kakao SDK
export async function getReverseGeo(lat: number, lng: number): Promise<string> {
    return "Kakao Maps Handling";
}