import React from 'react';
import { Search, Loader2, Zap, Sparkles, AlertTriangle } from 'lucide-react';

interface SearchBarProps {
  propertyInput: string;
  onInputChange: (value: string) => void;
  onSearch: () => void;
  isAnalyzing: boolean;
  isFetchingFactual: boolean;
  isUsingWebData: boolean;
  analysisError: string | null;
  suggestionRef: React.RefObject<HTMLDivElement>;
  /** When false, button shows "Sign in to underwrite" and click opens signup */
  isLoggedIn?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  propertyInput, onInputChange, onSearch,
  isAnalyzing, isFetchingFactual, isUsingWebData,
  analysisError, suggestionRef, isLoggedIn = false
}) => {
  const buttonLabel = !isLoggedIn
    ? 'SIGN IN TO UNDERWRITE'
    : isFetchingFactual
      ? 'FETCHING DATA...'
      : 'UNDERWRITE';

  return (
    <div className="max-w-[1600px] mx-auto mb-8 print:hidden relative" ref={suggestionRef}>
      <div className="bg-white p-1 rounded-3xl shadow-xl flex flex-col md:flex-row gap-1 border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
          <input type="text" placeholder="Enter property address..." className="w-full pl-16 pr-8 py-4 bg-white border-none rounded-2xl outline-none text-[15px] font-black text-slate-800" value={propertyInput} onChange={(e) => onInputChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSearch()} />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isUsingWebData && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-600 rounded-full border border-purple-100">
                <Sparkles className="w-3 h-3" />
                <span className="text-[10px] font-black uppercase tracking-tight">Web Search Data</span>
              </div>
            )}
          </div>
        </div>
        <button onClick={onSearch} disabled={isAnalyzing || isFetchingFactual || (isLoggedIn && !propertyInput)} className="px-10 py-4 bg-[#0f172a] text-white font-black rounded-2xl hover:bg-black transition-all flex items-center gap-3 uppercase tracking-tighter shadow-xl">
          {isAnalyzing || isFetchingFactual ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} className="text-[#f43f5e]" />}
          {buttonLabel}
        </button>
      </div>
      {analysisError && <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4"><AlertTriangle size={20} className="text-[#f43f5e]" /><p className="text-[10px] font-black uppercase text-[#f43f5e] tracking-widest">{analysisError}</p></div>}
    </div>
  );
};

export default SearchBar;
