import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, History, Activity, Zap, ShieldCheck, Calendar, Clock, Download } from 'lucide-react';
import { BreakoutService, RoomEventLog } from '@/services/BreakoutService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  breakoutId: string;
  roomName: string;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  breakoutId,
  roomName,
}) => {
  const [logs, setLogs] = useState<RoomEventLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const history = await BreakoutService.getRoomHistory(breakoutId);
      setLogs(history);
    } catch (error) {
      console.error('[HistoryModal] Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [breakoutId]);

  useEffect(() => {
    if (isOpen && breakoutId) {
      fetchHistory();
    }
  }, [isOpen, breakoutId, fetchHistory]);

  if (!isOpen) return null;

  const filteredLogs = logs
    .filter((log) => {
      if (filter === 'ALL') return true;
      if (filter === 'AUTOMATION') return log.event_type === 'AUTOMATION_EXECUTED';
      if (filter === 'CHAT') return log.event_type === 'CHAT_MESSAGE';
      if (filter === 'SPIKE') return log.event_type === 'EMOTIONAL_SPIKE';
      return true;
    })
    .reverse(); // Latest first

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'AUTOMATION_EXECUTED':
        return <Zap className='w-4 h-4 text-emerald-400' />;
      case 'EMOTIONAL_SPIKE':
        return <ShieldCheck className='w-4 h-4 text-rose-400' />;
      case 'CHAT_MESSAGE':
        return <Activity className='w-4 h-4 text-indigo-400' />;
      default:
        return <History className='w-4 h-4 text-white/40' />;
    }
  };

  const getEventTitle = (log: RoomEventLog) => {
    switch (log.event_type) {
      case 'AUTOMATION_EXECUTED':
        return log.payload.action || 'AI Automation';
      case 'EMOTIONAL_SPIKE':
        return `Emotional Spike (${log.payload.intensity})`;
      case 'CHAT_MESSAGE':
        return 'Chat Activity';
      default:
        return log.event_type;
    }
  };

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center p-4'>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className='absolute inset-0 bg-black/80 backdrop-blur-sm'
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className='relative w-full max-w-4xl max-h-[85vh] bg-[#0c0f14] border border-white/10 rounded-[32px] overflow-hidden flex flex-col shadow-2xl'
      >
        {/* Header */}
        <div className='p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-indigo-500/5 to-transparent'>
          <div>
            <div className='flex items-center gap-3 mb-1'>
              <div className='p-2 bg-indigo-500/10 rounded-xl'>
                <History className='w-5 h-5 text-indigo-400' />
              </div>
              <h2 className='text-xl font-black text-white uppercase tracking-tighter'>
                Neural Retrospective
              </h2>
            </div>
            <p className='text-white/40 text-xs font-medium tracking-tight'>
              Viewing historical data for{' '}
              <span className='text-indigo-400 font-bold'>{roomName}</span>
            </p>
          </div>

          <div className='flex items-center gap-4'>
            <div className='flex bg-white/5 p-1 rounded-xl border border-white/10'>
              {['ALL', 'AUTOMATION', 'SPIKE', 'CHAT'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    filter === f
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className='p-3 hover:bg-white/5 rounded-2xl transition-colors border border-transparent hover:border-white/10'
            >
              <X className='w-5 h-5 text-white/40' />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 flex overflow-hidden'>
          {/* Main Feed */}
          <div className='flex-1 flex flex-col min-w-0'>
            <ScrollArea className='flex-1 p-8'>
              {isLoading ? (
                <div className='flex items-center justify-center py-20'>
                  <Activity className='w-8 h-8 text-indigo-500 animate-pulse' />
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className='py-20 text-center'>
                  <History className='w-12 h-12 text-white/5 mx-auto mb-4' />
                  <p className='text-white/20 font-black uppercase tracking-[0.2em] text-[10px]'>
                    No Neural Records Found
                  </p>
                </div>
              ) : (
                <div className='space-y-6'>
                  {filteredLogs.map((log) => (
                    <div key={log.id} className='group relative flex gap-6'>
                      {/* Timeline Line */}
                      <div className='absolute left-4 top-10 bottom-0 w-px bg-white/5 -mb-6 group-last:hidden' />

                      {/* Icon Container */}
                      <div className='relative z-10 w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-xl group-hover:border-white/20 transition-all'>
                        {getEventIcon(log.event_type)}
                      </div>

                      {/* Content Card */}
                      <div className='flex-1 pb-6 min-w-0'>
                        <div className='bg-white/[0.02] border border-white/5 rounded-2xl p-4 group-hover:bg-white/[0.04] group-hover:border-white/10 transition-all'>
                          <div className='flex items-start justify-between mb-2'>
                            <div>
                              <h3 className='text-xs font-black text-white/80 uppercase tracking-widest mb-1'>
                                {getEventTitle(log)}
                              </h3>
                              <div className='flex items-center gap-3 text-[10px] text-white/40 font-bold uppercase tracking-widest'>
                                <span className='flex items-center gap-1'>
                                  <Clock className='w-2.5 h-2.5' />{' '}
                                  {format(new Date(log.created_at), 'HH:mm:ss')}
                                </span>
                                <span className='flex items-center gap-1'>
                                  <Calendar className='w-2.5 h-2.5' />{' '}
                                  {format(new Date(log.created_at), 'MMM dd')}
                                </span>
                              </div>
                            </div>
                            {log.event_type === 'EMOTIONAL_SPIKE' && (
                              <div
                                className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                  log.payload.intensity === 'HIGH'
                                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                    : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                                }`}
                              >
                                {log.payload.intensity} STRESS
                              </div>
                            )}
                          </div>

                          <p className='text-white/60 text-sm leading-relaxed mb-3'>
                            {log.event_type === 'CHAT_MESSAGE' ? (
                              <span className='italic'>"{log.payload.text}"</span>
                            ) : (
                              log.payload.description ||
                              `Automatic log entry for type ${log.event_type}`
                            )}
                          </p>

                          {/* Metadata Badges */}
                          <div className='flex flex-wrap gap-2'>
                            {log.payload.userId && (
                              <div className='px-2 py-0.5 rounded-md bg-white/5 text-[9px] font-bold text-white/40 uppercase tracking-widest border border-white/5'>
                                User: {log.payload.userId.slice(0, 8)}
                              </div>
                            )}
                            {log.payload.primarySentiment && (
                              <div className='px-2 py-0.5 rounded-md bg-indigo-500/5 text-[9px] font-bold text-indigo-400/60 uppercase tracking-widest border border-indigo-500/10'>
                                Mood: {log.payload.primarySentiment}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Sidebar Stats */}
          <div className='w-72 border-l border-white/5 bg-black/20 p-8 hidden xl:block'>
            <h3 className='text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-6'>
              Neural Insights
            </h3>

            <div className='space-y-6'>
              <div className='p-6 bg-white/[0.03] border border-white/5 rounded-[24px]'>
                <div className='text-2xl font-black text-white mb-1'>{logs.length}</div>
                <div className='text-[9px] font-black text-white/20 uppercase tracking-widest'>
                  Total Room Events
                </div>
              </div>

              <div className='p-6 bg-rose-500/[0.03] border border-rose-500/10 rounded-[24px]'>
                <div className='text-2xl font-black text-rose-400 mb-1'>
                  {logs.filter((l) => l.event_type === 'EMOTIONAL_SPIKE').length}
                </div>
                <div className='text-[9px] font-black text-rose-500/40 uppercase tracking-widest'>
                  Neutralized Spikes
                </div>
              </div>

              <div className='p-6 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-[24px]'>
                <div className='text-2xl font-black text-emerald-400 mb-1'>
                  {logs.filter((l) => l.event_type === 'AUTOMATION_EXECUTED').length}
                </div>
                <div className='text-[9px] font-black text-emerald-500/40 uppercase tracking-widest'>
                  AI Interventions
                </div>
              </div>
            </div>

            <button className='w-full mt-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest transition-all flex items-center justify-center gap-2'>
              <Download className='w-3 h-3' /> Export Archive
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
