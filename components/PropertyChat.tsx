
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, MessageSquareText } from 'lucide-react';
import { startPropertyChat, PropertyChat as ClaudePropertyChat } from '../services/claudeService';
import { MarketInsight, PropertyConfig } from '../types';
import ReactMarkdown from 'react-markdown';

interface Props {
  insight: MarketInsight;
  config: PropertyConfig;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const PropertyChat: React.FC<Props> = ({ insight, config }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<ClaudePropertyChat | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current = startPropertyChat(insight, config);
    setMessages([{ role: 'model', text: `Hi! I've analyzed this property. Want to know more about the numbers, local regulations, or potential ROI? Ask me anything!` }]);
  }, [insight, config]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatRef.current || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const botResponse = await chatRef.current.sendMessage(userMsg);
      setMessages(prev => [...prev, { role: 'model', text: botResponse }]);
    } catch (e) {
      console.error("Chat error:", e);
      setMessages(prev => [...prev, { role: 'model', text: "Error connecting to AI. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col h-[500px] overflow-hidden">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
        <div className="p-2 bg-rose-500 rounded-lg text-white">
          <MessageSquareText size={18} />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">AI Deal Analyst</h3>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Context-Aware Support</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-rose-500 text-white shadow-lg'}`}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className={`p-4 rounded-2xl text-[13px] leading-relaxed prose-chat ${msg.role === 'user' ? 'bg-slate-100 text-slate-800 rounded-tr-none' : 'bg-[#0f172a] text-slate-100 rounded-tl-none shadow-xl'}`}>
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-2">
              <Loader2 className="animate-spin text-rose-500" size={16} />
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Analyzing Data...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100">
        <div className="relative flex items-center">
          <input 
            type="text" 
            placeholder="Ask about ROI, Comps, or Strategy..." 
            className="w-full pl-6 pr-14 py-3 bg-white border border-slate-200 rounded-2xl font-medium text-sm outline-none focus:ring-4 focus:ring-rose-500/5 transition-all"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 p-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-all shadow-lg disabled:opacity-50 disabled:scale-95"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyChat;
