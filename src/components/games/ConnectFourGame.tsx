import { useEffect, useMemo, useRef, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Users, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Connect4Board, CellValue } from '@/components/Connect4Board';
import { GameResultOverlay } from './ui/GameResultOverlay';
import { WinDetector } from '@/modules/games/connect4/WinDetector';
import { BoardState } from '@/modules/games/connect4/types';
import { Connect4Engine } from '@/modules/games/connect4/Connect4Engine';

const toCellValue = (value: unknown): CellValue => {
  if (value === 'red' || value === 1) return 1;
  if (value === 'yellow' || value === 2) return 2;
  return 0;
};

const buildBoard = (raw: unknown): CellValue[][] => {
  const rows = 6;
  const cols = 7;
  if (!Array.isArray(raw)) {
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0 as CellValue));
  }

  const parsed = (raw as unknown[])
    .slice(0, rows)
    .map((row) =>
      Array.isArray(row)
        ? (row as unknown[]).slice(0, cols).map((cell) => toCellValue(cell))
        : Array.from({ length: cols }, () => 0 as CellValue)
    );

  if (parsed.length < rows) {
    return [
      ...Array.from({ length: rows - parsed.length }, () => Array.from({ length: cols }, () => 0 as CellValue)),
      ...parsed,
    ];
  }

  return parsed;
};

