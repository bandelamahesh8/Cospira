import React, { memo, useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import ParticipantTile from '../../screens/room/InnerRoomScreen/components/ParticipantTile';
import { COLORS, SHADOWS } from '../../screens/room/InnerRoomScreen/styles/InnerRoomScreen.styles';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 40, 400);
const SQUARE_SIZE = BOARD_SIZE / 8;

const CheckersBoard = ({ 
    gameState, 
    onMove, 
    userId, 
    localStream, 
    remoteStreams, 
    users 
}) => {
  const { board, turn, winner, lastMove, players } = gameState;
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [timer, setTimer] = useState(30); 
  const [validMoves, setValidMoves] = useState([]); // Array of {to: {r, c}, type}

  // Robust User ID check
  const actualUserId = useMemo(() => userId || '', [userId]);
  const myPlayer = useMemo(() => players?.find(p => p.id === actualUserId), [players, actualUserId]);
  const isMyTurn = useMemo(() => turn === actualUserId, [turn, actualUserId]);
  const myRole = myPlayer?.role; // 'red' or 'white'
  
  // Basic heuristic: red is usually top (index 0), white is bottom (index 7) in engine.
  // We flip if we are red, so red appears at bottom for player.
  // Actually, usually Player 2 is Red (Top), Player 1 is White (Bottom).
  // If I am Red, I want to see my pieces at bottom.
  const isFlipped = myRole === 'red';

  const opponent = useMemo(() => players?.find(p => p.id !== actualUserId), [players, actualUserId]);

  useEffect(() => {
    if (isMyTurn) {
        setTimer(30);
        const interval = setInterval(() => {
            setTimer(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }
  }, [isMyTurn, turn]);

  const handleSquarePress = (displayRow, displayCol) => {
    if (!isMyTurn || winner) return;

    // Convert display coordinates to logical coordinates using same flip logic as render
    const r = isFlipped ? 7 - displayRow : displayRow;
    const c = isFlipped ? 7 - displayCol : displayCol;

    const piece = board[r][c];
    
    // Check if tapping a valid move target (green dot)
    const moveTarget = validMoves.find(m => m.r === r && m.c === c);

    if (moveTarget) {
         // Execute move
         ReactNativeHapticFeedback.trigger('impactMedium', { enableVibrateFallback: true });
         onMove({ 
             from: selectedSquare, 
             to: { r, c } // Send logical coordinates to engine
         });
         setSelectedSquare(null);
         setValidMoves([]);
         return;
    }

    // Toggle Selection
    if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
        setSelectedSquare(null);
        setValidMoves([]);
    } else if (piece) {
        // Select if own piece
        if (piece.color === myRole) {
            ReactNativeHapticFeedback.trigger('selection', { enableVibrateFallback: true });
            setSelectedSquare({ r, c });
            calculateValidMoves(r, c, piece);
        }
    }
  };

  const calculateValidMoves = (r, c, piece) => {
      // Simplified Checkers Logic for Visual Hints
      // Engine handles real validation
      const moves = [];
      const directions = piece.isKing ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : (piece.color === 'white' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);
      
      const isValidPos = (row, col) => row >= 0 && row < 8 && col >= 0 && col < 8;

      directions.forEach(([dr, dc]) => {
          // Simple Move
          const nr = r + dr;
          const nc = c + dc;
          
          if (isValidPos(nr, nc)) {
              if (!board[nr][nc]) {
                  moves.push({ r: nr, c: nc, type: 'move' });
              } else if (board[nr][nc].color !== piece.color) {
                  // Capture?
                  const nnr = nr + dr;
                  const nnc = nc + dc;
                  if (isValidPos(nnr, nnc) && !board[nnr][nnc]) {
                       moves.push({ r: nnr, c: nnc, type: 'capture' });
                  }
              }
          }
      });
      
      setValidMoves(moves);
  };

  const renderSquare = (rIndex, cIndex) => {
    // Coordinate transformation for visual rendering
    const r = isFlipped ? 7 - rIndex : rIndex;
    const c = isFlipped ? 7 - cIndex : cIndex;

    const isDark = (r + c) % 2 === 1; // Checkers usually played on dark squares
    const piece = board[r][c];
    
    const isSelected = selectedSquare?.r === r && selectedSquare?.c === c;
    const isValidMove = validMoves.find(m => m.r === r && m.c === c);
    const isCapture = isValidMove?.type === 'capture';

    return (
      <TouchableOpacity
        key={`${rIndex}-${cIndex}`}
        style={[
          styles.square,
          {
            backgroundColor: isSelected 
                ? 'rgba(255, 235, 59, 0.5)' 
                : isDark ? '#2e1a14' : '#eecfa1',
             borderColor: isSelected ? '#fbbf24' : 'transparent',
             borderWidth: isSelected ? 2 : 0,
          }
        ]}
        onPress={() => isDark && handleSquarePress(rIndex, cIndex)}
        disabled={!isDark}
        activeOpacity={0.8}
      >
        {/* Gradient Background */}
        <LinearGradient
            colors={isDark ? ['#2e1a14', '#1a0f0b'] : ['#eecfa1', '#dcb386']}
            style={StyleSheet.absoluteFill}
        />
        
        {/* Selection Highlight */}
        {isSelected && (
            <LinearGradient
                colors={['rgba(251, 191, 36, 0.6)', 'rgba(251, 191, 36, 0.2)']} 
                style={[StyleSheet.absoluteFill, { zIndex: 5, borderRadius: 2 }]}
            />
        )}
        {/* Helper Dot/Ring */}
        {isValidMove && (
            <View style={{
                position: 'absolute',
                width: isCapture ? 24 : 16,
                height: isCapture ? 24 : 16,
                borderRadius: 12,
                backgroundColor: isCapture ? 'transparent' : 'rgba(0,255,0,0.3)',
                borderWidth: isCapture ? 3 : 0,
                borderColor: isCapture ? 'rgba(255,0,0,0.5)' : 'transparent',
                zIndex: 10
            }} />
        )}

        {piece && (
           <View style={[
               styles.piece,
               { 
                   backgroundColor: piece.color === 'red' ? '#ef4444' : '#f8fafc',
                   borderColor: piece.color === 'red' ? '#991b1b' : '#94a3b8',
                   shadowColor: piece.color === 'red' ? '#ef4444' : '#000',
               }
           ]}>
               <LinearGradient
                    colors={piece.color === 'red' ? ['#ef4444', '#b91c1c'] : ['#ffffff', '#cbd5e1']}
                    style={[StyleSheet.absoluteFill, { borderRadius: 50 }]}
               />
               {/* Inner Ring for style */}
               <View style={{
                   width: '70%',
                   height: '70%',
                   borderRadius: 50,
                   borderWidth: 2,
                   borderColor: 'rgba(0,0,0,0.1)'
               }} />
               
               {/* King Crown */}
               {piece.isKing && (
                   <MaterialCommunityIcons name="crown" size={20} color={piece.color === 'red' ? '#fff' : '#000'} style={{position:'absolute'}} />
               )}
           </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderParticipantVideo = (pId, isLocal) => {
      const stream = isLocal ? localStream : (remoteStreams?.get?.(pId) || remoteStreams?.[pId]);
      const user = users?.find(u => u.id === pId) || (isLocal ? { name: 'You' } : { name: 'Opponent' });

      return (
          <View style={styles.videoTileContainer}>
              <ParticipantTile
                id={pId}
                name={user.name}
                stream={stream}
                isLocal={isLocal}
                tileWidth={70}
                tileHeight={70}
                isPip={false}
              />
              <View style={[styles.playerRoleBadge, { backgroundColor: (isLocal ? myRole : (myRole === 'white' ? 'red' : 'white')) === 'white' ? '#fff' : '#ef4444' }]}>
                  <Text style={[styles.playerRoleText, { color: (isLocal ? myRole : (myRole === 'white' ? 'red' : 'white')) === 'white' ? '#000' : '#fff' }]}>
                      {isLocal ? myRole?.toUpperCase() : (myRole === 'white' ? 'RED' : 'WHITE')}
                  </Text>
              </View>
          </View>
      );
  };

  return (
    <View style={styles.container}>
      {/* Opponent Info */}
      <View style={styles.playerInfoSection}>
          {renderParticipantVideo(opponent?.id, false)}
          <View style={styles.gameInfo}>
              <Text style={styles.opponentName}>{opponent?.name || 'Joining...'}</Text>
              {!isMyTurn && !winner && (
                  <View style={styles.timerBadge}>
                      <MaterialCommunityIcons name="clock-outline" size={14} color="#fff" />
                      <Text style={styles.timerText}>{timer}s</Text>
                  </View>
              )}
          </View>
      </View>

      {/* Board */}
      <View style={styles.boardWrapper}>
          <View style={styles.board}>
            {Array.from({ length: 8 }).map((_, rIndex) => (
              <View key={rIndex} style={styles.row}>
                {Array.from({ length: 8 }).map((_, cIndex) => renderSquare(rIndex, cIndex))}
              </View>
            ))}
          </View>
      </View>
      
      {/* Self Info */}
      <View style={[styles.playerInfoSection, styles.bottomPlayerInfo]}>
          <View style={styles.gameInfo}>
              <Text style={styles.opponentName}>YOU ({myRole?.toUpperCase()})</Text>
              {isMyTurn && !winner && (
                  <View style={[styles.timerBadge, { backgroundColor: timer < 10 ? COLORS.error.main : COLORS.success.main }]}>
                      <MaterialCommunityIcons name="clock-outline" size={14} color="#fff" />
                      <Text style={styles.timerText}>{timer}s</Text>
                  </View>
              )}
          </View>
          {renderParticipantVideo(actualUserId, true)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
  },
  playerInfoSection: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      marginBottom: 15,
      paddingHorizontal: 10,
  },
  bottomPlayerInfo: {
      marginTop: 15,
      marginBottom: 0,
      justifyContent: 'flex-end',
  },
  videoTileContainer: {
      position: 'relative',
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.1)',
      ...SHADOWS.md,
  },
  playerRoleBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      paddingHorizontal: 4,
      borderRadius: 2,
  },
  playerRoleText: {
      fontSize: 8,
      fontWeight: 'bold',
  },
  gameInfo: {
      flex: 1,
      marginHorizontal: 15,
  },
  opponentName: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
  },
  timerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.1)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginTop: 5,
      alignSelf: 'flex-start',
      gap: 4,
  },
  timerText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
  },
  boardWrapper: {
      padding: 8,
      backgroundColor: '#5c3a2e',
      borderRadius: 12,
      ...SHADOWS.lg,
      borderWidth: 2,
      borderColor: '#3d241c',
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    backgroundColor: '#eecfa1',
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  piece: {
      width: SQUARE_SIZE * 0.8,
      height: SQUARE_SIZE * 0.8,
      borderRadius: SQUARE_SIZE / 2,
      borderWidth: 4,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
  }
});

export default memo(CheckersBoard);
