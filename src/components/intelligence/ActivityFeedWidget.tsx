import { motion } from 'framer-motion';
import { Activity, User, Shield, Brain } from 'lucide-react';

interface ActivityItem {
  type: 'user' | 'security' | 'ai' | 'system';
  message: string;
  timestamp: string;
}

interface ActivityFeedWidgetProps {
  activities?: ActivityItem[];
}

export const ActivityFeedWidget = ({ activities }: ActivityFeedWidgetProps) => {
  const defaultActivities: ActivityItem[] = [
    { type: 'user', message: 'Mahesh joined Room X', timestamp: '2m ago' },
    { type: 'ai', message: 'AI summary generated', timestamp: '5m ago' },
    { type: 'security', message: 'Security scan complete', timestamp: '10m ago' },
  ];

  const displayActivities = activities || defaultActivities;

  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'user':
        return { icon: User, color: '#00c2ff' };
      case 'security':
        return { icon: Shield, color: '#10b981' };
      case 'ai':
        return { icon: Brain, color: '#7c3aed' };
      default:
        return { icon: Activity, color: '#ffffff' };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="relative group"
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-purple-500/5 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Widget Content */}
      <div className="relative bg-white/5 border border-white/10 rounded-2xl p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            Activity
          </h3>
        </div>

        {/* Activity Items */}
        <div className="space-y-3">
          {displayActivities.map((activity, index) => {
            const { icon: Icon, color } = getIcon(activity.type);

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3"
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <Icon className="w-3 h-3" style={{ color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/70 leading-relaxed">
                    {activity.message}
                  </p>
                  <p className="text-[10px] text-white/40 mt-0.5">
                    {activity.timestamp}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* View All Button */}
        <button className="w-full mt-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/60 hover:text-white/80 transition-colors">
          View All Activity
        </button>
      </div>
    </motion.div>
  );
};
