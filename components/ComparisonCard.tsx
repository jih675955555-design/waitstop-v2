import { RouteOption } from '../lib/mockData';
import { Leaf, Clock, Coins, ChevronsRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface ComparisonCardProps {
    option: RouteOption;
}

export default function ComparisonCard({ option }: ComparisonCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const isSmartOrHybrid = option.type === 'smart' || option.type === 'hybrid';

    return (
        <div
            onClick={() => setIsOpen(!isOpen)}
            className={`relative rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden group ${isSmartOrHybrid
                ? 'border-indigo-500 bg-indigo-50/50 dark:border-violet-500/50 dark:bg-[#121212] shadow-lg shadow-indigo-100 dark:shadow-none'
                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827]'
                }`}
        >
            {option.highlight && (
                <div className="absolute top-0 right-0 bg-indigo-600 dark:bg-violet-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-xl shadow-sm z-10 animate-pulse">
                    {option.highlight}
                </div>
            )}

            {/* Card Header (Summary) */}
            <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <span
                            className={`px-2 py-1 rounded-md text-xs font-bold transition-colors ${isSmartOrHybrid
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-violet-900/30 dark:text-violet-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                }`}
                        >
                            {option.label}
                        </span>
                        {isSmartOrHybrid && <Leaf className="w-4 h-4 text-indigo-500 dark:text-green-400" />}
                    </div>
                </div>

                <div className="flex items-end justify-between mb-3">
                    <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                        <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        <span className="text-2xl font-bold">{option.duration}분</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm">
                        <Coins className="w-4 h-4" />
                        <span>{option.cost.toLocaleString()}원</span>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        {option.transportation.map((trans, index) => (
                            <div key={index} className="flex items-center">
                                <span>{trans}</span>
                                {index < option.transportation.length - 1 && (
                                    <ChevronsRight className="w-3 h-3 mx-1 text-gray-300 dark:text-gray-600" />
                                )}
                            </div>
                        ))}
                    </div>
                    {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    )}
                </div>
            </div>

            {/* Expandable Detail Section */}
            <div
                className={`bg-gray-50 dark:bg-black/30 transition-all duration-500 ease-in-out ${isOpen ? 'max-h-96 opacity-100 p-5 border-t border-gray-100 dark:border-gray-800' : 'max-h-0 opacity-0 p-0 border-none'
                    }`}
            >
                <div className="space-y-4 relative">
                    {/* Vertical Line */}
                    <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-800" />

                    {option.steps?.map((step, idx) => (
                        <div key={idx} className="relative flex items-start gap-4">
                            {/* Dot */}
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ring-4 ring-gray-50 dark:ring-[#1F2937] ${step.type === 'taxi' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400' :
                                step.type === 'bus' || step.type === 'nightbus' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' :
                                    step.type === 'subway' ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400' :
                                        'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                }`}>
                                <div className="w-2 h-2 bg-current rounded-full" />
                            </div>

                            <div className="flex-1 text-sm">
                                <p className="font-medium text-gray-800 dark:text-gray-200">{step.description}</p>
                                <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    <span>{step.duration}분</span>
                                    {step.cost && <span>· {step.cost.toLocaleString()}원</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
