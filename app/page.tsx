'use client';

import { useState, useEffect } from 'react';
import { MapPin, Navigation, Loader2, Crosshair } from 'lucide-react';
import { getRecommendation, mockReverseGeocode, Recommendation } from '../lib/mockData';
import ComparisonCard from '../components/ComparisonCard';
import BottomNav from '../components/BottomNav';
import ThemeToggle from '../components/ThemeToggle';

// 간단한 로컬스토리지 훅 (컴포넌트 내부에 배치하여 파일 복잡도 감소)
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const item = window.localStorage.getItem(key);
      if (item) setStoredValue(JSON.parse(item));
    } catch (error) {
      console.log(error);
    }
  }, [key]);

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.log(error);
    }
  };
  return [storedValue, setValue] as const;
}

interface HistoryItem {
  id: number;
  origin: string;
  destination: string;
  date: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'mypage'>('home');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Recommendation | null>(null);
  const [history, setHistory] = useLocalStorage<HistoryItem[]>('waitstop-history', []);

  // 현재 위치 가져오기 (가상)
  const handleCurrentLocation = () => {
    if ('geolocation' in navigator) {
      // 로딩 표시 등을 추가하면 더 좋음
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const address = mockReverseGeocode(latitude, longitude);
          setOrigin(address);
        },
        () => {
          // 에러 시에도 가상 주소 입력
          setOrigin(mockReverseGeocode(37.5, 127.0));
        }
      );
    } else {
      setOrigin(mockReverseGeocode(37.5, 127.0));
    }
  };

  const handleAnalyze = () => {
    if (!destination) {
      alert('목적지를 입력해주세요!');
      return;
    }

    setIsLoading(true); // 로딩 시작

    setTimeout(() => {
      // 다크모드 여부 확인 (HTML 태그의 class 확인)
      const isDarkMode = document.documentElement.classList.contains('dark');
      const scenario = isDarkMode ? 'night' : 'day';

      const newRecommendation = getRecommendation(scenario);
      setResult(newRecommendation);
      setIsLoading(false); // 로딩 끝

      // 히스토리 저장
      const newHistoryItem: HistoryItem = {
        id: Date.now(),
        origin: origin || '내 위치', // 출발지 없으면 내 위치로 가정
        destination: destination,
        date: new Date().toLocaleDateString(),
      };
      setHistory([newHistoryItem, ...history].slice(0, 10)); // 최근 10개만 유지

    }, 1500);
  };

  // 렌더링: 홈 탭
  const renderHome = () => (
    <div className="flex flex-col h-full min-h-[calc(100vh-64px)] overflow-y-auto pb-20 no-scrollbar">
      {/* Header */}
      <header className="px-6 py-6 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-20">
        <div>
          <h1 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">
            WaitStop.
          </h1>
        </div>
        <ThemeToggle />
      </header>

      <div className="px-6 flex-1">

        {/* Input Section */}
        <section className="space-y-3 mt-4 mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <MapPin className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="출발지 (비워두면 내 위치)"
              className="w-full pl-10 pr-12 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            />
            <button
              onClick={handleCurrentLocation}
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
              aria-label="Use current location"
            >
              <Crosshair className="h-5 w-5" />
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <MapPin className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="어디로 가시나요?"
              className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none font-medium"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:active:scale-100"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>최적 경로 찾는 중...</span>
              </>
            ) : (
              <>
                <Navigation className="h-5 w-5" />
                <span>경로 분석하기</span>
              </>
            )}
          </button>
        </section>

        {/* Results Section */}
        {result && (
          <section className="animate-fade-in-up space-y-5 pb-10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {result.scenario === 'day' ? '☀️ 추천 경로 (Day)' : '🌙 심야 솔루션 (Night)'}
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                강남역 도착 기준
              </span>
            </div>

            <div className="grid gap-4">
              {result.options.map((option, idx) => (
                <ComparisonCard key={idx} option={option} />
              ))}
            </div>

            <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4">
              * 카드를 클릭하면 상세 이동 경로를 볼 수 있어요.
            </p>
          </section>
        )}
      </div>
    </div>
  );

  // 렌더링: 히스토리 탭
  const renderHistory = () => (
    <div className="flex flex-col h-full p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">검색 기록</h2>
      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
          <p>아직 검색 기록이 없어요.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {history.map((item) => (
            <li key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <span>{item.origin}</span>
                  <span>→</span>
                </div>
                <p className="font-bold text-gray-800 dark:text-gray-200">{item.destination}</p>
              </div>
              <span className="text-xs text-gray-400">{item.date}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  // 렌더링: 마이페이지
  const renderMyPage = () => (
    <div className="flex flex-col h-full p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">내 정보</h2>

      <div className="bg-indigo-50 dark:bg-indigo-900/30 p-6 rounded-2xl mb-6 flex items-center gap-4">
        <div className="w-16 h-16 bg-indigo-200 dark:bg-indigo-700 rounded-full flex items-center justify-center text-2xl">
          🧑‍💻
        </div>
        <div>
          <p className="font-bold text-lg text-gray-900 dark:text-white">코딩 초보자</p>
          <p className="text-sm text-indigo-600 dark:text-indigo-400">WaitStop 입문 레벨</p>
        </div>
      </div>

      <div className="space-y-2">
        <button className="w-full text-left p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors">
          공지사항
        </button>
        <button className="w-full text-left p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors">
          자주 묻는 질문
        </button>
        <button className="w-full text-left p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors">
          설정
        </button>
      </div>
    </div>
  );

  return (
    <main className="h-full bg-white dark:bg-gray-900 transition-colors duration-300">
      {activeTab === 'home' && renderHome()}
      {activeTab === 'history' && renderHistory()}
      {activeTab === 'mypage' && renderMyPage()}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </main>
  );
}
