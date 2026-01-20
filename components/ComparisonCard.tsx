import { RouteOption } from '../lib/mockData';
import { Leaf, Clock, Coins, ChevronsRight } from 'lucide-react';

interface ComparisonCardProps {
    option: RouteOption;
    isSelected?: boolean;
}

export default function ComparisonCard({ option, isSelected }: ComparisonCardProps) {
    const isSmartOrHybrid = option.type === 'smart' || option.type === 'hybrid';

    return (
        <div
            className={`relative p-5 rounded-2xl border-2 transition-all duration-300 ${isSmartOrHybrid
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-lg shadow-indigo-100'
                    : 'border-gray-200 bg-white'
                }`}
        >
            {option.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md whitespace-nowrap animate-pulse">
                    {option.highlight}
                </div>
            )}

            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <span
                        className={`px-2 py-1 rounded-md text-xs font-bold ${isSmartOrHybrid ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                            }`}
                    >
                        {option.label}
                    </span>
                </div>
                {isSmartOrHybrid && <Leaf className="w-5 h-5 text-indigo-500" />}
            </div>

            <div className="space-y-3">
                <div className="flex items-end justify-between">
                    <div className="flex items-center gap-2 text-gray-700">
                        <Clock className="w-5 h-5" />
                        <span className="text-2xl font-bold">{option.duration}분</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                        <Coins className="w-4 h-4" />
                        <span>{option.cost.toLocaleString()}원</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500 bg-white/50 p-2 rounded-lg">
                    {option.transportation.map((trans, index) => (
                        <div key={index} className="flex items-center">
                            <span>{trans}</span>
                            {index < option.transportation.length - 1 && (
                                <ChevronsRight className="w-4 h-4 mx-1 text-gray-300" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
