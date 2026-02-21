













import { motion } from 'framer-motion';
import { Clock, Users, FileText, Gamepad2, Globe, Youtube, Monitor, ArrowUpRight, Zap } from 'lucide-react';
import { Activity } from '@/types/activity';
import { formatActivityTimestamp } from '@/utils/activityHelpers';
import { Button } from '@/components/ui/button';

interface ActivityCardProps {
  activity: Activity;
  isLatest?: boolean;
  onResumeRoom?: (roomId: string) => void;
}

export const ActivityCard = ({ activity, isLatest, onResumeRoom }: ActivityCardProps) => {
  const getIcon = () => {
    switch (activity.type) {
      case 'room':
      case 'session-group':
        return <Users className="w-4 h-4" />;
      case 'presentation':
        return <FileText className="w-4 h-4" />;
      case 'game':
        return <Gamepad2 className="w-4 h-4" />;
      case 'browser':
        return <Globe className="w-4 h-4" />;
      case 'youtube':
        return <Youtube className="w-4 h-4" />;
      case 'screen':
        return <Monitor className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const renderCardContent = () => {
    switch (activity.type) {
      case 'session-group':
        return (
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">{activity.title}</h3>
            </div>
            <ul className="space-y-2 ml-1 border-l border-white/5 pl-3">
              {activity.activities.map((act, index) => (
                <li key={index} className="text-[11px] text-white/50 flex items-start gap-2">
                  <span className="text-indigo-400 mt-1 text-[8px]">●</span>
                  <span>{act}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-4 pt-2">
              <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5">
                <Clock className="w-3 h-3 text-white/40" />
                <span className="text-[9px] font-mono text-white/60">{activity.duration}m</span>
              </span>
              <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5">
                <Users className="w-3 h-3 text-white/40" />
                <span className="text-[9px] font-mono text-white/60">{activity.participants}</span>
              </span>
            </div>
          </div>
        );

      case 'room':
        return (
          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">{activity.title}</h3>
              <p className="text-[10px] uppercase tracking-widest text-indigo-400/80 font-bold">{activity.subtitle}</p>
            </div>
            <p className="text-xs text-white/40 font-medium">{activity.action}</p>
            <div className="flex items-center gap-3 pt-1">
              <span className="text-[10px] font-mono text-white/30">{formatActivityTimestamp(activity.timestamp)}</span>
              {(typeof activity.duration === 'number' && activity.duration > 0 || typeof activity.duration === 'string') && (
                <span className="flex items-center gap-1 text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                  <Clock className="w-2.5 h-2.5" /> {activity.duration}m
                </span>
              )}
              {activity.participants > 0 && (
                 <span className="flex items-center gap-1 text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                  <Users className="w-2.5 h-2.5" /> {activity.participants}
                </span>
              )}
            </div>
          </div>
        );

      case 'presentation':
        return (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white tracking-wide">{activity.title}</h3>
            <p className="text-xs text-white/40 font-medium">{activity.action}</p>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs text-white/80 truncate font-mono">{activity.fileName}</span>
            </div>
            <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest">{formatActivityTimestamp(activity.timestamp)}</p>
          </div>
        );

      case 'game':
        return (
           <div className="space-y-2">
             <h3 className="text-sm font-bold text-white tracking-wide">{activity.title}</h3>
             <p className="text-xs text-white/40 font-medium">{activity.action}</p>
             <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/5">
               <Gamepad2 className="w-3.5 h-3.5 text-pink-500" />
               <span className="text-xs text-white/80 font-bold uppercase tracking-wider">{activity.gameName}</span>
             </div>
             <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest">{formatActivityTimestamp(activity.timestamp)}</p>
           </div>
        );

      case 'browser':
      case 'youtube':
      case 'screen':
        return (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white tracking-wide">{activity.title}</h3>
            <p className="text-xs text-white/40 font-medium">{activity.action}</p>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/5">
              {getIcon()}
              <span className="text-xs text-white/80 truncate font-mono">{activity.detail}</span>
            </div>
            <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest">{formatActivityTimestamp(activity.timestamp)}</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.01, x: 5 }}
      className="group relative"
    >
      {/* Timeline dot */}
      <div className="absolute -left-[43px] top-6 w-2 h-2 rounded-full border border-white/10 bg-[#0c1016] group-hover:bg-indigo-500 group-hover:border-indigo-500/50 group-hover:shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all z-10" />
      
      {/* Card */}
      <div className="bg-[#0c1016] border border-white/5 rounded-2xl p-5 transition-all duration-300 group-hover:border-indigo-500/30 group-hover:bg-[#0f131a] relative overflow-hidden">
        {isLatest && (
             <div className="absolute top-0 right-0 p-3">
                 <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                     <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Latest</span>
                 </div>
             </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 relative z-10">
            {renderCardContent()}
          </div>
          
          {/* Hover action */}
          {activity.roomId && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 bottom-4">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-400"
                onClick={() => activity.roomId && onResumeRoom?.(activity.roomId)}
              >
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
        
        {/* Resume button for latest session */}
        {isLatest && activity.type === 'session-group' && activity.roomId && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 bg-indigo-500 text-white border-none hover:bg-indigo-600 font-bold uppercase text-[10px] tracking-widest gap-2"
              onClick={() => activity.roomId && onResumeRoom?.(activity.roomId)}
            >
              <Zap className="w-3 h-3 fill-white" /> Resume Session
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
