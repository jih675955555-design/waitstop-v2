import { Search, History, User } from 'lucide-react';

interface BottomNavProps {
    activeTab: 'home' | 'history' | 'mypage';
    onTabChange: (tab: 'home' | 'history' | 'mypage') => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
    const tabs = [
        { id: 'home', label: '검색', icon: Search },
        { id: 'history', label: '히스토리', icon: History },
        { id: 'mypage', label: '내 정보', icon: User },
    ] as const;

    return (
        <nav className="fixed bottom-0 w-full max-w-[430px] bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe">
            <div className="flex justify-around items-center h-16">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive
                                    ? 'text-indigo-600 dark:text-indigo-400'
                                    : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'
                                }`}
                        >
                            <Icon className={`w-6 h-6 ${isActive ? 'animate-bounce-subtle' : ''}`} />
                            <span className="text-xs font-medium">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
