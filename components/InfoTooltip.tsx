import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
    content: string;
    direction?: 'up' | 'down';
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ content, direction = 'up' }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="relative inline-flex items-center">
            <div
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
                onTouchStart={() => setIsVisible(!isVisible)}
                className="cursor-pointer text-slate-600 hover:text-slate-200 transition-colors duration-200"
            >
                <Info size={12} strokeWidth={2.5} />
            </div>
            {isVisible && (
                <div className={`absolute z-[200] left-1/2 -translate-x-1/2 px-4 py-3 bg-slate-800 shadow-lg transition-all duration-200 w-64 border border-slate-600 rounded-lg pointer-events-none ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                    <p className="text-[11px] font-semibold text-slate-200 leading-relaxed whitespace-normal break-words">
                        {content}
                    </p>
                    {direction === 'up' ? (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800" />
                    ) : (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-slate-800" />
                    )}
                </div>
            )}
        </div>
    );
};

export default InfoTooltip;