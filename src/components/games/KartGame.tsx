import { useKartSession } from '@/hooks/useKartSession';
import { KartGameFrame } from '../game/KartGameFrame';
import { KartLauncherPanel } from '../game/KartLauncherPanel';
import { KartResultsOverlay } from '../game/KartResultsOverlay';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';

export const KartGame = () => {
  const { state, joinCode, results, startRace, handleResult, exitGame } = useKartSession();
  const { gameState, roomId, users } = useWebSocket();
  const { user } = useAuth();

  const isHost = gameState?.hostId === user?.id;

  // Map room users to KartLauncherPanel players
  const launcherPlayers = users.map((p) => ({
    userId: p.id,
    username: p.name,
    ready: true,
  }));

  const onStartRace = () => {
    if (roomId) {
      startRace(roomId, 'track_01', 6, launcherPlayers);
    }
  };

  if (state === 'idle' || state === 'creating_session' || state === 'waiting_for_players') {
    return (
      <KartLauncherPanel onStartRace={onStartRace} players={launcherPlayers} isHost={isHost} />
    );
  }

  if (state === 'launching' || state === 'in_race') {
    return (
      <KartGameFrame
        joinCode={joinCode}
        isHost={isHost}
        player={{
          userId: user?.id || '',
          username: user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Player',
          avatarUrl: user?.user_metadata?.avatar_url || user?.user_metadata?.photo_url || '',
        }}
        onResult={handleResult}
        onExit={exitGame}
      />
    );
  }

  if (state === 'results') {
    return <KartResultsOverlay results={results} onDismiss={exitGame} />;
  }

  return null;
};
export default KartGame;
