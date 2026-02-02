import { RouteOption } from '../lib/mockData';
import { Leaf, Clock, Coins, ChevronsRight, ChevronDown, ChevronUp, Zap, Crown, PiggyBank } from 'lucide-react';
import { useState } from 'react';

interface ComparisonCardProps {
    option: RouteOption;
}

export default function ComparisonCard({ option }: ComparisonCardProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Determine Style based on Type
    const isSmart = option.type === 'smart';
    const isVIP = option.type === 'vip';
    const isSaver = option.type === 'saver';

    let cardBg = 'bg-white dark:bg-[#111827] border-gray-200 dark:border-gray-800';
    let iconColor = 'text-gray-500';
    let labelBg = 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';

    if (isSmart) {
        cardBg = 'border-indigo-500 bg-indigo-50/30 dark:border-violet-500 dark:bg-[#1a103d]';
        iconColor = 'text-indigo-500 dark:text-violet-400';
        labelBg = 'bg-indigo-100 text-indigo-700 dark:bg-violet-900/50 dark:text-violet-300';
    } else if (isVIP) {
        cardBg = 'border-yellow-400 bg-yellow-50/30 dark:border-yellow-600/50 dark:bg-[#1f1a10]';
        iconColor = 'text-yellow-600 dark:text-yellow-400';
        labelBg = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200';
    } else if (isSaver) {
        cardBg = 'border-green-400 bg-green-50/30 dark:border-green-800/50 dark:bg-[#05110a]';
        iconColor = 'text-green-600 dark:text-green-400';
        labelBg = 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
    }

    return (
        <div
            onClick={() => setIsOpen(!isOpen)}
            className={`relative rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden group hover:scale-[1.02] ${cardBg} shadow-sm`}
        >
            {/* Tag / Badge */}
            {option.tag && (
                <div className={`absolute top-0 right-0 text-[10px] font-bold px-3 py-1.5 rounded-bl-xl shadow-sm z-10 ${isSmart ? 'bg-indigo-600 dark:bg-violet-600 text-white animate-pulse' :
                    isVIP ? 'bg-yellow-500 text-black' :
                        'bg-green-600 text-white'
                    }`}>
                    {option.tag}
                </div>
            )}

            <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${labelBg}`}>
                            {isSmart && <Zap className="w-3.5 h-3.5" />}
                            {isVIP && <Crown className="w-3.5 h-3.5" />}
                            {isSaver && <PiggyBank className="w-3.5 h-3.5" />}
                            {option.label}
                        </span>

                        {/* Badge for Time Saving */}
                        {option.badge && (
                            <span className="text-[10px] font-bold text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full whitespace-nowrap">
                                {option.badge}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-end justify-between mb-2">
                    <div className="flex items-center gap-2 text-gray-900 dark:text-gray-50">
                        <Clock className={`w-5 h-5 ${iconColor}`} />
                        <span className="text-2xl font-black tracking-tight">{option.duration}분</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 text-sm font-medium">
                        <Coins className="w-4 h-4" />
                        <span>{option.cost.toLocaleString()}원</span>
                    </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-1">
                    {option.description}
                </p>

                {/* Details Trigger */}
                <div className="flex items-center justify-between border-t border-gray-200/50 dark:border-white/5 pt-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                        <span className="truncate max-w-[200px]">{option.details}</span>
                    </div>
                    {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                </div>
            </div>

            {/* Expandable Section: Detailed Steps */}
            <div
                className={`bg-white/50 dark:bg-black/20 backdrop-blur-sm transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[500px] opacity-100 p-4 border-t border-gray-100 dark:border-white/10' : 'max-h-0 opacity-0 p-0 border-none'
                    }`}
            >
                {option.steps && option.steps.length > 0 ? (
                    <div className="relative pl-2 ml-1 space-y-0">
                        {/* Vertical Line - Themed Color */}
                        <div className={`absolute top-2 bottom-4 left-[15px] w-0.5 ${isSmart ? 'bg-indigo-200 dark:bg-indigo-900' :
                                isVIP ? 'bg-yellow-200 dark:bg-yellow-900' :
                                    'bg-green-200 dark:bg-green-900'
                            }`}></div>

                        {option.steps.map((step, idx) => (
                            <div key={idx} className={`relative flex gap-4 pb-6 last:pb-0 ${step.isTransferHub ? 'bg-indigo-50/80 dark:bg-indigo-900/40 p-3 rounded-xl border border-indigo-200 dark:border-indigo-500/50 -ml-2 shadow-sm' : ''
                                }`}>
                                {/* Icon Bubble */}
                                <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 bg-white dark:bg-gray-800 ${isSmart ? 'border-indigo-400 text-indigo-600' :
                                        isVIP ? 'border-yellow-400 text-yellow-600' :
                                            'border-green-400 text-green-600'
                                    }`}>
                                    {step.type === 'TAXI' && <Crown className="w-3.5 h-3.5" />}
                                    {step.type === 'SUBWAY' && <Zap className="w-3.5 h-3.5" />}
                                    {step.type === 'BUS' && <Leaf className="w-3.5 h-3.5" />}
                                    {step.type === 'WALK' && <div className={`w-1.5 h-1.5 rounded-full ${isSmart ? 'bg-indigo-400' : isVIP ? 'bg-yellow-400' : 'bg-green-400'
                                        }`} />}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className={`text-sm ${step.isTransferHub ? 'font-black text-indigo-800 dark:text-indigo-200 text-base' : 'font-bold text-gray-800 dark:text-gray-200'
                                            }`}>
                                            {step.name}
                                        </p>
                                        {step.time && <span className="text-xs font-mono text-gray-500">{step.time}분</span>}
                                    </div>
                                    <p className={`text-xs mt-0.5 ${step.isTransferHub ? 'text-indigo-700 dark:text-indigo-300 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {step.desc}
                                    </p>

                                    {/* Cost Tag (Only if > 0) */}
                                    {step.cost && step.cost > 0 ? (
                                        <div className="mt-1">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isSmart ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' :
                                                    isVIP ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                                        'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                                }`}>
                                                {step.cost.toLocaleString()}원
                                            </span>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-center text-gray-400 py-2">
                        상세 경로 정보가 없습니다.
                    </div>
                )}
            </div>
        </div>
    );
}
