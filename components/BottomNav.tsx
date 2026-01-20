'use client';

import { Home, History, User } from 'lucide-react';

interface BottomNavProps {
    activeTab: 'home' | 'history' | 'mypage';
    onTabChange: (tab: 'home' | 'history' | 'mypage') => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
    const tabs = [
        { id: 'home', icon: Home, label: '홈' },
        { id: 'history', icon: History, label: '히스토리' },
        { id: 'mypage', icon: User, label: '마이페이지' },
    ] as const;

    return (
        <nav className="fixed bottom-0 w-full max-w-[430px] bg-white/90 dark:bg-black/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 pb-safe transition-colors duration-300 z-50">
            <div className="flex justify-around items-center h-16">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id as any)}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${isActive
                                ? 'text-indigo-600 dark:text-violet-400'
                                : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'
                                }`}
                        >
                            <Icon
                                className={`w-6 h-6 transition-transform duration-300 ${isActive ? 'fill-current scale-110' : 'scale-100'}`}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            <span className="text-[10px] font-medium">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
