import React from 'react';

interface BulletContentProps {
  text: string;
  isDark?: boolean;
  bulletColor?: string;
}

const BulletContent: React.FC<BulletContentProps> = ({ text, isDark = false, bulletColor = 'bg-[#ef4444]' }) => {
  if (!text) return null;
  let lines = text.split(/\n+/);
  if (lines.length <= 1) lines = text.split(/(?:[•\-\*]|\d+\.)\s+/).filter(Boolean);
  const processedLines = lines.map(l => l.trim().replace(/^[•\-\*\d\.\s]+/, '')).filter(line => line.length > 5);
  return (
    <ul className="space-y-4">
      {processedLines.map((line, i) => {
        const splitIndex = line.indexOf(':');
        const hasHeader = splitIndex > 0 && splitIndex < 50;
        return (
          <li key={i} className="flex gap-4 items-start">
            <div className={`shrink-0 w-1.5 h-1.5 rounded-full mt-2 ${bulletColor}`} />
            <div className="flex flex-col">
              {hasHeader && <strong className={`${isDark ? 'text-white' : 'text-[#1e293b]'} font-extrabold text-[15px] tracking-tight mb-1`}>{line.substring(0, splitIndex).trim()}</strong>}
              <p className={`text-[14px] leading-relaxed font-medium ${isDark ? 'text-slate-200' : 'text-[#1e293b]'}`}>{(hasHeader ? line.substring(splitIndex + 1).trim() : line).replace(/\*\*/g, '')}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default BulletContent;
