/**
 * Replay Timeline Component
 * Allows users to scrub through game history after the game ends
 */

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SkipBack, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';

interface ReplayTimelineProps {
  moves: string[];
  currentMoveIndex: number;
  onSeek: (index: number) => void;
}

export const ReplayTimeline = ({ moves, currentMoveIndex, onSeek }: ReplayTimelineProps) => {
  if (moves.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 border border-white/10"
    >
      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onSeek(0)}
          disabled={currentMoveIndex === 0}
          className="bg-slate-800 border-slate-700"
        >
          <SkipBack className="w-4 h-4" />
        </Button>
        
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onSeek(Math.max(0, currentMoveIndex - 1))}
          disabled={currentMoveIndex === 0}
          className="bg-slate-800 border-slate-700"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <span className="text-sm font-mono text-slate-400 min-w-[80px] text-center">
          Move {currentMoveIndex + 1} / {moves.length}
        </span>
        
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onSeek(Math.min(moves.length - 1, currentMoveIndex + 1))}
          disabled={currentMoveIndex === moves.length - 1}
          className="bg-slate-800 border-slate-700"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onSeek(moves.length - 1)}
          disabled={currentMoveIndex === moves.length - 1}
          className="bg-slate-800 border-slate-700"
        >
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Scrubber */}
      <input
        type="range"
        min="0"
        max={moves.length - 1}
        value={currentMoveIndex}
        onChange={(e) => onSeek(parseInt(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      
      {/* Move List */}
      <div className="mt-3 max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        <div className="flex flex-wrap gap-1">
          {moves.map((move, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "px-2 py-1 rounded text-xs font-mono transition-all",
                i === currentMoveIndex 
                  ? "bg-blue-600 text-white shadow-lg" 
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
              )}
              onClick={() => onSeek(i)}
            >
              {Math.floor(i / 2) + 1}{i % 2 === 0 ? '.' : '...'} {move}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
