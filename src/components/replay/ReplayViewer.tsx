/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useState, useEffect, useRef } from 'react';
import { GameReplay, ReplayService } from '@/services/ReplayService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard'; // Assuming installed or mapped

// Simple visualizer for now. Ideally should reuse specific game components passing 'boardState' prop.
// For MVP, we specifically handle Chess as it's the flagship.

interface ReplayViewerProps {
  replayId?: string;
  replayData?: GameReplay;
  onClose?: () => void;
}

export const ReplayViewer = ({ replayId, replayData, onClose }: ReplayViewerProps) => {
  const [replay, setReplay] = useState<GameReplay | null>(replayData || null);
  const [loading, setLoading] = useState(!replayData);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1); // -1 = Start
  const [boardFen, setBoardFen] = useState('start');
  const [isPlaying, setIsPlaying] = useState(false);

  // Chess Logic
  const chessRef = useRef(new Chess());

  useEffect(() => {
    if (replayId && !replayData) {
      ReplayService.getReplay(replayId).then((data) => {
        setReplay(data);
        setLoading(false);
      });
    }
  }, [replayId, replayData]);

  // Derived State: Calculate Board based on Current Move Index
  useEffect(() => {
    if (!replay || replay.game_type !== 'chess') return;

    const chess = new Chess();
    // Determine how many moves to play
    // moves array assumed to be SAN strings or { from, to } objects
    // If they are objects, we might need logic. Assuming SAN for simplicity or standardized format.

    for (let i = 0; i <= currentMoveIndex; i++) {
      const move = replay.moves[i];
      try {
        if (typeof move === 'string') chess.move(move);
        else if (move.san) chess.move(move.san);
        else chess.move(move); // Try raw object
      } catch (e) {
        console.error('Invalid move in replay:', move);
      }
    }
    setBoardFen(chess.fen());
    chessRef.current = chess;
  }, [currentMoveIndex, replay]);

  // Auto Play
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && replay) {
      interval = setInterval(() => {
        setCurrentMoveIndex((prev) => {
          if (prev >= replay.moves.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, replay]);

  if (loading) return <div className='text-white p-4'>Loading Replay...</div>;
  if (!replay) return <div className='text-red-400 p-4'>Replay not found.</div>;

  const totalMoves = replay.moves.length;

  return (
    <div className='flex flex-col items-center bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-2xl mx-auto'>
      <h2 className='text-2xl font-bold text-white mb-2'>
        Replay: {replay.game_type.toUpperCase()}
      </h2>
      <div className='flex justify-between w-full text-slate-400 text-sm mb-4'>
        <span>
          {replay.players.white?.name || 'Player 1'} vs {replay.players.black?.name || 'Player 2'}
        </span>
        <span>{new Date(replay.created_at).toLocaleDateString()}</span>
      </div>

      {/* Game Board Area */}
      <div className='w-full max-w-md aspect-square bg-slate-800 rounded-lg mb-6 flex items-center justify-center relative'>
        {replay.game_type === 'chess' ? (
          <Chessboard position={boardFen} arePiecesDraggable={false} />
        ) : (
          <div className='text-slate-500'>
            Visual replay only available for Chess currently.
            <br />
            Move {currentMoveIndex + 1} / {totalMoves}:<br />
            <span className='text-white font-mono text-xl'>
              {JSON.stringify(replay.moves[currentMoveIndex] || 'Start')}
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className='flex gap-4 items-center mb-4'>
        <Button
          variant='outline'
          size='icon'
          onClick={() => setCurrentMoveIndex(-1)}
          disabled={currentMoveIndex < 0}
        >
          <SkipBack className='w-4 h-4' />
        </Button>
        <Button
          variant='outline'
          size='icon'
          onClick={() => setCurrentMoveIndex((p) => Math.max(-1, p - 1))}
          disabled={currentMoveIndex < 0}
        >
          <ChevronLeft className='w-4 h-4' />
        </Button>

        <Button
          onClick={() => setIsPlaying(!isPlaying)}
          className={isPlaying ? 'bg-amber-600' : 'bg-green-600'}
        >
          {isPlaying ? <Pause className='w-4 h-4' /> : <Play className='w-4 h-4' />}
        </Button>

        <Button
          variant='outline'
          size='icon'
          onClick={() => setCurrentMoveIndex((p) => Math.min(totalMoves - 1, p + 1))}
          disabled={currentMoveIndex >= totalMoves - 1}
        >
          <ChevronRight className='w-4 h-4' />
        </Button>
        <Button
          variant='outline'
          size='icon'
          onClick={() => setCurrentMoveIndex(totalMoves - 1)}
          disabled={currentMoveIndex >= totalMoves - 1}
        >
          <SkipForward className='w-4 h-4' />
        </Button>
      </div>

      {/* Move List / Timeline */}
      <div className='w-full h-32 overflow-y-auto bg-slate-800 rounded p-2 text-xs font-mono text-slate-300'>
        {replay.moves.map((m, i) => (
          <span
            key={i}
            className={`inline-block mr-2 p-1 cursor-pointer hover:bg-slate-700 rounded ${i === currentMoveIndex ? 'bg-indigo-600 text-white' : ''}`}
            onClick={() => {
              setIsPlaying(false);
              setCurrentMoveIndex(i);
            }}
          >
            {formatMove(m, i)}
          </span>
        ))}
      </div>

      {onClose && (
        <Button variant='ghost' className='mt-4' onClick={onClose}>
          Close Replay
        </Button>
      )}
    </div>
  );
};

function formatMove(move: any, index: number): string {
  const moveStr = typeof move === 'string' ? move : move.san || JSON.stringify(move);
  return `${index + 1}. ${moveStr}`;
}
