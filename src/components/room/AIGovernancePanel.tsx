/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * AIGovernancePanel — AI Meeting Intelligence Layer
 *
 * AI advises, it NEVER enforces. Every suggestion requires host approval.
 *
 * Shows:
 *  - Live meeting summary (bullet points)
 *  - Speaker analytics: speaking distribution
 *  - Topic tracking
 *  - AI policy suggestions (host-approve to apply)
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Mic,
  BarChart2,
  BookOpen,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { type AISuggestion } from '@/hooks/usePolicyEngine';

interface SpeakerStat {
  userId: string;
  name: string;
  talkTime: number; // percentage 0–100
}

interface MeetingInsight {
  summary: string[];
  topics: string[];
  speakers: SpeakerStat[];
}

interface AIGovernancePanelProps {
  roomId: string;
   
  socket: any;
  isHost: boolean;
  sessionId?: string;
}

export function AIGovernancePanel({ roomId, socket, isHost, sessionId }: AIGovernancePanelProps) {
  const [insights, setInsights] = useState<MeetingInsight>({
    summary: [],
    topics: [],
    speakers: [],
  });
  const [aiSuggestions, setAISuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'speakers' | 'topics' | 'suggestions'>(
    'summary'
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(() => {
    if (!socket || !roomId) return;
    setIsLoading(true);
    // Request AI summary from existing meeting summarizer
    socket.emit('room:request_ai_summary', { roomId, sessionId });
    setTimeout(() => setIsLoading(false), 2000); // fallback
  }, [socket, roomId, sessionId]);

  useEffect(() => {
    if (!socket) return;
    refresh();

    // Listen for AI summary data
    socket.on(
      'ai:meeting_summary',
      ({
        roomId: rid,
        summary,
        topics,
      }: {
        roomId: string;
        summary: string[];
        topics: string[];
      }) => {
        if (rid !== roomId) return;
        setInsights((prev) => ({ ...prev, summary: summary ?? [], topics: topics ?? [] }));
        setLastUpdated(new Date());
        setIsLoading(false);
      }
    );

    // Listen for speaker analytics
    socket.on(
      'ai:speaker_analytics',
      ({ roomId: rid, speakers }: { roomId: string; speakers: SpeakerStat[] }) => {
        if (rid !== roomId) return;
        setInsights((prev) => ({ ...prev, speakers: speakers ?? [] }));
      }
    );

    // AI policy suggestions from Policy Engine
    socket.on('ai:suggestion', (suggestion: AISuggestion) => {
      if (suggestion.roomId !== roomId) return;
      setAISuggestions((prev) => {
        const exists = prev.find((s) => s.id === suggestion.id);
        if (exists) return prev;
        return [suggestion, ...prev].slice(0, 20);
      });
    });

    socket.on('ai:suggestion_approved', ({ suggestionId }: { suggestionId: string }) => {
      setAISuggestions((prev) =>
        prev.map((s) => (s.id === suggestionId ? { ...s, approved: true } : s))
      );
    });

    socket.on('ai:suggestion_dismissed', ({ suggestionId }: { suggestionId: string }) => {
      setAISuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
    });

    return () => {
      socket.off('ai:meeting_summary');
      socket.off('ai:speaker_analytics');
      socket.off('ai:suggestion');
      socket.off('ai:suggestion_approved');
      socket.off('ai:suggestion_dismissed');
    };
  }, [socket, roomId, refresh]);

  const handleApprove = (suggestion: AISuggestion) => {
    socket?.emit('ai:approve_suggestion', { roomId, suggestionId: suggestion.id });
  };

  const handleDismiss = (suggestion: AISuggestion) => {
    socket?.emit('ai:dismiss_suggestion', { roomId, suggestionId: suggestion.id });
  };

  const pendingSuggestions = aiSuggestions.filter((s) => !s.approved);

  const tabs = [
    { id: 'summary' as const, label: 'Summary', icon: BookOpen, count: insights.summary.length },
    { id: 'speakers' as const, label: 'Speakers', icon: Mic, count: insights.speakers.length },
    { id: 'topics' as const, label: 'Topics', icon: TrendingUp, count: insights.topics.length },
    { id: 'suggestions' as const, label: 'AI Advice', icon: Bot, count: pendingSuggestions.length },
  ];

  return (
    <div className='flex flex-col gap-3'>
      {/* ── Header ────────────────────────────── */}
      <div className='flex items-center gap-2'>
        <div className='w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center'>
          <Bot size={12} className='text-purple-400' />
        </div>
        <div className='flex-1 min-w-0'>
          <h3 className='text-xs font-black uppercase tracking-widest text-white'>
            AI Intelligence
          </h3>
          {lastUpdated && (
            <p className='text-[10px] text-slate-600'>Updated {lastUpdated.toLocaleTimeString()}</p>
          )}
        </div>
        <div className='flex items-center gap-1'>
          <span className='text-[9px] text-slate-600 italic'>advises only</span>
          <button
            onClick={refresh}
            disabled={isLoading}
            className='w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors'
          >
            {isLoading ? <Loader2 size={10} className='animate-spin' /> : <RefreshCw size={10} />}
          </button>
        </div>
      </div>

      {/* ── Tab Navigation ─────────────────────── */}
      <div className='flex rounded-xl bg-white/3 border border-white/5 p-0.5 gap-0.5'>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-slate-600 hover:text-slate-400'
            }`}
          >
            <tab.icon size={9} />
            <span className='hidden sm:inline'>{tab.label}</span>
            {tab.count > 0 && (
              <span
                className={`rounded-full text-[8px] px-1 ${activeTab === tab.id ? 'bg-white/20' : 'bg-white/5'}`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ────────────────────────── */}
      <AnimatePresence mode='wait'>
        {activeTab === 'summary' && (
          <motion.div
            key='summary'
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className='flex flex-col gap-1.5'
          >
            {insights.summary.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                text='No summary yet. Summary generates after 2+ minutes of activity.'
              />
            ) : (
              insights.summary.map((point, i) => (
                <div
                  key={i}
                  className='flex items-start gap-2 rounded-xl bg-white/5 border border-white/5 px-3 py-2'
                >
                  <span className='text-purple-400 text-xs mt-px'>•</span>
                  <p className='text-xs text-slate-300 leading-relaxed'>{point}</p>
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'speakers' && (
          <motion.div
            key='speakers'
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className='flex flex-col gap-2'
          >
            {insights.speakers.length === 0 ? (
              <EmptyState
                icon={Mic}
                text='Speaker analytics appear when voice data is available.'
              />
            ) : (
              <>
                <p className='text-[10px] text-slate-600'>Speaking distribution</p>
                {[...insights.speakers]
                  .sort((a, b) => b.talkTime - a.talkTime)
                  .map((speaker) => (
                    <div key={speaker.userId} className='flex flex-col gap-1'>
                      <div className='flex items-center justify-between'>
                        <span className='text-xs text-white font-medium'>{speaker.name}</span>
                        <span className='text-[10px] font-mono text-slate-400'>
                          {speaker.talkTime}%
                        </span>
                      </div>
                      <div className='h-1.5 rounded-full bg-white/5 overflow-hidden'>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${speaker.talkTime}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`h-full rounded-full ${
                            speaker.talkTime > 60
                              ? 'bg-red-400'
                              : speaker.talkTime > 30
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                <p className='text-[9px] text-slate-600 mt-1'>
                  {insights.speakers.find((s) => s.talkTime > 60)
                    ? '⚠ One speaker is dominating. Consider Discussion mode.'
                    : '✓ Balanced participation.'}
                </p>
              </>
            )}
          </motion.div>
        )}

        {activeTab === 'topics' && (
          <motion.div
            key='topics'
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className='flex flex-col gap-2'
          >
            {insights.topics.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                text='Topics are detected from transcription after discussion begins.'
              />
            ) : (
              <div className='flex flex-wrap gap-1.5'>
                {insights.topics.map((topic, i) => (
                  <span
                    key={i}
                    className='rounded-full px-2.5 py-1 text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/20'
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'suggestions' && (
          <motion.div
            key='suggestions'
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className='flex flex-col gap-2'
          >
            <div className='flex items-center gap-2 rounded-xl bg-purple-500/10 border border-purple-500/20 px-3 py-2'>
              <Bot size={12} className='text-purple-400 shrink-0' />
              <p className='text-[10px] text-purple-300'>
                AI suggests, <strong>you decide</strong>. No rule auto-applies without your
                approval.
              </p>
            </div>

            {pendingSuggestions.length === 0 ? (
              <EmptyState
                icon={Bot}
                text='No AI suggestions right now. They appear based on room activity.'
              />
            ) : (
              pendingSuggestions.map((s) => (
                <div
                  key={s.id}
                  className='rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col gap-2'
                >
                  <p className='text-xs text-slate-300 leading-relaxed'>{s.message}</p>
                  {s.suggestedAction && (
                    <p className='text-[10px] font-mono text-slate-600'>→ {s.suggestedAction}</p>
                  )}
                  {isHost && (
                    <div className='flex gap-3'>
                      <button
                        onClick={() => handleApprove(s)}
                        className='flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors'
                      >
                        <CheckCircle size={11} /> Apply
                      </button>
                      <button
                        onClick={() => handleDismiss(s)}
                        className='flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-slate-400 transition-colors'
                      >
                        <XCircle size={11} /> Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────
function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className='text-center py-6 rounded-2xl bg-white/2 border border-white/5'>
      <Icon size={18} className='text-slate-700 mx-auto mb-2' />
      <p className='text-xs text-slate-600 leading-relaxed px-4'>{text}</p>
    </div>
  );
}
