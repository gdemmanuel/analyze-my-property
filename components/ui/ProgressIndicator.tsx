import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, Clock, Database, Globe, Sparkles, Users } from 'lucide-react';

export type AnalysisStep = 
  | 'property'
  | 'market'
  | 'rent'
  | 'webSearch'
  | 'analysis'
  | 'complete';

interface AnalysisStepConfig {
  id: AnalysisStep;
  label: string;
  icon: React.ReactNode;
  estimatedSeconds: number;
}

const steps: AnalysisStepConfig[] = [
  { id: 'property', label: 'Fetching property data', icon: <Database size={14} />, estimatedSeconds: 3 },
  { id: 'market', label: 'Loading market stats', icon: <Database size={14} />, estimatedSeconds: 3 },
  { id: 'rent', label: 'Getting rent estimates', icon: <Database size={14} />, estimatedSeconds: 3 },
  { id: 'webSearch', label: 'Searching STR market data', icon: <Globe size={14} />, estimatedSeconds: 15 },
  { id: 'analysis', label: 'Activating deep analytical models', icon: <Sparkles size={14} />, estimatedSeconds: 60 },
];

interface ProgressIndicatorProps {
  currentStep: AnalysisStep;
  isVisible: boolean;
  startTime?: number;
}

/**
 * ProgressIndicator - Shows progress through analysis steps
 * Used for long-running operations to keep users informed
 */
const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  isVisible,
  startTime,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [queueInfo, setQueueInfo] = useState<{ position: number; estimatedWaitTime: number; queuedJobs: number } | null>(null);

  useEffect(() => {
    if (!isVisible || !startTime) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, startTime]);

  // Poll queue status every 2 seconds when visible
  useEffect(() => {
    if (!isVisible) {
      setQueueInfo(null);
      return;
    }

    const fetchQueueStatus = async () => {
      try {
        const res = await fetch('/api/queue/status');
        if (res.ok) {
          const data = await res.json();
          setQueueInfo(data);
        }
      } catch (e) {
        // Ignore errors - queue info is optional
      }
    };

    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 2000);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const totalEstimated = steps.reduce((sum, s) => sum + s.estimatedSeconds, 0);
  const completedEstimated = steps
    .slice(0, currentStepIndex)
    .reduce((sum, s) => sum + s.estimatedSeconds, 0);
  
  const progressPercent = Math.min(
    ((completedEstimated + (steps[currentStepIndex]?.estimatedSeconds || 0) * 0.5) / totalEstimated) * 100,
    95
  );

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur-sm rounded-2xl border border-white/10 p-6 shadow-2xl">
      {/* Queue Info Banner */}
      {queueInfo && (queueInfo.position > 0 || queueInfo.queuedJobs > 0) && (
        <div className="mb-4 p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-amber-300">
            <Users size={14} />
            <span className="text-[11px] font-bold">
              {queueInfo.position > 0 ? (
                <>Queue Position: #{queueInfo.position} • Est. Wait: {queueInfo.estimatedWaitTime}s</>
              ) : (
                <>Processing your request • {queueInfo.processingJobs} job(s) active</>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest mb-2">
          <span className="text-rose-400">Analyzing Property</span>
          <span className="text-slate-400 flex items-center gap-2">
            <Clock size={12} />
            {formatTime(elapsedSeconds)} elapsed
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, idx) => {
          const isComplete = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const isPending = idx > currentStepIndex;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                isCurrent
                  ? 'bg-rose-500/20 border border-rose-500/30'
                  : isComplete
                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                  : 'bg-slate-800/50 border border-slate-700/50 opacity-50'
              }`}
            >
              <div className={`${
                isCurrent ? 'text-rose-400' : isComplete ? 'text-emerald-400' : 'text-slate-500'
              }`}>
                {isComplete ? (
                  <CheckCircle size={14} className="text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  step.icon
                )}
              </div>
              <span className={`text-xs font-bold ${
                isCurrent ? 'text-white' : isComplete ? 'text-emerald-300' : 'text-slate-500'
              }`}>
                {step.label}
              </span>
              {isCurrent && (
                <span className="ml-auto text-[10px] text-rose-400 font-medium animate-pulse">
                  Processing...
                </span>
              )}
              {isComplete && (
                <span className="ml-auto text-[10px] text-emerald-400 font-medium">
                  Done
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Estimated Time */}
      <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between text-[10px]">
        <span className="text-slate-500">
          {elapsedSeconds >= totalEstimated
            ? 'Still analyzing... please wait'
            : `Estimated: ~${formatTime(totalEstimated - Math.min(elapsedSeconds, totalEstimated))} remaining`}
        </span>
        <span className="text-slate-400 font-medium">
          {Math.round(progressPercent)}% complete
        </span>
      </div>
    </div>
  );
};

/**
 * Hook to manage analysis progress state
 */
export const useAnalysisProgress = () => {
  const [currentStep, setCurrentStep] = useState<AnalysisStep>('property');
  const [isVisible, setIsVisible] = useState(false);
  const [startTime, setStartTime] = useState<number | undefined>();

  const start = () => {
    setCurrentStep('property');
    setIsVisible(true);
    setStartTime(Date.now());
  };

  const updateStep = (step: AnalysisStep) => {
    setCurrentStep(step);
    if (step === 'complete') {
      setTimeout(() => setIsVisible(false), 500);
    }
  };

  const reset = () => {
    setIsVisible(false);
    setCurrentStep('property');
    setStartTime(undefined);
  };

  return {
    currentStep,
    isVisible,
    startTime,
    start,
    updateStep,
    reset,
  };
};

export default ProgressIndicator;
