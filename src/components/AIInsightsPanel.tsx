import React, { useState, useCallback } from 'react';
import {
  AlertTriangle,
  TrendingDown,
  Users,
  FileText,
  Zap,
  ChevronDown,
  ChevronUp,
  Bot,
  X,
  WifiOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIInsight } from '@/types/organization';

interface AIInsightsPanelProps {
  orgId: string;
  liveInsights: AIInsight[];
  aiEnabled: boolean;
  onKillAI: () => void;
  onEnableAI: () => void;
}

const INSIGHT_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string; border: string; label: string; group: string }
> = {
  RISK_ALERT: {
    icon: <AlertTriangle size={14} />,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    label: 'Risk Alert',
    group: 'risk',
  },
  MODERATION_FLAG: {
    icon: <AlertTriangle size={14} />,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    label: 'Moderation Flag',
    group: 'risk',
  },
  FRICTION_SIGNAL: {
    icon: <Zap size={14} />,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    label: 'Friction Signal',
    group: 'governance',
  },
  POLICY_DRIFT: {
    icon: <Zap size={14} />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    label: 'Policy Drift',
    group: 'governance',
  },
  ENGAGEMENT_ALERT: {
    icon: <TrendingDown size={14} />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    label: 'Engagement',
    group: 'engagement',
  },
  ASSIGNMENT_SUGGESTION: {
    icon: <Users size={14} />,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    label: 'Assignment Tip',
    group: 'engagement',
  },
  HOST_BRIEF: {
    icon: <Bot size={14} />,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    label: 'Host Brief',
    group: 'engagement',
  },
  SESSION_SUMMARY: {
    icon: <FileText size={14} />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    label: 'Session Summary',
    group: 'governance',
  },
  POST_MORTEM: {
    icon: <FileText size={14} />,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    label: 'Post-Mortem',
    group: 'governance',
  },
  GOVERNANCE_EXPLAIN: {
    icon: <FileText size={14} />,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    label: 'Governance',
    group: 'governance',
  },
  CAPACITY_ALERT: {
    icon: <AlertTriangle size={14} />,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    label: 'Capacity',
    group: 'risk',
  },
};

