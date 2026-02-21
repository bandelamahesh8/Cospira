import { motion } from 'framer-motion';
import { Shield, Check, AlertTriangle } from 'lucide-react';

interface SecurityStatusWidgetProps {
  level?: 'low' | 'medium' | 'high';
  threats?: number;
  encryption?: boolean;
}

export const SecurityStatusWidget = ({
  level = 'medium',
  threats = 0,
  encryption = true,
}: SecurityStatusWidgetProps) => {
  const levelConfig = {
    low: { color: '#fbbf24', label: 'Low', icon: AlertTriangle },
    medium: { color: '#10b981', label: 'Medium', icon: Check },
    high: { color: '#ef4444', label: 'High', icon: Shield },
  };

  const config = levelConfig[level];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative group"
    >
      {/* Glow Effect */}
      <div
        className="absolute inset-0 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: `${config.color}20` }}
      />

      {/* Widget Content */}
      <div className="relative bg-white/5 border border-white/10 rounded-2xl p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${config.color}30` }}
          >
            <Icon className="w-4 h-4" style={{ color: config.color }} />
          </div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            Security
          </h3>
        </div>

        {/* Status Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Level</span>
            <span
              className="text-xs font-bold"
              style={{ color: config.color }}
            >
              {config.label}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Encryption</span>
            <span className="text-xs font-bold text-emerald-400">
              {encryption ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Threats</span>
            <span
              className={`text-xs font-bold ${
                threats > 0 ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {threats}
            </span>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: level === 'high' ? '90%' : level === 'medium' ? '60%' : '30%' }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="h-full rounded-full"
            style={{ backgroundColor: config.color }}
          />
        </div>
      </div>
    </motion.div>
  );
};
