export interface LaunchPayload {
  type: 'COSPIRA_LAUNCH';
  joinCode: string;
  isHost: boolean;
  player: {
    userId: string;
    username: string;
    avatarUrl: string;
    cosmetics?: {
      kartSkin?: string;
      trailEffect?: string;
    };
  };
}

export interface ReadyPayload {
  type: 'COSPIRA_READY';
  ugsPlayerId: string;
}

export interface ResultPayload {
  type: 'COSPIRA_RESULT';
  playerId: string;
  position: number;
  bestLapMs: number;
  totalTimeMs: number;
  checkpointsHit: number;
}

export interface ExitPayload {
  type: 'COSPIRA_EXIT';
}
