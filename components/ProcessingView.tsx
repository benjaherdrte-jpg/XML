
import React, { useEffect, useRef } from 'react';
import type { ProcessingLog } from '../types';

interface ProcessingViewProps {
  message: string;
  progress: number;
  logs: ProcessingLog[];
}

export const ProcessingView: React.FC<ProcessingViewProps> = ({ message, progress, logs }) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-[#030712] overflow-hidden relative">
      {/* Scanning Line Animation */}
      <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/40 shadow-[0_0_20px_emerald] z-50 animate-[scan_6s_infinite_linear]"></div>
      
      <div className="flex flex-col items-center justify-center pt-24 pb-20 px-16 text-center border-b border-slate-900 bg-slate-950/40 relative">
        <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
           <div className="h-full w-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500 via-transparent to-transparent"></div>
        </div>
        
        <div className="relative w-40 h-40 mb-12 group">
          <div className="absolute inset-0 bg-emerald-500/10 blur-[80px] rounded-full scale-150 animate-pulse"></div>
          <div className="absolute inset-0 border-8 border-slate-900 rounded-full"></div>
          <div 
            className="absolute inset-0 border-8 border-emerald-500/40 rounded-full border-t-transparent animate-spin"
            style={{ animationDuration: '2s' }}
          ></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
             <span className="text-3xl font-black font-mono text-emerald-400 tracking-tighter">{progress}%</span>
             <span className="text-[9px] text-slate-500 font-black tracking-[0.4em] uppercase mt-2">Neural_Flow</span>
          </div>
        </div>
        
        <div className="space-y-3 relative z-10">
          <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic tracking-[0.2em]">Processing Stream</h3>
          <p className="text-emerald-500/60 text-[11px] font-mono uppercase tracking-[0.5em] font-black animate-pulse leading-none">{message}</p>
        </div>

        <div className="mt-16 w-full max-w-lg bg-slate-900 h-2.5 rounded-full overflow-hidden shadow-3xl relative p-[1px] border border-slate-800">
          <div 
            className="bg-gradient-to-r from-emerald-600 via-emerald-400 to-cyan-600 h-full transition-all duration-1000 ease-out relative rounded-full"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute top-0 right-0 h-full w-20 bg-white/20 blur-xl"></div>
          </div>
        </div>
      </div>

      <div className="flex-grow px-12 pb-12 pt-8 overflow-hidden">
        <div className="bg-[#020617]/90 rounded-[3rem] border border-slate-800 h-full flex flex-col shadow-[0_0_100px_-20px_rgba(0,0,0,0.8)] relative overflow-hidden backdrop-blur-3xl">
          <div className="flex items-center justify-between px-10 py-5 border-b border-slate-900 bg-slate-950/60 backdrop-blur-md">
            <div className="flex items-center space-x-5">
               <div className="flex space-x-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-red-500/30 border border-red-500/50 shadow-lg shadow-red-500/10"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-500/30 border border-amber-500/50 shadow-lg shadow-amber-500/10"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/30 border border-emerald-500/50 animate-pulse shadow-lg shadow-emerald-500/10"></div>
               </div>
               <span className="text-[11px] font-black text-slate-600 tracking-[0.5em] uppercase">Core_System_Log</span>
            </div>
            <div className="flex items-center space-x-4">
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_15px_emerald]"></div>
               <span className="text-[10px] font-mono text-emerald-500/50 uppercase font-black tracking-widest">Pipeline: ACTIVE</span>
            </div>
          </div>
          
          <div className="flex-grow overflow-y-auto p-10 font-mono text-[11px] space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
            {logs.map((log) => (
              <div key={log.id} className="flex space-x-8 animate-in fade-in slide-in-from-left-6 duration-700">
                <span className="text-slate-700 shrink-0 tabular-nums font-bold select-none opacity-50">[{log.timestamp}]</span>
                <span className={`
                  font-medium leading-relaxed tracking-tight
                  ${log.type === 'error' ? 'text-red-400 bg-red-500/10 px-4 py-2 rounded-2xl border border-red-500/30 shadow-2xl' : ''}
                  ${log.type === 'warning' ? 'text-amber-400/80 italic border-l-2 border-amber-500/40 pl-4 py-1' : ''}
                  ${log.type === 'ai' ? 'text-emerald-400 font-black border-l-2 border-emerald-500/50 pl-6 py-1 bg-emerald-500/5 rounded-r-xl' : 'text-slate-500'}
                `}>
                  {log.type === 'ai' ? 'NEURAL >> ' : ''}{log.message}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
          
          <div className="px-10 py-4 border-t border-slate-900 bg-slate-950/80 text-[10px] text-slate-600 font-black uppercase tracking-[0.5em] flex justify-between items-center backdrop-blur-xl">
             <span className="flex items-center space-x-2">
               <svg className="w-3 h-3 text-emerald-500/40" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
               <span>Gemini_3_Flash_Bridge</span>
             </span>
             <div className="flex items-center space-x-6">
                <span className="animate-pulse text-emerald-500/30">Synapse_Mapping_L7</span>
                <span className="text-slate-800">Uptime: 00:04:12</span>
             </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes scan {
          from { top: -10%; }
          to { top: 110%; }
        }
      `}</style>
    </div>
  );
};
