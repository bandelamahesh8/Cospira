/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import type { ResultPayload } from '@/types/kart';

type SessionState =
  | 'idle'
  | 'creating_session'
  | 'waiting_for_players'
  | 'launching'
  | 'in_race'
  | 'results';

export function useKartSession() {
  const [state, setState] = useState<SessionState>('idle');
  const [joinCode, setJoinCode] = useState<string>('');
  const [results, setResults] = useState<ResultPayload[]>([]);
  const [expectedPlayers, setExpectedPlayers] = useState(1);

  const startRace = async (roomId: string, trackId: string, maxPlayers: number, players: any[]) => {
    setExpectedPlayers(players.length);
    setState('creating_session');
    // Call API
    const response = await fetch('/api/game/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, game: 'kart-race', trackId, maxPlayers, players }),
    });
    const data = await response.json();
    setJoinCode(data.joinCode);
    setState('waiting_for_players');
  };

  const launchGame = () => {
    setState('launching');
    // After COSPIRA_READY, set to 'in_race'
  };

  const handleResult = (result: ResultPayload) => {
    setResults((prev) => [...prev, result]);
    if (results.length + 1 >= expectedPlayers) {
      setState('results');
    }
  };

  const exitGame = () => {
    setState('idle');
    setResults([]);
  };

  return { state, joinCode, results, startRace, launchGame, handleResult, exitGame };
}
