'use client';

import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
    const [isNight, setIsNight] = useState(false);

    useEffect(() => {
        // [Logic] 초기 테마 설정 및 시스템 설정 감지
        if (document.documentElement.classList.contains('dark')) {
            setIsNight(true);
        }
    }, []);

    useEffect(() => {
        // [Forced Logic] 배경색 강제 변경 및 Tailwind 동기화
        if (isNight) {
            // 1. Tailwind Dark Mode Sync
            document.documentElement.classList.add('dark');

            // 2. Background Fallback (Brute Force)
            document.body.style.backgroundColor = '#000000';
            document.body.style.color = '#ffffff';
        } else {
            document.documentElement.classList.remove('dark');
            document.body.style.backgroundColor = '#ffffff';
            document.body.style.color = '#171717';
        }
    }, [isNight]);

    const toggleTheme = () => {
        setIsNight(!isNight);
    };

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-gray-100 dark:bg-zinc-800 transition-colors duration-300 relative overflow-hidden group"
            aria-label="Toggle Dark Mode"
        >
            <div className="relative w-6 h-6">
                <Sun
                    className={`absolute inset-0 w-6 h-6 text-yellow-500 transition-all duration-500 transform ${isNight ? 'rotate-90 opacity-0 scale-50' : 'rotate-0 opacity-100 scale-100'
                        }`}
                />
                <Moon
                    className={`absolute inset-0 w-6 h-6 text-violet-400 transition-all duration-500 transform ${isNight ? 'rotate-0 opacity-100 scale-100' : '-rotate-90 opacity-0 scale-50'
                        }`}
                />
            </div>
        </button>
    );
}
