import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Svg, { Line, Polygon, Path, Circle, Defs, RadialGradient as SvgRadialGradient, Stop } from 'react-native-svg';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../../screens/room/InnerRoomScreen/styles/InnerRoomScreen.styles';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 40, 400);
const CELL_SIZE = BOARD_SIZE / 10;

const SNAKES = {
    16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78
};

const LADDERS = {
    1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100
};

const SnakeLadderBoard = ({ gameState, onMove, userId }) => {
  const { players, turn, dice } = gameState;
  const isMyTurn = turn === userId;

  const handleRoll = () => {
    if (!isMyTurn) return;
    ReactNativeHapticFeedback.trigger('impactHeavy', { enableVibrateFallback: true });
    onMove({ type: 'roll' });
  };

  // Helper to get {x,y, row, col} for a visual index (0-99 grid)
  // But we need to map actual board number (1-100) to grid coordinates.
  // Visual Grid is 10x10. 
  // Row 0 (Bottom) is 1-10. Row 1 is 20-11. Row 2 is 21-30.
  // Wait, rendering is usually Top-Left (0,0) to Bottom-Right.
  // Let's assume Top-Left (Row 0) is 100-91.
  
  const getCoords = (num) => {
      // 100 -> row 0, col 0
      // 1 -> row 9, col 0 (if normal boustrophedon from bottom-left=1)
      
      // Let's define rows from top (0) to bottom (9)
      // num 100: Top-Left. 
      // num 1: Bottom-Left.
      
      const rowFromBottom = Math.floor((num - 1) / 10); // 0 for 1-10, 9 for 91-100
      const row = 9 - rowFromBottom; // 9 for 1-10, 0 for 91-100
      
      let col = (num - 1) % 10;
      // If rowFromBottom is odd (1, 3, 5...), numbers go Right->Left (20, 19... 11)
      // If rowFromBottom is even (0, 2, 4...), numbers go Left->Right (1, 2... 10)
      
      if (rowFromBottom % 2 === 1) {
          col = 9 - col;
      }
      
      return {
          row, col,
          x: col * CELL_SIZE + CELL_SIZE / 2,
          y: row * CELL_SIZE + CELL_SIZE / 2
      };
  };

  const renderBoardCells = () => {
      // We render 100 cells. We just need to calculate the number for each slot in the 10x10 grid.
      // Grid fills Row 0 (Top) Left->Right.
      // Row 0 corresponds to numbers 100 -> 91
      // Row 1 corresponds to numbers 81 -> 90
      
      const cells = [];
      for (let r = 0; r < 10; r++) {
          for (let c = 0; c < 10; c++) {
              let num;
              const rowFromBottom = 9 - r;
              if (rowFromBottom % 2 === 0) {
                  // Even row from bottom (0: 1-10, 2: 21-30...) -> Left to Right
                  num = rowFromBottom * 10 + c + 1;
              } else {
                  // Odd row from bottom (1: 20-11...) -> Right to Left
                  num = rowFromBottom * 10 + (10 - c);
              }
              
              const isSnakeHead = SNAKES[num] !== undefined;
              const isLadderBase = LADDERS[num] !== undefined;
              
              cells.push(
                  <View key={`${r}-${c}`} style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}>
                      {/* Cell Background Gradient based on number for visual variety */}
                      <LinearGradient
                        colors={
                            (r + c) % 2 === 0 
                            ? ['#1e293b', '#0f172a'] 
                            : ['#334155', '#1e293b']
                        }
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Number */}
                      <Text style={[styles.cellText, (isSnakeHead || isLadderBase) && styles.highlightText, { opacity: (isSnakeHead || isLadderBase) ? 1 : 0.3 }]}>
                          {num}
                      </Text>

                      {/* Special Icons for Start/End */}
                      {isSnakeHead && <Ionicons name="alert-circle" size={12} color="#ef4444" style={{ position: 'absolute', top: 2, left: 2, opacity: 0.7 }} />}
                      {isLadderBase && <Ionicons name="arrow-up-circle" size={12} color="#10b981" style={{ position: 'absolute', bottom: 2, right: 2, opacity: 0.7 }} />}

                      {/* Player Tokens */}
                      <View style={styles.tokenContainer}>
                        {players.map(p => {
                            if (p.pos === num || (p.pos === 0 && num === 1)) { // Show at 1 if pos 0
                                return (
                                    <View key={p.id} style={[styles.token, { backgroundColor: p.color, shadowColor: p.color }]} >
                                       <View style={styles.tokenInner} />
                                    </View>
                                );
                            }
                            return null;
                        })}
                      </View>
                  </View>
              );
          }
      }
      return cells;
  };

  const renderConnectors = () => {
      return (
          <Svg height={BOARD_SIZE} width={BOARD_SIZE} style={StyleSheet.absoluteFill}>
              {/* Snakes - Curvy Paths */}
              {Object.entries(SNAKES).map(([start, end]) => {
                  const s = getCoords(parseInt(start));
                  const e = getCoords(end);
                  
                  // Calculate control points for curve
                  const midX = (s.x + e.x) / 2 + (Math.random() > 0.5 ? 20 : -20);
                  const midY = (s.y + e.y) / 2;
                  
                  return (
                      <React.Fragment key={`snake-${start}`}>
                          {/* Snake Body */}
                          <Path 
                            d={`M ${s.x} ${s.y} Q ${midX} ${midY} ${e.x} ${e.y}`}
                            stroke="#ef4444"
                            strokeWidth="5"
                            strokeOpacity="0.8"
                            strokeLinecap="round"
                            fill="none"
                          />
                          {/* Snake Pattern (Dashed line on top) */}
                          <Path 
                            d={`M ${s.x} ${s.y} Q ${midX} ${midY} ${e.x} ${e.y}`}
                            stroke="#fee2e2"
                            strokeWidth="1"
                            strokeDasharray="2,3"
                            fill="none"
                          />
                          {/* Head (at start position - usually top) */}
                          <Circle cx={s.x} cy={s.y} r="4" fill="#ef4444" stroke="#fff" strokeWidth="1" />
                      </React.Fragment>
                  );
              })}
              {/* Ladders - Straight with Rungs */}
              {Object.entries(LADDERS).map(([start, end]) => {
                  const s = getCoords(parseInt(start));
                  const e = getCoords(end);
                  return (
                      <React.Fragment key={`ladder-${start}`}>
                          <Line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke="#10b981" strokeWidth="6" strokeOpacity="0.6" strokeLinecap="round" />
                          {/* Rungs effect */}
                          <Line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke="#ecfdf5" strokeWidth="14" strokeOpacity="0.3" strokeDasharray="1, 8" strokeLinecap="butt" />
                      </React.Fragment>
                  );
              })}
          </Svg>
      );
  };

  return (
    <View style={styles.container}>
      <View style={styles.boardContainer}>
          <View style={styles.board}>
              {renderBoardCells()}
              <View style={styles.overlay} pointerEvents="none">
                 {renderConnectors()}
              </View>
          </View>
      </View>

      <View style={styles.controls}>


          <TouchableOpacity 
            style={[styles.diceBtn, isMyTurn && styles.diceBtnActive]}
            onPress={handleRoll}
            disabled={!isMyTurn}
          >
              {dice ? (
                  <Text style={styles.diceValue}>{dice}</Text>
              ) : (
                  <Ionicons name="cube-outline" size={32} color={isMyTurn ? '#fff' : COLORS.gray[400]} />
              )}
          </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: '100%' },
  boardContainer: { 
      padding: 0, 
      backgroundColor: '#0f172a', 
      borderRadius: BORDER_RADIUS.xl, 
      ...SHADOWS.lg, 
      borderWidth: 4, 
      borderColor: '#334155',
      overflow: 'hidden' 
  },
  board: { width: BOARD_SIZE, height: BOARD_SIZE, backgroundColor: '#0f172a', flexDirection: 'row', flexWrap: 'wrap', position: 'relative' },
  cell: { justifyContent: 'center', alignItems: 'center', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5 },
  cellText: { fontSize: 9, color: '#94a3b8', position: 'absolute', top: 2, left: 3, zIndex: 1, fontWeight: '700' },
  highlightText: { color: '#fff', fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  tokenContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 2, padding: 2, zIndex: 20 },
  token: { 
      width: 14, 
      height: 14, 
      borderRadius: 7, 
      borderWidth: 1.5, 
      borderColor: '#fff', 
      justifyContent: 'center', 
      alignItems: 'center',
      shadowOffset: {width: 0, height: 2}, 
      shadowOpacity: 0.5, 
      shadowRadius: 2, 
      elevation: 4 
  },
  tokenInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2 },
  
  controls: { width: '100%', marginTop: 20, alignItems: 'center' },
  turnBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 15 },
  turnDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  turnText: { color: '#fff', fontSize: 13, fontWeight: 'bold', letterSpacing: 0.5 },
  diceBtn: { width: 64, height: 64, backgroundColor: COLORS.gray[800], borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.gray[700] },
  diceBtnActive: { backgroundColor: COLORS.primary.main, borderColor: COLORS.primary.light, ...SHADOWS.md },
  diceValue: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
});

export default memo(SnakeLadderBoard);
