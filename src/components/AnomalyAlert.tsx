import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Fingerprint, Activity, Clock, ShieldX, X } from 'lucide-react';

export interface AnomalyEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  actor?: string;
}

export const AnomalyAlert: React.FC<{ anomalies: AnomalyEvent[] }> = ({ anomalies }) => {
  const [dismissed, setDismissed] = useState<string[]>([]);

  const activeAnomalies = anomalies.filter((a) => !dismissed.includes(a.id));

  if (activeAnomalies.length === 0) return null;

  return (
    <div className='fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-80'>
      <AnimatePresence>
        {activeAnomalies.map((anomaly) => (
          <motion.div
            key={anomaly.id}
            layout
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
            className={`relative overflow-hidden rounded-2xl border bg-black/80 backdrop-blur-xl p-4 shadow-2xl ${
              anomaly.severity === 'critical'
                ? 'border-red-500/50 shadow-red-500/20'
                : anomaly.severity === 'high'
                  ? 'border-orange-500/50 shadow-orange-500/20'
                  : anomaly.severity === 'medium'
                    ? 'border-amber-500/50 shadow-amber-500/20'
                    : 'border-blue-500/50 shadow-blue-500/20'
            }`}
          >
            {/* Animated Background Glow */}
            <div
              className={`absolute -inset-1 opacity-20 blur-xl animate-pulse ${
                anomaly.severity === 'critical'
                  ? 'bg-red-500'
                  : anomaly.severity === 'high'
                    ? 'bg-orange-500'
                    : anomaly.severity === 'medium'
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
              }`}
            />

            <div className='relative z-10'>
              <div className='flex items-start justify-between mb-2'>
                <div className='flex items-center gap-2'>
                  {anomaly.severity === 'critical' ? (
                    <ShieldX className='w-4 h-4 text-red-400' />
                  ) : anomaly.severity === 'high' ? (
                    <AlertTriangle className='w-4 h-4 text-orange-400' />
                  ) : anomaly.type.includes('auth') ? (
                    <Fingerprint className='w-4 h-4 text-amber-400' />
                  ) : (
                    <Activity className='w-4 h-4 text-blue-400' />
                  )}
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest ${
                      anomaly.severity === 'critical'
                        ? 'text-red-400'
                        : anomaly.severity === 'high'
                          ? 'text-orange-400'
                          : anomaly.severity === 'medium'
                            ? 'text-amber-400'
                            : 'text-blue-400'
                    }`}
                  >
                    {anomaly.type}
                  </span>
                </div>
                <button
                  onClick={() => setDismissed((prev) => [...prev, anomaly.id])}
                  className='p-1 rounded-lg hover:bg-white/10 text-white/40 transition-colors'
                >
                  <X className='w-3 h-3' />
                </button>
              </div>

              <p className='text-xs text-white/80 leading-relaxed mb-3'>{anomaly.description}</p>

              <div className='flex items-center justify-between text-[9px] font-mono text-white/40 border-t border-white/10 pt-2'>
                <span className='flex items-center gap-1'>
                  <Clock className='w-3 h-3' /> {anomaly.timestamp}
                </span>
                {anomaly.actor && (
                  <span className='uppercase tracking-widest truncate max-w-[100px]'>
                    ACTOR: {anomaly.actor}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default AnomalyAlert;
