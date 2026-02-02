'use client';

import { useState, useEffect } from 'react';
import { MapPin, Navigation, Loader2, Crosshair, Sun, Moon } from 'lucide-react';
import { Recommendation } from '../lib/mockData';
import { fetchRoutes, getReverseGeo } from '../lib/api';
import ComparisonCard from '../components/ComparisonCard';
import BottomNav from '../components/BottomNav';
import Toast from '../components/Toast';

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

declare global {
  interface Window {
    kakao: any;
  }
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'mypage'>('home');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  // Coordinates State (Kakao provides these directly)
  const [startPoint, setStartPoint] = useState<{ name: string, lat: number, lon: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ name: string, lat: number, lon: number } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Recommendation | null>(null);
  const [history, setHistory] = useLocalStorage<HistoryItem[]>('waitstop-history', []);
  const [isNight, setIsNight] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Suggestions State
  const [originSuggestions, setOriginSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [showOriginList, setShowOriginList] = useState(false);
  const [showDestList, setShowDestList] = useState(false);

  // Kakao Places Search
  const searchPlaces = (keyword: string, setSuggestions: (data: any[]) => void) => {
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) return;
    const ps = new window.kakao.maps.services.Places();

    ps.keywordSearch(keyword, (data: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK) {
        setSuggestions(data);
      } else {
        setSuggestions([]);
      }
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (origin.length > 1) {
        searchPlaces(origin, (data) => {
          setOriginSuggestions(data);
          setShowOriginList(true);
        });
      } else {
        setOriginSuggestions([]);
        setShowOriginList(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [origin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (destination.length > 1) {
        searchPlaces(destination, (data) => {
          setDestSuggestions(data);
          setShowDestList(true);
        });
      } else {
        setDestSuggestions([]);
        setShowDestList(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [destination]);

  const handleSelectPlace = (place: any, isOrigin: boolean) => {
    const point = {
      name: place.place_name,
      lat: parseFloat(place.y),
      lon: parseFloat(place.x)
    };
    if (isOrigin) {
      setOrigin(place.place_name);
      setStartPoint(point);
      setShowOriginList(false);
    } else {
      setDestination(place.place_name);
      setEndPoint(point);
      setShowDestList(false);
    }
  };


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isSystemDark = document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsNight(isSystemDark);
    }
  }, []);

  useEffect(() => {
    if (isNight) {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#000000';
      document.body.style.color = '#ffffff';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#171717';
    }
  }, [isNight]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation && window.kakao && window.kakao.maps) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        // Geocoder for address
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.coord2Address(lon, lat, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const address = result[0].address?.address_name || result[0].road_address?.address_name || '현위치';
            setOrigin(address);
            setStartPoint({ name: address, lat, lon });
          } else {
            triggerToast('현 위치 주소를 찾을 수 없습니다.');
          }
        });
      }, (error) => {
        console.error("Geolocation error:", error);
        triggerToast('위치 정보를 가져올 수 없습니다.');
      });
    } else {
      triggerToast('브라우저에서 위치 정보를 지원하지 않습니다.');
    }
  };

  const handleAnalyze = async () => { // Renamed from handleSearch to match original
    if (!startPoint || !endPoint) {
      triggerToast('출발지와 목적지를 리스트에서 선택해주세요.');
      return;
    }

    setIsLoading(true);
    setResult(null);

    const scenario = isNight ? 'night' : 'day';

    try {
      // Pass Lat/Lon directly
      const data = await fetchRoutes({
        origin: startPoint.name,      // Just for display logic if needed
        destination: endPoint.name,
        startLat: startPoint.lat,
        startLon: startPoint.lon,
        endLat: endPoint.lat,
        endLon: endPoint.lon,
        scenario: isNight ? 'night' : 'day'
      });
      setResult(data);

      const newHistoryItem: HistoryItem = {
        id: Date.now(),
        origin: startPoint.name,
        destination: endPoint.name,
        date: new Date().toLocaleDateString(),
      };
      setHistory([newHistoryItem, ...history].slice(0, 10));

    } catch (err) {
      console.error(err);
      triggerToast('경로를 찾을 수 없습니다.'); // Updated error message
    } finally {
      setIsLoading(false);
    }
  };

  const renderHome = () => (
    <div className={`flex flex-col h-full min-h-[calc(100vh-64px)] overflow-y-auto pb-20 no-scrollbar transition-colors duration-300 ${isNight ? 'bg-black' : 'bg-white'}`}>
      {/* Header with Direct Toggle Button */}
      <header className={`px-6 py-6 flex justify-between items-center sticky top-0 z-20 transition-colors duration-300 ${isNight ? 'bg-black' : 'bg-white'}`}>
        <div>
          <h1 className={`text-2xl font-black tracking-tighter ${isNight ? 'text-violet-400' : 'text-indigo-600'}`}>
            WaitStop.
          </h1>
        </div>
        <button
          onClick={() => setIsNight(!isNight)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
        >
          {isNight ? <Sun className="w-6 h-6 text-yellow-500" /> : <Moon className="w-6 h-6 text-indigo-600" />}
        </button>
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
              placeholder="출발지"
              className={`w-full pl-10 pr-12 py-3.5 rounded-xl border shadow-sm transition-all outline-none ${isNight
                ? 'border-gray-800 bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500'
                : 'border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500'
                }`}
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            />
            <button
              onClick={handleCurrentLocation}
              className={`absolute inset-y-0 right-3 flex items-center transition-colors p-2 ${isNight ? 'text-gray-400 hover:text-violet-400' : 'text-gray-400 hover:text-indigo-500'}`}
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
              className={`w-full pl-10 pr-4 py-3.5 rounded-xl border shadow-sm transition-all outline-none font-medium ${isNight
                ? 'border-gray-800 bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500'
                : 'border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500'
                }`}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className={`w-full min-h-[54px] text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:active:scale-100 ${isNight
              ? 'bg-violet-600 hover:bg-violet-700'
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
              }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>최적의 환승 점프 지점 분석 중...</span>
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
              <h2 className={`text-xl font-bold ${isNight ? 'text-gray-100' : 'text-gray-800'}`}>
                {result.scenario === 'day' ? '☀️ 추천 경로 (Day)' : '🌙 심야 솔루션 (Night)'}
              </h2>
              <span className={`text-xs px-2 py-1 rounded max-w-[120px] truncate ${isNight ? 'text-gray-300 bg-gray-800' : 'text-gray-500 bg-gray-100'}`}>
                {destination} 도착 기준
              </span>
            </div>

            <div className="grid gap-4">
              {result.options.map((option, idx) => (
                <ComparisonCard key={idx} option={option} />
              ))}
            </div>

            <p className={`text-center text-xs mt-4 ${isNight ? 'text-gray-600' : 'text-gray-400'}`}>
              * 카드를 클릭하면 상세 이동 경로를 볼 수 있어요.
            </p>
          </section>
        )}
      </div>

      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );

  const renderHistory = () => (
    <div className={`flex flex-col h-full min-h-[calc(100vh-64px)] overflow-y-auto pb-20 p-6 transition-colors duration-300 ${isNight ? 'bg-black' : 'bg-white'}`}>
      <h2 className={`text-2xl font-bold mb-6 ${isNight ? 'text-white' : 'text-gray-900'}`}>검색 기록</h2>
      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
          <p>아직 검색 기록이 없어요.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {history.map((item) => (
            <li key={item.id} className={`p-4 rounded-xl border shadow-sm flex justify-between items-center transition-colors ${isNight
              ? 'bg-[#1F2937] border-gray-800'
              : 'bg-white border-gray-100'
              }`}>
              <div>
                <div className={`flex items-center gap-2 text-sm mb-1 ${isNight ? 'text-gray-400' : 'text-gray-500'}`}>
                  <span>{item.origin}</span>
                  <span>→</span>
                </div>
                <p className={`font-bold ${isNight ? 'text-gray-100' : 'text-gray-800'}`}>{item.destination}</p>
              </div>
              <span className="text-xs text-gray-400">{item.date}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const renderMyPage = () => (
    <div className={`flex flex-col h-full min-h-[calc(100vh-64px)] overflow-y-auto pb-20 p-6 transition-colors duration-300 ${isNight ? 'bg-black' : 'bg-white'}`}>
      <h2 className={`text-2xl font-bold mb-8 ${isNight ? 'text-white' : 'text-gray-900'}`}>내 정보</h2>

      <div className={`p-6 rounded-2xl mb-6 flex items-center gap-4 border ${isNight ? 'bg-gray-900 border-gray-800' : 'bg-indigo-50 border-transparent'}`}>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl border-2 ${isNight ? 'bg-violet-900/50 border-violet-500/20' : 'bg-indigo-200 border-white'
          }`}>
          🧑‍💻
        </div>
        <div>
          <p className={`font-bold text-lg ${isNight ? 'text-white' : 'text-gray-900'}`}>코딩 초보자</p>
          <p className={`text-sm ${isNight ? 'text-violet-400' : 'text-indigo-600'}`}>WaitStop 입문 레벨</p>
        </div>
      </div>

      <div className="space-y-2">
        {[
          { label: '공지사항' },
          { label: '자주 묻는 질문' },
          { label: '설정' }
        ].map((btn, idx) => (
          <button key={idx} className={`w-full text-left p-4 rounded-xl transition-colors border min-h-[54px] font-medium ${isNight
            ? 'hover:bg-gray-900 text-gray-300 bg-black border-gray-900'
            : 'hover:bg-gray-50 text-gray-600 bg-white border-transparent'
            }`}>
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );

  // [Wrapper Logic]
  return (
    <main className={`h-full min-h-screen transition-colors duration-300 ${isNight ? 'bg-black text-white' : 'bg-white text-black'}`}>
      {activeTab === 'home' && renderHome()}
      {activeTab === 'history' && renderHistory()}
      {activeTab === 'mypage' && renderMyPage()}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </main>
  );
}
