import CheckersBoard from './CheckersBoard';
import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Modal } from 'react-native';


import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { authStore } from '../../store/authStore';
import LudoBoard from './LudoBoard';
import ChessBoard from './ChessBoard';
import SnakeLadderBoard from './SnakeLadderBoard';
import { COLORS, BORDER_RADIUS, SHADOWS, SPACING, FONT_WEIGHT, FONT_SIZE } from '../../screens/room/InnerRoomScreen/styles/InnerRoomScreen.styles';

// --- XOXO (Tic-Tac-Toe) Component ---
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const hapticOptions = {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
};

const triggerHaptic = (type = 'impactLight') => {
    ReactNativeHapticFeedback.trigger(type, hapticOptions);
};

// --- XOXO (Tic-Tac-Toe) Component ---
const TicTacToeBoard = ({ gameState, onMove, userId }) => {
  const { board, turn, winner } = gameState;
  const isMyTurn = turn === userId;
  const myPlayer = gameState.players?.find(p => p.id === userId);
  
  // Handle 1D (Array(9)) or 2D (Array(3)[3]) board data safely
  const safeBoard = React.useMemo(() => {
    const b = board || Array(9).fill(null);
    if (b.length === 9 && !Array.isArray(b[0])) {
        // Convert 1D to 2D
        const rows = [];
        for (let i = 0; i < 9; i += 3) rows.push(b.slice(i, i + 3));
        return rows;
    }
    return b; // Assume it's already 2D or compatible
  }, [board]);

  const handlePress = (r, c) => {
    // Check if cell is occupied (safeBoard is 2D here)
    if (!isMyTurn || safeBoard[r][c] || winner) return;
    triggerHaptic('impactLight');
    
    // Server expects a linear index (0-8)
    const index = r * 3 + c;
    onMove({ index: index, row: r, col: c }); // Send both formats to be safe with different server versions
  };

  const renderSquare = (r, c) => {
    // Value check - case insensitive safety
    const rawVal = safeBoard[r][c];
    const value = rawVal ? rawVal.toUpperCase() : null;
    
    return (
      <TouchableOpacity
        key={`${r}-${c}`}
        style={[
            styles.tictacSquare, 
            { 
                borderColor: 'rgba(255,255,255,0.1)',
                backgroundColor: value ? (value === 'X' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(168, 85, 247, 0.2)') : 'transparent'
            }
        ]}
        onPress={() => handlePress(r, c)}
        activeOpacity={0.7}
        disabled={!!value || !isMyTurn || !!winner}
      >
        {value === 'X' && <Ionicons name="close" size={40} color="#3b82f6" />}
        {value === 'O' && <MaterialCommunityIcons name="circle-outline" size={32} color="#a855f7" />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.tictacContainer}>
      <View style={styles.tictacBoard}>
        {safeBoard.map((row, rIndex) => (
          <View key={rIndex} style={styles.tictacRow}>
            {row.map((_, cIndex) => renderSquare(rIndex, cIndex))}
          </View>
        ))}
      </View>
      {winner && (
          <View style={styles.winnerBanner}>
            <Text style={styles.winnerText}>
                {winner === 'draw' ? "IT'S A DRAW!" : `${winner === userId ? 'YOU' : 'OPPONENT'} WON!`}
            </Text>
            <TouchableOpacity onPress={() => onMove({ type: 'reset' })} style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>PLAY AGAIN</Text>
            </TouchableOpacity>
          </View>
      )}
    </View>
  );
};



// --- Generic Placeholder ---
const GenericGamePlaceholder = ({ gameState, onMove, userId }) => {
    return (
        <View style={styles.placeholderContainer}>
             <View style={styles.placeholderIconBox}>
                <Ionicons name="game-controller" size={64} color="#3b82f6" />
             </View>
             <Text style={styles.placeholderText}>{gameState.type?.toUpperCase()}</Text>
             <Text style={styles.subText}>
                The full UI for this game is coming soon.
             </Text>
             
             <View style={styles.currentTurnBox}>
                <Text style={styles.turnLabel}>CURRENT TURN</Text>
                <Text style={styles.turnValue}>
                    {gameState.turn === userId ? "YOU" : "Opponent"}
                </Text>
             </View>

             <TouchableOpacity 
                style={[styles.actionBtn, gameState.turn !== userId && { opacity: 0.5 }]} 
                onPress={() => onMove({ type: 'roll' })}
                disabled={gameState.turn !== userId}
             >
                <Text style={styles.btnText}>Perform Action (Roll/Move)</Text>
             </TouchableOpacity>
        </View>
    );
};


const ActiveGameView = ({ 
    gameState, 
    onMove, 
    onClose, 
    userId, 
    localStream, 
    remoteStreams, 
    users 
}) => {
  const renderGame = () => {
      if (!gameState) return null; // Kept this check as it's good practice
      switch (gameState.type) {
          case 'xoxo':
              return <TicTacToeBoard gameState={gameState} onMove={onMove} userId={userId} />;
          case 'ludo':
              return <LudoBoard gameState={gameState} onMove={onMove} userId={userId} />;
          case 'snakeladder':
              return <SnakeLadderBoard gameState={gameState} onMove={onMove} userId={userId} />;

// ... (keep existing imports)

// Inside component:
          case 'chess':
              return <ChessBoard gameState={gameState} onMove={onMove} userId={userId} localStream={localStream} remoteStreams={remoteStreams} users={users} />;
          case 'checkers':
              return <CheckersBoard gameState={gameState} onMove={onMove} userId={userId} localStream={localStream} remoteStreams={remoteStreams} users={users} />;
          default:
              return <GenericGamePlaceholder gameState={gameState} onMove={onMove} userId={userId} />;
      }
  };

  const myPlayer = gameState.players?.find(p => p.id === userId);
  const myRole = myPlayer?.role?.toUpperCase();

  // Timer Logic
  const [timeLeft, setTimeLeft] = React.useState(30);

  React.useEffect(() => {
    if (!gameState || gameState.winner) return;
    
    // Reset timer on turn change
    setTimeLeft(30);

    const timer = setInterval(() => {
        setTimeLeft((prev) => {
            if (prev <= 1) {
                clearInterval(timer);
                return 0;
            }
            return prev - 1;
        });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState?.turn, gameState?.winner]); // Reset when turn changes

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={true}
      onRequestClose={onClose}
    >
      <LinearGradient 
        colors={['#0f172a', '#1e1b4b', '#020617']} 
        style={styles.fullScreen}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
      >
        {/* Subtle Background Elements */}
        <View style={[styles.bgCircle, { top: -100, left: -100, backgroundColor: '#3b82f615' }]} />
        <View style={[styles.bgCircle, { bottom: -100, right: -100, backgroundColor: '#ef444415' }]} />
        <View style={[styles.bgCircle, { top: '40%', left: '20%', backgroundColor: '#a855f710', width: 400, height: 400, borderRadius: 200 }]} />
  
        <View style={[styles.header, { backgroundColor: 'rgba(15, 23, 42, 0.9)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }]}>
          <TouchableOpacity 
            onPress={() => {
                triggerHaptic('impactMedium');
                onClose();
            }} 
            style={styles.closeBtn}
          >
             <Ionicons name="chevron-down" size={28} color="#fff" />
          </TouchableOpacity>
  

          <View style={styles.turnStatusBanner}>
              <Text style={styles.turnStatusHeader}>
                  {gameState.turn === userId ? "YOUR TURN" : "OPPONENT'S TURN"}
              </Text>
              
              {/* Timer & Progress Bar */}
              <View style={styles.timerContainer}>
                 <View style={[styles.turnIndicatorBar, { 
                     backgroundColor: gameState.turn === userId ? '#10b981' : '#64748b', 
                     shadowColor: gameState.turn === userId ? '#10b981' : 'transparent', 
                     shadowOpacity: 0.8, 
                     shadowRadius: 10,
                     width: '100%' // Full width for container
                 }]} >
                    {/* Animated Width could go here if using Reanimated, for now static colored bar */}
                 </View>
                 {!gameState.winner && (
                     <Text style={styles.timerText}>{timeLeft}s</Text>
                 )}
              </View>

              {myRole && <Text style={styles.roleSubtext}>PLAYING AS {myRole}</Text>}
          </View>
          
          
          <View style={styles.headerTitleBox}>
              <View style={[styles.gameIconBadge, { backgroundColor: COLORS.primary.main }]}>
                <Ionicons name="game-controller" size={16} color="#fff" />
              </View>
          </View>
        </View>
        
        <View style={styles.gameArea}>
          {renderGame()}
        </View>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  bgCircle: {
      position: 'absolute',
      width: 300,
      height: 300,
      borderRadius: 150,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  turnStatusBanner: {
      alignItems: 'center',
      flex: 1,
  },
  turnStatusHeader: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 2,
      marginBottom: 8,
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
  },
  timerContainer: {
      width: 60,
      alignItems: 'center',
  },
  turnIndicatorBar: {
      width: '100%',
      height: 4,
      borderRadius: 2,
  },
  timerText: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 10,
      fontWeight: 'bold',
      marginTop: 4,
  },
  roleSubtext: {
      color: 'rgba(255,255,255,0.6)',
      fontSize: 10,
      fontWeight: 'bold',
      marginTop: 6,
      letterSpacing: 1,
  },
  headerTitleBox: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  gameIconBadge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: COLORS.primary.main,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 10,
      elevation: 5,
  },
  headerType: {
      color: 'rgba(255,255,255,0.5)',
      fontSize: 14,
      fontWeight: 'bold',
      letterSpacing: 1,
  },
  closeBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: BORDER_RADIUS.full,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
  },
  gameArea: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
  },
  // XOXO Styles
  tictactoeContainer: {
      width: '100%',
      alignItems: 'center',
  },
  // --- TicTacToe Styles ---
  tictacContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 30,
  },
  tictacBoard: {
    width: Math.min(SCREEN_WIDTH - 40, 360),
    aspectRatio: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tictacRow: {
    flex: 1,
    flexDirection: 'row',
  },
  tictacSquare: {
    flex: 1,
    margin: 4,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  winnerBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    width: '100%',
  },
  winnerText: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  resetBtn: {
      backgroundColor: '#10b981',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 99,
  },
  resetBtnText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: 'bold',
      letterSpacing: 1,
  },
  
  // --- Placeholder Styles ---
  placeholderContainer: {
      alignItems: 'center',
      padding: 30,
      backgroundColor: 'rgba(255,255,255,0.03)',
      borderRadius: 32,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      width: '100%',
  },
  placeholderIconBox: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
  },
  placeholderText: {
      color: '#fff',
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 10,
  },
  subText: {
      color: COLORS.gray[400],
      textAlign: 'center',
      marginBottom: 30,
  },
  currentTurnBox: {
      alignItems: 'center',
      marginBottom: 30,
  },
  turnLabel: {
      color: COLORS.gray[500],
      fontSize: 12,
      fontWeight: 'bold',
      letterSpacing: 1,
  },
  turnValue: {
      color: '#fff',
      fontSize: 32,
      fontWeight: 'bold',
  },
  actionBtn: {
      backgroundColor: COLORS.primary.main,
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 30,
      ...SHADOWS.md,
  },
  btnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
  },
});

export default memo(ActiveGameView);
