'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface ToastProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

export default function Toast({ message, isVisible, onClose, duration = 3000 }: ToastProps) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setShow(true);
            const timer = setTimeout(() => {
                setShow(false);
                setTimeout(onClose, 300); // Wait for animation
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    if (!isVisible && !show) return null;

    return (
        <div
            className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
        >
            <div className="bg-gray-800 dark:bg-gray-700 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 min-w-max">
                <AlertCircle className="w-5 h-5 text-orange-400" />
                <span className="font-medium text-sm">{message}</span>
            </div>
        </div>
    );
}
