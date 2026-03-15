export type User = {
  id: string;
  name: string;
  photoUrl?: string | null;
  gender?: string;
  isAway?: boolean;
  joinedAt?: Date;
  isHost?: boolean;
  isSuperHost?: boolean;
  isCoHost?: boolean;
  status?: 'online' | 'away';
  isMuted?: boolean;
  isVideoOn?: boolean;
  isGuest?: boolean;
};

export type Message = {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  pending?: boolean;
};

export type FileData = {
  id: string;
  userId: string;
  userName: string;
  name: string;
  type: string;
  size: number;
  url?: string; // Optional: for server-uploaded files
  content?: string; // Optional: for base64 inline files
  timestamp: Date;
};

export type RoomStatus = 'upcoming' | 'live' | 'paused' | 'ended';

export type RoomInfo = {
  id: string;
  name: string;
  organizationName?: string;
  createdAt: Date;
  userCount: number;
  requiresPassword: boolean;
  hasWaitingRoom?: boolean;
  status?: RoomStatus;
  // Metadata for filtering
  mode?: string;
  interests?: string[];
  commType?: string;
  securityLevel?: string;
};

export type RoomJoinedData = {
  roomId: string;
  name: string;
  organizationName?: string;
  status?: RoomStatus;
  chatMessages: Message[]; // Assuming ChatMessage is the same as Message type, or needs to be defined. Using Message for now.
  users: User[];
  messages: Message[];
  files: FileData[];
  isHost: boolean;
  isSuperHost: boolean;
  isGhost?: boolean;
  hasWaitingRoom: boolean;
  waitingUsers: User[];
  accessType: 'public' | 'password' | 'invite' | 'organization';
  inviteToken: string | null;
  youtubeVideoId: string | null;
  youtubeStatus: 'playing' | 'paused' | 'closed';
  youtubeCurrentTime: number;
  youtubeLastActionTime: number;
  youtubePresenterName: string | null;
  gameState?: GameState;
  virtualBrowserUrl?: string | null;
  isVirtualBrowserActive?: boolean;
  presentedFile?: FileData | null;
  isPresentingFile?: boolean;
  presenterName?: string | null;
  roomMode?: 'fun' | 'professional' | 'ultra' | 'mixed';
  mode?: 'fun' | 'professional' | 'ultra' | 'mixed'; // Fallback
  settings?: Record<string, unknown>; // Fallback
  activeTimer?: TimerData | null;
  createdAt?: Date | string;
  isLocked?: boolean;
};

export type SfuNewProducerData = {
  producerId: string;
  socketId: string;
  userId: string;
  kind: string;
};

export interface GamePlayer {
  id: string;
  name: string;
  role?: string;
  rank?: number | null;
  color?: string; // Ludo, Chess
  tokens?: number[]; // Ludo tokens (0-57)
  pos?: number; // SnakeLadder
  symbol?: string; // Tic Tac Toe
  photoUrl?: string; // Uno/General
}

export interface Room {
  id: string;
  description?: string;
}

export interface GameState {
  isActive: boolean;
  startGame: (
    type:
      | 'xoxo'
      | 'ultimate-xoxo'
      | 'chess'
      | 'chess-puzzle'
      | 'ludo'
      | 'snakeladder'
      | 'connect4'
      | 'checkers'
      | 'battleship'
      | 'carrom'
      | 'uno'
      | 'billiards'
      | 'wordbattle'
      | 'kart-racing',
    players: string[],
    config?: Record<string, unknown>
  ) => void;
  type:
    | 'xoxo'
    | 'ultimate-xoxo'
    | 'chess'
    | 'chess-puzzle'
    | 'ludo'
    | 'snakeladder'
    | 'connect4'
    | 'checkers'
    | 'battleship'
    | 'uno'
    | 'billiards'
    | 'wordbattle'
    | 'carrom'
    | 'kart-racing'
    | null;
  players: GamePlayer[];
  turn: string | null; // userId
  board: unknown;
  winner: string | null; // userId or 'draw'
  lastMove?: unknown;
  lastAction?: { type: string; playerId: string; [key: string]: unknown };
  turnStartTime?: number;

  // Ludo v2.0 Spec
  version?: number;
  hostId?: string;
  secondaryHostId?: string;
  currentTurn?: string;
  turnDeadlineTs?: number;
  diceValue?: number;
  diceRolled?: boolean;
  consecutiveSixes?: number;
  tokens?: Record<string, number[]>;
  moveHistory?: unknown[];
  seq?: number;
  lastSnapshotSeq?: number;
  // SnakeLadder specific
  phase?: 'ROLL' | 'MOVE';

  // Core properties shared with GameEngine.interface
  id?: string;
  status?: 'waiting' | 'active' | 'paused' | 'finished';
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
  timeouts?: Record<string, number>;
}

export type AssistantResponse = {
  content: string;
  type: 'text' | 'action';
  action?: string;
  [key: string]: unknown;
};

export type TimerType = 'end_room' | 'break' | 'task' | 'presentation' | 'custom';
export type TimerAction = 'none' | 'close' | 'resume' | 'notify';

export type TimerData = {
  duration: number;
  startedAt: number;
  label: string;
  type?: TimerType;
  action?: TimerAction;
  isPaused?: boolean;
  pausedAt?: number;
};

export type PollData = {
  id: string;
  question: string;
  options: string[];
  totalVotes: number;
  expiresAt: number;
  results?: Record<string, number>;
  onlySelectOption?: boolean;
  voters?: Record<string, { id: string; name: string }[]>;
  duration?: number;
  type?: 'POLL' | 'QUIZ';
  correctOption?: number;
};

export type LateJoinSummaryData = {
  summary: string;
  bullets: string[];
  duration: number;
};

export type TranscriptData = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: Date;
  isFinal: boolean;
};

export type MeetingSummary = {
  content: string;
  bullets: string[];
  actionItems: string[];
  sentiment: string;
  topics: string[];
  timestamp: Date;
};