function InsightCard({ insight }: { insight: AIInsight }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = INSIGHT_CONFIG[insight.type] ?? {
    icon: <Bot size={14} />,
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
    label: insight.type,
    group: 'other',
  };
  const content = insight.content as unknown as {
    explanation?: string;
    insight?: string;
    recommendation?: string;
    suggested_actions?: string[];
  };
  const confidencePct = insight.confidence ? Math.round(insight.confidence * 100) : null;

  return (
    <div
      className={`mb-3 rounded-2xl border ${cfg.border} ${cfg.bg} overflow-hidden transition-all group hover:bg-opacity-20`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className='w-full flex items-center gap-3 px-4 py-3 text-left focus:outline-none'
      >
        <span className={cfg.color}>{cfg.icon}</span>
        <span className='flex-1 text-[11px] font-black uppercase tracking-widest text-white/90'>
          {cfg.label}
        </span>
        {confidencePct && (
          <span className='text-[9px] font-mono text-white/30'>{confidencePct}% ACCURACY</span>
        )}
        <span className='text-white/20 transition-transform duration-300'>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className='px-4 pb-4 overflow-hidden'
          >
            <div className='space-y-3 pt-1'>
              {content.explanation && (
                <p className='text-[11px] text-white/60 leading-relaxed italic'>
                  {content.explanation}
                </p>
              )}
              {content.insight && (
                <p className='text-[11px] text-white/60 leading-relaxed italic'>
                  {content.insight}
                </p>
              )}
              {content.recommendation && (
                <div className='p-3 rounded-xl bg-white/5 border border-white/5'>
                  <span className='text-[9px] font-black uppercase tracking-widest text-indigo-400 block mb-1'>
                    Recommendation
                  </span>
                  <p className='text-[11px] text-indigo-100/80 italic'>
                    💡 {content.recommendation}
                  </p>
                </div>
              )}

              {Array.isArray(content.suggested_actions) && content.suggested_actions.length > 0 && (
                <div className='space-y-1.5'>
                  <span className='text-[9px] font-black uppercase tracking-widest text-white/20'>
                    Protocol Suggestions
                  </span>
                  <ul className='space-y-1 pl-1'>
                    {(content.suggested_actions as string[]).map((a, i) => (
                      <li key={i} className='text-[10px] text-white/40 flex items-center gap-2'>
                        <div className='w-1 h-1 rounded-full bg-indigo-500/40' />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className='flex items-center justify-between pt-2 border-t border-white/5'>
                <span className='text-[8px] font-mono text-white/10'>
                  {new Date(insight.created_at).toLocaleTimeString()}
                </span>
                <span className='text-[8px] font-mono text-white/10 uppercase tracking-widest'>
                  {insight.mode} PROTOCOL
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AIInsightsPanel({
  orgId: _orgId,
  liveInsights,
  aiEnabled,
  onKillAI,
  onEnableAI,
}: AIInsightsPanelProps) {
  const [filter, setFilter] = useState<'all' | 'risk' | 'engagement' | 'governance'>('all');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = liveInsights
    .filter((i) => !dismissed.has(i.id))
    .filter((i) => {
      if (filter === 'all') return true;
      return (INSIGHT_CONFIG[i.type]?.group ?? 'other') === filter;
    })
    .slice(0, 50);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  }, []);

  const riskCount = liveInsights.filter(
    (i) => INSIGHT_CONFIG[i.type]?.group === 'risk' && !dismissed.has(i.id)
  ).length;

  return (
    <div className='glass-card-heavy rounded-[32px] p-6 max-h-[600px] flex flex-col border-indigo-500/10'>
      <div className='flex items-center gap-4 mb-6'>
        <div className='w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20'>
          <Bot size={20} />
        </div>
        <div className='flex-1'>
          <h2 className='text-xl font-black uppercase tracking-tighter text-white italic'>
            Neural Readout
          </h2>
          <p className='text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold'>
            Advisory Stream · {aiEnabled ? 'Synchronized' : 'Offline'}
          </p>
        </div>

        {riskCount > 0 && (
          <div className='px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full animate-pulse'>
            <span className='text-[9px] font-black text-red-400 uppercase tracking-widest'>
              {riskCount} Anomalies
            </span>
          </div>
        )}

        <button
          onClick={aiEnabled ? onKillAI : onEnableAI}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
            aiEnabled
              ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
          }`}
        >
          {aiEnabled ? 'Terminate Link' : 'Initialize Link'}
        </button>
      </div>

      <div className='flex gap-2 mb-6'>
        {(['all', 'risk', 'engagement', 'governance'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 h-8 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              filter === f
                ? 'bg-white/10 text-white border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                : 'bg-transparent text-white/30 border-white/5 hover:border-white/10 hover:text-white/50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className='flex-1 overflow-y-auto no-scrollbar space-y-4'>
        {!aiEnabled ? (
          <div className='flex flex-col items-center justify-center py-20 text-center'>
            <div className='w-16 h-16 rounded-full bg-red-500/5 flex items-center justify-center text-red-500/20 mb-4 border border-red-500/10'>
              <WifiOff size={32} />
            </div>
            <p className='text-[10px] font-black text-white/20 uppercase tracking-[0.3em]'>
              AI Core Offline
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-20 text-center'>
            <div className='w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/10 mb-4 border border-white/5'>
              <Bot size={32} />
            </div>
            <p className='text-[10px] font-black text-white/20 uppercase tracking-[0.3em]'>
              Observing Environment
            </p>
          </div>
        ) : (
          <AnimatePresence mode='popLayout'>
            {visible.map((insight) => (
              <motion.div
                key={insight.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className='relative'
              >
                <button
                  onClick={() => dismiss(insight.id)}
                  className='absolute top-3 right-10 z-10 p-1 text-white/10 hover:text-white transition-all'
                >
                  <X size={10} />
                </button>
                <InsightCard insight={insight} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className='mt-6 text-center'>
        <p className='text-[8px] font-black uppercase tracking-[0.4em] text-white/10 italic'>
          Neural Protocol Advisory Unit
        </p>
      </div>
    </div>
  );
}
