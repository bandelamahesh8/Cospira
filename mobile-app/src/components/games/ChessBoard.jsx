import React, { memo, useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import ParticipantTile from '../../screens/room/InnerRoomScreen/components/ParticipantTile';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../../screens/room/InnerRoomScreen/styles/InnerRoomScreen.styles';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 40, 400);
const SQUARE_SIZE = BOARD_SIZE / 8;

const CHESS_PIECES = {
  p: 'chess-pawn',
  r: 'chess-rook',
  n: 'chess-knight',
  b: 'chess-bishop',
  q: 'chess-queen',
  k: 'chess-king',
};

const ChessBoard = ({ 
    gameState, 
    onMove, 
    userId, 
    localStream, 
    remoteStreams, 
    users 
}) => {
  const { board: fen, turn, winner, lastMove, players } = gameState;
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [timer, setTimer] = useState(60); // Default 60s turn

  // Robust User ID check
  const actualUserId = useMemo(() => userId || '', [userId]);
  const myPlayer = useMemo(() => players?.find(p => p.id === actualUserId), [players, actualUserId]);
  const isMyTurn = useMemo(() => turn === actualUserId, [turn, actualUserId]);
  const myRole = myPlayer?.role; // 'white' or 'black'
  const isBlack = myRole?.toLowerCase() === 'black';
  const opponent = useMemo(() => players?.find(p => p.id !== actualUserId), [players, actualUserId]);

  useEffect(() => {
    if (isMyTurn) {
        setTimer(60);
        const interval = setInterval(() => {
            setTimer(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }
  }, [isMyTurn, turn]);

  const parseFEN = (fenString) => {
    if (!fenString) return Array(8).fill(null).map(() => Array(8).fill(null));
    const [position] = fenString.split(' ');
    const rows = position.split('/');
    const result = [];

    for (const row of rows) {
      const parsedRow = [];
      for (const char of row) {
        if (isNaN(parseInt(char))) {
          parsedRow.push({
            type: char.toLowerCase(),
            color: char === char.toUpperCase() ? 'w' : 'b'
          });
        } else {
          for (let i = 0; i < parseInt(char); i++) parsedRow.push(null);
        }
      }
      result.push(parsedRow);
    }
    return result;
  };

  const board = useMemo(() => parseFEN(fen), [fen]);

  const [validMoves, setValidMoves] = useState([]); // Array of square coordinates like 'e4'

  const handleSquarePress = (row, col) => {
    if (!isMyTurn || winner) return;

    const piece = board[row][col];
    const square = `${String.fromCharCode(97 + col)}${8 - row}`;

    // Haptic feedback on touch
    ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true });

    // If tapping the same square, deselect
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    // If a piece is already selected, check if we are tapping a valid move target
    if (selectedSquare) {
      const targetPiece = board[row][col];
      const isSelfPiece = targetPiece && (
          (myRole === 'white' && targetPiece.color === 'w') || 
          (myRole === 'black' && targetPiece.color === 'b')
      );

      if (isSelfPiece) {
          // Change selection to this new piece
          setSelectedSquare(square);
          calculateValidMoves(row, col, targetPiece);
          ReactNativeHapticFeedback.trigger('selection', { enableVibrateFallback: true });
      } else {
          // Attempt move only if it's a valid move (or basic validation passes)
          // We can check if `square` is in `validMoves` to be strict, or allow any move attempt and let server validate.
          // Visual feedback says we should be strict if we show dots.
          
          if (validMoves.includes(square)) {
              onMove({ from: selectedSquare, to: square });
              setSelectedSquare(null);
              setValidMoves([]);
              ReactNativeHapticFeedback.trigger('impactMedium', { enableVibrateFallback: true });
          } else {
              // Invalid move feedback?
              ReactNativeHapticFeedback.trigger('notificationError', { enableVibrateFallback: true });
              setSelectedSquare(null);
              setValidMoves([]);
          }
      }
    } else if (piece) {
        // Selecting a piece for the first time
        const isWhitePiece = piece.color === 'w';
        if ((isWhitePiece && myRole === 'white') || (!isWhitePiece && myRole === 'black')) {
            setSelectedSquare(square);
            calculateValidMoves(row, col, piece);
            ReactNativeHapticFeedback.trigger('selection', { enableVibrateFallback: true });
        }
    }
  };

  // Simplified move calculation for visual dots (Client-side heuristic)
  // This is purely for visual feedback. The server/engine validates the real move.
  const calculateValidMoves = (row, col, piece) => {
      const moves = [];
      const type = piece.type.toLowerCase();
      const directions = {
          'p': isBlack ? [[1, 0], [1, -1], [1, 1], [2, 0]] : [[-1, 0], [-1, -1], [-1, 1], [-2, 0]], // Simple pawn logic
          'r': [[0, 1], [0, -1], [1, 0], [-1, 0]],
          'b': [[1, 1], [1, -1], [-1, 1], [-1, -1]],
          'n': [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],
          'q': [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]],
          'k': [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]
      };

      // Helper to check bounds
      const isValid = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

      let dirs = directions[type] || [];
      
      // Sliding pieces (Queen, Rook, Bishop) logic vs Single step (King, Knight, Pawn)
      const isSliding = ['r', 'b', 'q'].includes(type);

      dirs.forEach(([dr, dc]) => {
          let r = row + dr;
          let c = col + dc;

          if (isSliding) {
              while (isValid(r, c)) {
                   const target = board[r][c];
                   if (target) {
                       // Capture?
                       if (target.color !== piece.color) moves.push(`${String.fromCharCode(97 + c)}${8 - r}`);
                       break; // Blocked
                   }
                   moves.push(`${String.fromCharCode(97 + c)}${8 - r}`);
                   r += dr;
                   c += dc;
              }
          } else {
              // Single step pieces
              if (isValid(r, c)) {
                  const target = board[r][c];
                  // Pawn special logic (simplified)
                  if (type === 'p') {
                      // Forward move
                      if (dc === 0 && !target) moves.push(`${String.fromCharCode(97 + c)}${8 - r}`);
                      // Diagonal capture
                      if (dc !== 0 && target && target.color !== piece.color) moves.push(`${String.fromCharCode(97 + c)}${8 - r}`);
                      // Double start (very simplified check)
                      if (Math.abs(dr) === 2 && dc === 0 && !target && !board[row + dr/2][col]) {
                          if ((piece.color === 'w' && row === 6) || (piece.color === 'b' && row === 1)) {
                              moves.push(`${String.fromCharCode(97 + c)}${8 - r}`);
                          }
                      }
                  } else {
                      // Knight, King
                      if (!target || target.color !== piece.color) {
                          moves.push(`${String.fromCharCode(97 + c)}${8 - r}`);
                      }
                  }
              }
          }
      });

      setValidMoves(moves);
  };

  const renderSquare = (row, col) => {
    const isDark = (row + col) % 2 === 1;
    const piece = board[row][col];
    const squareName = `${String.fromCharCode(97 + col)}${8 - row}`;
    const isSelected = selectedSquare === squareName;
    const isLastMove = lastMove && (lastMove.from === squareName || lastMove.to === squareName);
    const isValidMove = validMoves.includes(squareName);
    const isCapture = isValidMove && piece && piece.color !== myRole?.charAt(0);

    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={[
          styles.square,
          {
            backgroundColor: isDark ? '#b58863' : '#f0d9b5', // Fallback color
          }
        ]}
        onPress={() => handleSquarePress(row, col)}
        activeOpacity={0.9}
      >
        {/* Base Gradient for Squares to look nice */}
        <LinearGradient
            colors={isDark ? ['#b58863', '#8a6240'] : ['#f0d9b5', '#d9c09e']}
            style={StyleSheet.absoluteFill}
        />
        
        {/* Selection Highlight */}
        {isSelected && (
            <LinearGradient 
                colors={['rgba(255, 235, 59, 0.6)', 'rgba(255, 235, 59, 0.2)']} 
                style={[StyleSheet.absoluteFill, { zIndex: 5 }]}
            />
        )}
        
        {/* Last Move Highlight */}
        {isLastMove && !isSelected && (
            <LinearGradient
                colors={['rgba(255, 235, 59, 0.3)', 'rgba(255, 235, 59, 0.1)']} 
                style={[StyleSheet.absoluteFill, { zIndex: 4 }]}
            />
        )}

        {/* Dot for valid move */}
        {isValidMove && !isCapture && (
            <View style={styles.validMoveDot} />
        )}
        
        {/* Ring for capture */}
        {isCapture && (
            <View style={styles.captureRing} />
        )}

        {piece && (
            <View style={{ shadowColor: '#000', shadowOffset: { width: 2, height: 4 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 5 }}>
              <MaterialCommunityIcons
                name={CHESS_PIECES[piece.type]}
                size={SQUARE_SIZE * 0.85}
                color={piece.color === 'w' ? '#FFFFFF' : '#1e293b'}
                style={[styles.pieceIcon, piece.color === 'w' && styles.whitePieceShadow]}
              />
            </View>
        )}
      </TouchableOpacity>
    );
  };

  // UI for Opponent Video
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
              <View style={[styles.playerRoleBadge, { backgroundColor: (isLocal ? myRole : (myRole === 'white' ? 'black' : 'white')) === 'white' ? '#fff' : '#000' }]}>
                  <Text style={[styles.playerRoleText, { color: (isLocal ? myRole : (myRole === 'white' ? 'black' : 'white')) === 'white' ? '#000' : '#fff' }]}>
                      {isLocal ? myRole?.toUpperCase() : (myRole === 'white' ? 'BLACK' : 'WHITE')}
                  </Text>
              </View>
          </View>
      );
  };

  return (
    <View style={styles.container}>
      {/* Top Section: Opponent Info */}
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

      <View style={styles.boardWrapper}>
          <View style={styles.boardLabelRow}>
              {(isBlack 
                ? ['H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'] 
                : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
              ).map(l => <Text key={l} style={styles.coordText}>{l}</Text>)}
          </View>
          <View style={{ flexDirection: 'row' }}>
              <View style={styles.boardLabelCol}>
                  {(isBlack 
                    ? [1, 2, 3, 4, 5, 6, 7, 8] 
                    : [8, 7, 6, 5, 4, 3, 2, 1]
                  ).map(l => <Text key={l} style={styles.coordText}>{l}</Text>)}
              </View>
              <View style={styles.board}>
                {(isBlack 
                    ? [7, 6, 5, 4, 3, 2, 1, 0] 
                    : [0, 1, 2, 3, 4, 5, 6, 7]
                ).map((rowIndex) => (
                  <View key={rowIndex} style={styles.row}>
                    {(isBlack 
                        ? [7, 6, 5, 4, 3, 2, 1, 0] 
                        : [0, 1, 2, 3, 4, 5, 6, 7]
                    ).map((colIndex) => renderSquare(rowIndex, colIndex))}
                  </View>
                ))}
              </View>
          </View>
      </View>
      
      {/* Bottom Section: Self Info */}
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
      padding: 5,
      backgroundColor: '#332111',
      borderRadius: 4,
      ...SHADOWS.lg,
  },
  boardLabelRow: {
      flexDirection: 'row',
      paddingLeft: 20,
      height: 20,
      alignItems: 'center',
  },
  boardLabelCol: {
      width: 20,
      justifyContent: 'space-around',
      alignItems: 'center',
  },
  coordText: {
      color: 'rgba(255,255,255,0.4)',
      fontSize: 10,
      flex: 1,
      textAlign: 'center',
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
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
  pieceIcon: {
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
  },
  whitePieceShadow: {
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
  },
  validMoveDot: {
      width: SQUARE_SIZE * 0.25,
      height: SQUARE_SIZE * 0.25,
      borderRadius: SQUARE_SIZE,
      backgroundColor: 'rgba(0,0,0,0.3)',
      position: 'absolute',
      zIndex: 10
  },
  captureRing: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    borderWidth: 4,
    borderColor: 'rgba(200,0,0,0.4)',
    borderRadius: 8, // slight rounding for capture ring looks modern
    zIndex: 10,
    backgroundColor: 'rgba(200,0,0,0.1)'
  }
});

export default memo(ChessBoard);
