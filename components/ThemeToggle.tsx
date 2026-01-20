'use client';

import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // 초기 테마 설정 (시스템 설정 또는 이전 설정 미지원 시 기본값)
        // 여기서는 기본적으로 Light 모드로 시작하되 토글로 제어
        if (document.documentElement.classList.contains('dark')) {
            setIsDark(true);
        }
    }, []);

    const toggleTheme = () => {
        if (isDark) {
            document.documentElement.classList.remove('dark');
            setIsDark(false);
        } else {
            document.documentElement.classList.add('dark');
            setIsDark(true);
        }
    };

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 transition-colors duration-300 relative overflow-hidden group"
            aria-label="Toggle Dark Mode"
        >
            <div className="relative w-6 h-6">
                <Sun
                    className={`absolute inset-0 w-6 h-6 text-yellow-500 transition-all duration-500 transform ${isDark ? 'rotate-90 opacity-0 scale-50' : 'rotate-0 opacity-100 scale-100'
                        }`}
                />
                <Moon
                    className={`absolute inset-0 w-6 h-6 text-indigo-300 transition-all duration-500 transform ${isDark ? 'rotate-0 opacity-100 scale-100' : '-rotate-90 opacity-0 scale-50'
                        }`}
                />
            </div>
        </button>
    );
}
