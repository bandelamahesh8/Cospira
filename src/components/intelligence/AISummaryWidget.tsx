import { motion } from 'framer-motion';
import { Brain, Sparkles } from 'lucide-react';

interface AISummaryWidgetProps {
  summary?: string[];
}

export const AISummaryWidget = ({ summary }: AISummaryWidgetProps) => {
  const defaultSummary = [
    'Meeting highlights ready',
    'Key decisions tracked',
    'No risks detected',
  ];

  const displaySummary = summary || defaultSummary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group"
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-cyan-500/5 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Widget Content */}
      <div className="relative bg-white/5 border border-white/10 rounded-2xl p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-cyan-400" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            AI Summary
          </h3>
        </div>

        {/* Summary Items */}
        <div className="space-y-2">
          {displaySummary.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-2"
            >
              <Sparkles className="w-3 h-3 text-cyan-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-white/70 leading-relaxed">{item}</p>
            </motion.div>
          ))}
        </div>

        {/* View More Button */}
        <button className="w-full mt-4 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-xs font-bold text-cyan-400 transition-colors">
          View Full Analysis
        </button>
      </div>
    </motion.div>
  );
};
