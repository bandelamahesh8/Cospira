/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * Game Engine Integration Example
 *
 * This file demonstrates how to use the new game engine framework
 * in your React components.
 */

import { useEffect, useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { usePlayerProfile, useGameStats } from '@/hooks/usePlayerProfile';
import { createGameEngine } from '@/game-engine';
import { playerService } from '@/services/PlayerService';
import { GameType } from '@/types/player';

/**
 * Example: Starting a Chess Game
 */
export function ChessGameExample() {
  const { startGame, activeGame, updateGameState } = useGameStore();
  const { profile } = usePlayerProfile();
  const { stats } = useGameStats('chess');

  const handleStartGame = () => {
    if (!profile) return;

    // Create game engine
    const engine = createGameEngine('chess');

    // Initialize game with players
    const gameState = engine.initGame([
      { id: profile.id, name: profile.username },
      { id: 'opponent-id', name: 'Opponent' },
    ]);

    // Start game in store
    startGame('chess', gameState);
  };

  const handleMakeMove = (move: any) => {
    if (!activeGame) return;

    const engine = createGameEngine('chess');

    // Validate move
    const validation = engine.validateMove(move, activeGame);
    if (!validation.valid) {
      console.error('Invalid move:', validation.reason);
      return;
    }

    // Apply move
    const newState = engine.applyMove(move, activeGame);
    updateGameState(newState);

    // Check for winner
    const winnerCheck = engine.checkWinner(newState);
    if (winnerCheck.finished) {
      handleGameEnd(winnerCheck.winner);
    }
  };

  const handleGameEnd = async (winner: string | 'draw' | null) => {
    if (!profile || !activeGame) return;

    const result = winner === profile.id ? 'win' : winner === 'draw' ? 'draw' : 'loss';
    const opponentElo = 1200; // Get from opponent's stats

    // Update stats
    await playerService.updateGameStats(
      profile.id,
      'chess',
      result,
      opponentElo,
      Math.floor((Date.now() - activeGame.createdAt.getTime()) / 1000)
    );

    // Save match history
    await playerService.saveMatchHistory({
      gameType: 'chess',
      mode: 'casual',
      players: activeGame.players,
      winnerId: winner === 'draw' ? undefined : winner || undefined,
      initialState: activeGame,
      finalState: activeGame,
      moveHistory: activeGame.metadata.moveHistory || [],
      duration: Math.floor((Date.now() - activeGame.createdAt.getTime()) / 1000),
    });
  };

  return (
    <div>
      <h2>Chess Game</h2>
      {stats && (
        <div>
          <p>ELO: {stats.elo}</p>
          <p>Rank: {stats.rank}</p>
          <p>Win Rate: {stats.winRate}%</p>
        </div>
      )}
      <button onClick={handleStartGame}>Start Game</button>
    </div>
  );
}

/**
 * Example: Using Player Profile Hook
 */
export function PlayerProfileExample() {
  const { profile, loading, updateProfile } = usePlayerProfile();

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>No profile found</div>;

  return (
    <div>
      <h2>{profile.username}</h2>
      <p>Level: {profile.level}</p>
      <p>XP: {profile.xp}</p>
      <p>Title: {profile.title}</p>

      <button onClick={() => updateProfile({ bio: 'New bio!' })}>Update Bio</button>
    </div>
  );
}

/**
 * Example: Displaying Leaderboard
 */
export function LeaderboardExample() {
  const [gameType, setGameType] = useState<GameType>('chess');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    async function fetchLeaderboard() {
      const data = await playerService.getLeaderboard(gameType, 10);
      setLeaderboard(data);
    }
    fetchLeaderboard();
  }, [gameType]);

  return (
    <div>
      <h2>Leaderboard - {gameType}</h2>
      <select value={gameType} onChange={(e) => setGameType(e.target.value as GameType)}>
        <option value='chess'>Chess</option>
        <option value='xoxo'>Tic-Tac-Toe</option>
      </select>

      <ol>
        {leaderboard.map((entry, index) => (
          <li key={entry.id}>
            #{index + 1} - {entry.player?.username} - {entry.elo} ELO
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Example: Match History
 */
export function MatchHistoryExample() {
  const [matches, setMatches] = useState<any[]>([]);
  const { profile } = usePlayerProfile();

  useEffect(() => {
    async function fetchHistory() {
      if (!profile) return;
      const history = await playerService.getMatchHistory(profile.id, 5);
      setMatches(history);
    }
    fetchHistory();
  }, [profile]);

  return (
    <div>
      <h2>Recent Matches</h2>
      {matches.map((match) => (
        <div key={match.id}>
          <p>
            {match.gameType} - {match.mode}
          </p>
          <p>Duration: {match.duration}s</p>
          <p>Winner: {match.winnerId || 'Draw'}</p>
        </div>
      ))}
    </div>
  );
}
