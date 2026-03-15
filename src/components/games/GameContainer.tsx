import { useWebSocket } from '@/hooks/useWebSocket';
import { TicTacToe } from './TicTacToe';
import { ChessGame } from './ChessGame';
import { SnakeLadderGame } from './SnakeLadderGame';
import { UltimateTicTacToe } from './UltimateTicTacToe';
// import { BattleshipGame } from './BattleshipGame';
import { UnoGame } from './UnoGame';
import { ConnectFourGame } from './ConnectFourGame';
import { CheckersGame } from './CheckersGame';
import { BilliardsGame } from './BilliardsGame';
import { WordBattleGame } from './WordBattleGame';
import { LudoGame } from './ludo/LudoGame';
import { CarromGame } from './CarromGame';
import { KartGame } from './KartGame';

export const GameContainer = () => {
  const { gameState, roomId } = useWebSocket();

  if (!gameState || !roomId) return null;

  switch (gameState.type) {
    case 'chess':
    case 'chess-puzzle':
      return <ChessGame />;
    case 'xoxo':
      return <TicTacToe />;
    case 'ultimate-xoxo':
      return <UltimateTicTacToe />;
    case 'snakeladder':
      return <SnakeLadderGame />;
    case 'ludo':
      return <LudoGame />;
    case 'connect4':
      return <ConnectFourGame />;
    case 'checkers':
      return <CheckersGame />;
    // case 'battleship':
    //   return <BattleshipGame />;
    case 'uno':
      return <UnoGame />;
    case 'billiards':
      return <BilliardsGame />;
    case 'wordbattle':
      return <WordBattleGame />;
    case 'carrom':
      return <CarromGame />;
    case 'kart-racing':
      return <KartGame />;
    default:
      return <div className='text-white'>Unknown Game Type</div>;
  }
};
