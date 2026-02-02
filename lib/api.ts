import { Recommendation, RouteOption } from './mockData';

export interface FetchRoutesParams {
    origin: string;
    destination: string;
    startLat?: number;
    startLon?: number;
    endLat?: number;
    endLon?: number;
    scenario: 'day' | 'night';
}

// ODSay API Key (클라이언트용)
const ODSAY_KEY = process.env.NEXT_PUBLIC_ODSAY_API_KEY || '';

// 1. ODSay 대중교통 검색 (클라이언트에서 직접 호출)
async function fetchODSayTransit(startLat: string, startLon: string, endLat: string, endLon: string) {
    // ... imports
    // (Make sure RouteOption etc are imported)

    // 2. 대중교통 데이터 -> Saver/Smart 옵션 생성
    function buildTransitOptions(transitData: any, taxiEstimate: any): { saver: RouteOption | null, smart: RouteOption | null } {
        // ... (Keep existing logic - it works with generic ODSay structure)
        // We just need to ensure `taxiEstimate` has { time, cost } which our new API provides.

        // Copy the logic from previous step 417 exactly or rely on existing? 
        // Since I am replacing the file content, I must include the function body. 
        // I will include the logic from Step 417/393.

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

        // Helper to parse Steps (from Step 393/417)
        const parseSteps = (subPaths: any[], totalRefFare: number): any[] => {
            let fareAssigned = false;
            return subPaths.map(p => {
                let type = 'WALK';
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

        // Saver
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

        // Smart (Scanning Logic from Step 417)
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

                const smartSteps: any[] = [];
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

    // Legacy Reverse Geo removed (Handled by Client Kakao SDK)
    export async function getReverseGeo(lat: number, lng: number): Promise<string> {
        return "Kakao Maps Handling";
    }

    // 2. 대중교통 데이터 -> Saver/Smart 옵션 생성
    function buildTransitOptions(transitData: any, taxiEstimate: any): { saver: RouteOption | null, smart: RouteOption | null } {
        let saverOption: RouteOption | null = null;
        let smartOption: RouteOption | null = null;

        const paths = transitData?.result?.path;
        if (!paths || paths.length === 0) {
            console.warn('No transit paths found');
            return { saver: null, smart: null };
        }

        const bestPath = paths[0];
        const totalTime = bestPath.info.totalTime;
        const totalPayment = bestPath.info.payment;
        const transferCount = bestPath.info.busTransitCount + bestPath.info.subwayTransitCount;

        // --- Helper to parse SubPath into Steps ---
        const parseSteps = (subPaths: any[], totalRefFare: number): any[] => {
            let fareAssigned = false;

            return subPaths.map(p => {
                let type = 'WALK';
                let name = p.sectionTime + '분 걷기';
                let desc = '도보 이동';
                let stepCost = 0; // Default 0 for WALK

                if (p.trafficType === 1) { // Subway
                    type = 'SUBWAY';
                    name = `${p.lane[0].name} (${p.startName}역)`;
                    desc = `${p.stationCount}개 역 이동`;
                } else if (p.trafficType === 2) { // Bus
                    type = 'BUS';
                    name = `${p.lane[0].busNo}번 버스`;
                    desc = `${p.stationCount}개 정류장 이동`;
                }

                // Assign Total Fare to the FIRST Transit Step (Bus/Subway)
                // Treat transfers as 0 (Free Transfer system)
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
            steps: parseSteps(bestPath.subPath, totalPayment)
        };

        // Smart 옵션 (환승 점프 로직) - Scan top 5 paths for a valid "Jump"
        try {
            // Iterate through paths to find one where Taxi can replace a significant "Pre-Subway" leg
            for (const path of paths.slice(0, 5)) {
                const subwaySegments = path.subPath.filter((p: any) => p.trafficType === 1 || p.trafficType === 2);
                const lastSubway = subwaySegments[subwaySegments.length - 1];

                if (!lastSubway || !taxiEstimate) continue;

                // Calculate time spent BEFORE the main subway leg
                let timeBeforeMain = 0;
                for (const sub of path.subPath) {
                    if (sub === lastSubway) break;
                    timeBeforeMain += sub.sectionTime;
                }

                // FILTER: If the "Jumpable" time is trivial (e.g., < 10 mins), it's just a walk or direct start.
                // This prevents "Taxi to Hongik Stn" when starting at Hongik.
                if (timeBeforeMain < 10) continue;

                // Valid Candidate Found! Calculate Smart Stats
                const jumpTaxiTime = Math.round(taxiEstimate.time * 0.4); // Rough estimate: Taxi is 40% of total direct taxi time? 
                // Better: We should ideally estimate Taxi(Origin -> Hub). 
                // For now, heuristic: Taxi is faster than the Pre-Main transit legs.
                // Let's assume Taxi takes 50% of the time of the transit legs it replaces? 
                // Or use the heuristic: "Taxi to Hub" distance is approximated.

                // Refined Heuristic:
                // The "Jump" replaces `timeBeforeMain`. 
                // Taxi usually takes 30-50% of Bus/Walk time for the same distance.
                const estimatedTaxiJumpTime = Math.round(timeBeforeMain * 0.5) + 3; // +3 min buffer
                const jumpTaxiCost = Math.round(taxiEstimate.cost * (timeBeforeMain / totalTime)) + 3000; // Base fare + portion

                // Build Smart Option
                const smartSteps: any[] = [];

                smartSteps.push({
                    type: 'TAXI',
                    name: '택시로 점프',
                    desc: '버스/도보 구간 단축',
                    time: estimatedTaxiJumpTime,
                    cost: jumpTaxiCost,
                    isTransferHub: false
                });

                // Transfer Hub & Remaining Path
                const lastSubwayIdx = path.subPath.indexOf(lastSubway);
                const remainingSubPaths = path.subPath.slice(lastSubwayIdx);

                // Transit Cost (Estimated as total fare since we don't have partial)
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

                // Construct the option and break (we found our Smart Route)
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

                break; // Found a valid Smart option, stop looking.
            }
        } catch (e) {
            console.error('Smart option build failed:', e);
        }

        return { saver: saverOption, smart: smartOption };
    }

    async function fetchRoutes({ origin, destination, startLat, startLon, endLat, endLon, scenario }: FetchRoutesParams): Promise<Recommendation> {
        try {
            // 1단계: 서버에서 택시 정보(Kakao) + 최적경로 계산
            // 좌표가 있으면 좌표를 보내고, 없으면(예외) 텍스트를 보내지만, UI가 강제하므로 좌표는 있다고 가정
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    origin,
                    destination,
                    startLat,
                    startLon,
                    endLat,
                    endLon
                }),
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
                    details: `택시 이동 약 ${taxiEstimate.time}분`
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