export const ConnectFourGame = () => {
  const { gameState, users, makeGameMove, startGame, endGame, isHost, socket, roomId } = useWebSocket();
  const { user } = useAuth();

  const gameData = useMemo(
    () => (gameState && gameState.type === 'connect4' ? gameState : null),
    [gameState]
  );

  // Robustly resolve player objects from the room users list
  const players = useMemo(() => {
    const rawPlayers = gameData?.players || [];
    if (rawPlayers.length === 0) return [];
    
    return rawPlayers.map(p => {
        // Handle both string IDs and player objects
        const id = typeof p === 'string' ? p : p.id;
        const found = users.find(u => u.id === id);
        if (found) return found;
        
        // Return dummy object if not found in room users
        return typeof p === 'string' ? { id: p, name: 'Player' } : p;
    });
  }, [gameData?.players, users]);

  const playerIndex = useMemo(
    () => players.findIndex((p) => p.id === user?.id),
    [players, user?.id]
  );
  const isSpectator = playerIndex === -1;

  const boardMatrix = useMemo(() => buildBoard(gameData?.board), [gameData?.board]);

  const lastMoveRef = useRef<{ row: number; col: number } | null>(null);
  const engineRef = useRef<Connect4Engine | null>(null);

  // PHASE 7: Host Authoritative Model - Engine Initialization
  useEffect(() => {
    // SECURITY: Only initialize if we have exactly 2 players as required by the engine
    if (isHost && gameData && !engineRef.current && players.length === 2) {
        // Initialize engine with current state for host
        const initialState: Partial<BoardState> = {
            grid: boardMatrix,
            currentPlayer: (gameData.turn === players[0]?.id ? 1 : 2) as 1 | 2,
            status: (gameData.winner ? (gameData.winner === 'draw' ? 'draw' : 'won') : 'active') as BoardState['status'],
            winner: (gameData.winner === 'draw' ? null : (gameData.winner === players[0]?.id ? 1 : 2)) as 1 | 2 | null,
            moveCount: boardMatrix.flat().filter(v => v !== 0).length
        };
        engineRef.current = new Connect4Engine(initialState);
        engineRef.current.initialize({ players: players.map(p => p.id) });
    }
  }, [isHost, gameData, players, boardMatrix]);

  // PHASE 7: Host Authoritative Model - Action Listener
  useEffect(() => {
    if (!isHost || !socket) return;

    const handleActionRequest = (data: { game: string; action: string; payload?: Record<string, unknown>; move?: Record<string, unknown>; senderId: string }) => {
        if (data.game !== 'connect4') return;
        const action = data.action || data.move?.type || '';
        const payload = data.payload || data.move || {};
        
        if (action !== 'MOVE' && action !== 'drop') return;
        if (!engineRef.current) {
            console.warn('[Connect4Host] Engine not initialized, ignoring move');
            return;
        }

        const move = {
            type: 'drop' as const,
            playerId: data.senderId,
            column: payload.col ?? payload.column
        };

        try {
            const nextState = engineRef.current.applyMove(move);
            
            // Broadcast new state back to everyone via the generic state update handler
            socket.emit('game-ludo-state-update', {
                roomId,
                newState: {
                    ...gameData,
                    board: nextState.grid,
                    turn: nextState.currentPlayer === 1 ? players[0]?.id : (players[1]?.id || players[0]?.id),
                    currentTurn: nextState.currentPlayer === 1 ? players[0]?.id : (players[1]?.id || players[0]?.id),
                    winner: nextState.status === 'won' ? (nextState.winner === 1 ? players[0]?.id : (players[1]?.id || players[0]?.id)) : (nextState.status === 'draw' ? 'draw' : null),
                    isActive: nextState.status === 'active',
                    players: players // Crucial: preserve player data
                }
            });
        } catch (err) {
            console.error('[Connect4Host] Move application failed:', err);
        }
    };

    socket.on('game-action-request', handleActionRequest);
    return () => {
        socket.off('game-action-request', handleActionRequest);
    };
  }, [isHost, socket, roomId, players, gameData]);

  const currentPlayerId = gameData?.turn ?? null;
  const currentPlayerNumber = useMemo(() => {
    if (!currentPlayerId) return 1;
    if (players[0]?.id === currentPlayerId) return 1;
    if (players[1]?.id === currentPlayerId) return 2;
    return 1;
  }, [currentPlayerId, players]);

  const winnerId = gameData?.winner;
  const winnerNumber = useMemo(() => {
    if (!winnerId || winnerId === 'draw') return null;
    if (players[0]?.id === winnerId) return 1;
    if (players[1]?.id === winnerId) return 2;
    return null;
  }, [winnerId, players]);

  const status: BoardState['status'] = useMemo(() => {
    if (!gameData) return 'waiting';
    if (gameData.winner === 'draw') return 'draw';
    if (gameData.winner) return 'won';
    return gameData.isActive ? 'active' : 'waiting';
  }, [gameData]);

  const boardState: BoardState = useMemo(() => {
    const base: BoardState = {
      rows: 6,
      cols: 7,
      grid: boardMatrix,
      currentPlayer: currentPlayerNumber as 1 | 2,
      status,
      winner: winnerNumber as 1 | 2 | null,
      winningCells: null,
      moveCount: boardMatrix.flat().filter((v) => v !== 0).length,
      lastMove: lastMoveRef.current,
    };

    const win = WinDetector.detectWin(base);
    if (win) {
      return { ...base, winningCells: win.winningCells };
    }

    return base;
  }, [boardMatrix, currentPlayerNumber, status, winnerNumber]);

  const isMyTurn = Boolean(user?.id && currentPlayerId === user.id);

  useEffect(() => {
    if (winnerId && winnerId !== 'draw') {
      confetti({ 
        particleCount: 150, 
        spread: 70, 
        origin: { y: 0.6 },
        colors: winnerId === players[0]?.id ? ['#ef4444', '#f87171'] : ['#fbbf24', '#fcd34d']
      });
    }
  }, [winnerId, players]);

  const handleDrop = useCallback(
    (col: number) => {
      if (!gameData || !user?.id) return;
      if (!gameData.isActive || !isMyTurn || isSpectator) {
          console.warn('[Connect4] Move blocked:', { isActive: gameData.isActive, isMyTurn, isSpectator });
          return;
      }
      if (boardMatrix[0]?.[col] !== 0) return;

      // Phase 7: Clients send Move Requests
      makeGameMove({ 
          game: 'connect4', 
          type: 'drop', 
          col 
      });
    },
    [gameData, isMyTurn, isSpectator, boardMatrix, makeGameMove, user?.id]
  );

  if (!gameData) return null;

  return (
    <Card className='w-full max-w-5xl mx-auto bg-slate-950 border-slate-800 shadow-[0_0_120px_rgba(0,0,0,0.9)] relative overflow-hidden flex flex-col md:flex-row p-4 md:p-8 rounded-[3rem] border-2'>
      <div className='flex-1 flex flex-col items-center justify-center relative z-10'>
        <Connect4Board
          board={boardMatrix}
          currentPlayer={currentPlayerNumber as 1 | 2}
          isMyTurn={isMyTurn}
          winner={winnerNumber as 1 | 2 | null}
          winningCells={boardState.winningCells}
          onDrop={handleDrop}
        />
      </div>

      <div className='w-full md:w-80 flex flex-col gap-6 relative z-10 mt-8 md:mt-0 md:pl-8 border-l border-white/5'>
        <div className='space-y-1'>
          <h1 className='text-3xl font-black text-white italic uppercase leading-none'>
            Connect <span className='text-blue-500'>Four</span>
          </h1>
          <p className='text-[10px] font-black text-slate-500 uppercase tracking-widest'>
            Cospira Game Engine v1.0
          </p>
        </div>

        <div className='p-6 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-md shadow-xl flex flex-col gap-4'>
            <div className='flex items-center justify-between'>
                <p className='text-[10px] font-bold text-slate-400 uppercase tracking-tighter'>Session Players</p>
                <div className='flex items-center gap-1'>
                    <div className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping' />
                    <span className='text-[8px] font-bold text-emerald-400'>LIVE</span>
                </div>
            </div>

            <div className='space-y-3'>
                {players.map((p, idx) => (
                    <div key={p.id} className={cn(
                        'flex items-center gap-3 p-3 rounded-2xl transition-all border',
                        currentPlayerId === p.id ? 'bg-white/10 border-white/20' : 'bg-transparent border-transparent opacity-60'
                    )}>
                        <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center shadow-lg',
                            idx === 0 ? 'bg-red-500' : 'bg-yellow-400'
                        )}>
                            <Users className='w-4 h-4 text-white' />
                        </div>
                        <div className='flex-1'>
                            <p className='text-xs font-black text-white truncate max-w-[100px]'>{p.name}</p>
                            <p className='text-[8px] text-slate-500 font-bold uppercase'>{idx === 0 ? 'Player 1' : 'Player 2'}</p>
                        </div>
                        {currentPlayerId === p.id && (
                            <div className='px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[8px] font-black uppercase'>Turn</div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        <div className='flex-1' />

        <div className='space-y-3'>
            {!gameData.isActive && (isHost || isSpectator) && (
                <Button
                    onClick={() => {
                        if (players.length < 2) return;
                        startGame('connect4', players.map(p => p.id));
                    }}
                    disabled={players.length < 2}
                    className='h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest w-full shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                >
                    Rematch
                </Button>
            )}
            
            <Button
                variant='outline'
                onClick={() => endGame()}
                className='h-12 bg-red-500/10 border-red-500/20 text-red-500 rounded-xl hover:bg-red-500/20 transition-all text-[10px] font-black uppercase tracking-widest w-full'
            >
                <RotateCcw className='w-3 h-3 mr-2' /> {isSpectator ? 'Leave Game' : 'Forfeit'}
            </Button>
        </div>
      </div>

      <GameResultOverlay
        winnerId={winnerId || null}
        players={players}
        localUserId={user?.id || ''}
        isHost={isHost}
        onRematch={() => {
            if (players.length >= 2) {
                startGame('connect4', players.map((p) => p.id));
            }
        }}
        onEndGame={() => endGame()}
        gameType='connect4'
      />
    </Card>
  );
};
