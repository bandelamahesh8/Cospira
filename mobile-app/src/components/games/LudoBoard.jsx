import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  Animated 
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { COLORS, SHADOWS } from '../../screens/room/InnerRoomScreen/styles/InnerRoomScreen.styles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 20, 420);
const CELL_SIZE = BOARD_SIZE / 15;

// ============= TOKEN COMPONENT =============
const Token = memo(({ 
  color, 
  position, 
  onPress, 
  isSelectable, 
  isHighlighted,
  index 
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSelectable) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [isSelectable]);

  const colors = {
    red: { main: '#ef4444', dark: '#b91c1c', glow: '#fca5a5' },
    green: { main: '#22c55e', dark: '#15803d', glow: '#86efac' },
    blue: { main: '#3b82f6', dark: '#1d4ed8', glow: '#93c5fd' },
    yellow: { main: '#eab308', dark: '#a16207', glow: '#fde047' }
  };

  const colorData = colors[color] || colors.red;

  return (
    <Animated.View
      style={[
        styles.tokenWrapper,
        { 
            top: position.row * CELL_SIZE, 
            left: position.col * CELL_SIZE,
            transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        disabled={!isSelectable}
        activeOpacity={0.7}
      >
        <View style={[styles.tokenOuter, { backgroundColor: colorData.main }]}>
           <View style={styles.tokenShine} />
           <View style={[styles.tokenInner, { backgroundColor: colorData.dark }]}>
                <Text style={styles.tokenNumber}>{index + 1}</Text>
           </View>
        </View>
        {isSelectable && (
            <View style={[styles.tokenIndicator, { backgroundColor: '#fff' }]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

// ============= PLAYER CARD =============
const PlayerCard = memo(({ player, isActive }) => {
    const colors = {
      red: '#ef4444',
      green: '#22c55e',
      blue: '#3b82f6',
      yellow: '#eab308'
    };
  
    return (
      <View style={[
          styles.playerCard, 
          isActive && { borderColor: colors[player.color], backgroundColor: `${colors[player.color]}20` }
      ]}>
        <View style={[styles.playerColor, { backgroundColor: colors[player.color] }]} />
        <View>
            <Text style={styles.playerName} numberOfLines={1}>{player.name}</Text>
            <View style={styles.progressBar}>
                {[0,1,2,3].map(i => (
                    <View key={i} style={[styles.progressDot, { backgroundColor: i < (player.finishedTokens || 0) ? colors[player.color] : '#475569' }]} />
                ))}
            </View>
        </View>
      </View>
    );
});

// ============= MAIN BOARD =============
const LudoBoard = ({ gameState, onMove, userId }) => {
  const { players, turn, dice, phase } = gameState || { players: [], turn: null, dice: null, phase: 'ROLL' };
  const isMyTurn = turn === userId;
  const currentPlayer = players.find(p => p.id === turn);

  const trackPath = useMemo(() => [
    [1,8], [2,8], [3,8], [4,8], [5,8], 
    [6,9], [6,10], [6,11], [6,12], [6,13], [6,14], [7,14], 
    [8,14], [8,13], [8,12], [8,11], [8,10], [8,9], 
    [9,8], [10,8], [11,8], [12,8], [13,8], [14,8], [14,7], 
    [14,6], [13,6], [12,6], [11,6], [10,6], [9,6], 
    [8,5], [8,4], [8,3], [8,2], [8,1], [8,0], [7,0], 
    [6,0], [6,1], [6,2], [6,3], [6,4], [6,5], 
    [5,6], [4,6], [3,6], [2,6], [1,6], [0,6], [0,7], [0,8]
  ], []);

  const getPosition = (playerColor, localPos) => {
    if (localPos === 0 || localPos === undefined) return null;
    if (localPos === 57) return { row: 7, col: 7 };

    if (localPos >= 1 && localPos <= 51) {
      let offset = 0;
      if (playerColor === 'green') offset = 0;
      if (playerColor === 'yellow') offset = 13;
      if (playerColor === 'blue') offset = 26;
      if (playerColor === 'red') offset = 39;

      const globalIdx = (localPos - 1 + offset) % 52;
      const coords = trackPath[globalIdx];
      return coords ? { row: coords[0], col: coords[1] } : null;
    }

    const step = localPos - 52;
    switch(playerColor) {
      case 'green': return { row: step + 1, col: 7 };
      case 'yellow': return { row: 7, col: 13 - step };
      case 'blue': return { row: 13 - step, col: 7 };
      case 'red': return { row: 7, col: step + 1 };
      default: return null;
    }
  };

  const colors = {
    red: '#ef4444',
    green: '#22c55e',
    blue: '#3b82f6',
    yellow: '#eab308'
  };

  const renderCells = () => {
    const cells = [];
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const isBase = (r < 6 && c < 6) || (r < 6 && c > 8) || (r > 8 && c < 6) || (r > 8 && c > 8);
        const isCenter = (r >= 6 && r <= 8 && c >= 6 && c <= 8);
        if (isBase || isCenter) continue;

        let bgColor = '#1e293b';
        let isStar = false;
        let arrow = null;
        
        if (r === 7 && c > 0 && c < 6) bgColor = colors.red;
        if (c === 7 && r > 0 && r < 6) bgColor = colors.green;
        if (r === 7 && c > 8 && c < 14) bgColor = colors.yellow;
        if (c === 7 && r > 8 && r < 14) bgColor = colors.blue;

        if (r === 6 && c === 1) { bgColor = colors.red; arrow = 'arrow-forward'; }
        if (r === 1 && c === 8) { bgColor = colors.green; arrow = 'arrow-down'; }
        if (r === 8 && c === 13) { bgColor = colors.yellow; arrow = 'arrow-back'; }
        if (r === 13 && c === 6) { bgColor = colors.blue; arrow = 'arrow-up'; }
        
        if ((r === 2 && c === 6) || (r === 6 && c === 12) || (r === 8 && c === 2) || (r === 12 && c === 8)) isStar = true;

        cells.push(
          <View 
            key={`${r}-${c}`} 
            style={[styles.cell, { top: r * CELL_SIZE, left: c * CELL_SIZE, backgroundColor: bgColor, borderColor: '#0f172a' }]}
          >
            {isStar && <Ionicons name="star" size={CELL_SIZE * 0.6} color="rgba(255,255,255,0.2)" />}
            {arrow && <Ionicons name={arrow} size={CELL_SIZE * 0.7} color="#fff" />}
          </View>
        );
      }
    }
    return cells;
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
         {players.slice(0, 2).map(p => <PlayerCard key={p.id} player={p} isActive={turn === p.id} />)}
      </View>

      <View style={styles.boardWrapper}>
        <View style={styles.board}>
            {/* Base Corners with Gradients */}
            <View style={[styles.baseArea, { top: 0, left: 0 }]}>
                 <LinearGradient colors={['#ef4444', '#b91c1c']} style={StyleSheet.absoluteFill} />
                <View style={[styles.baseWhite, { borderColor: 'rgba(255,255,255,0.2)' }]} />
            </View>
            <View style={[styles.baseArea, { top: 0, right: 0 }]}>
                <LinearGradient colors={['#22c55e', '#15803d']} style={StyleSheet.absoluteFill} />
                <View style={[styles.baseWhite, { borderColor: 'rgba(255,255,255,0.2)' }]} />
            </View>
            <View style={[styles.baseArea, { bottom: 0, left: 0 }]}>
                <LinearGradient colors={['#3b82f6', '#1d4ed8']} style={StyleSheet.absoluteFill} />
                <View style={[styles.baseWhite, { borderColor: 'rgba(255,255,255,0.2)' }]} />
            </View>
            <View style={[styles.baseArea, { bottom: 0, right: 0 }]}>
                <LinearGradient colors={['#eab308', '#a16207']} style={StyleSheet.absoluteFill} />
                <View style={[styles.baseWhite, { borderColor: 'rgba(255,255,255,0.2)' }]} />
            </View>

            {/* Path */}
            {renderCells()}

            {/* Center */}
            <View style={styles.centerArea}>
                <View style={[styles.tri, { borderBottomColor: colors.green, bottom: '50%', left: 0, borderLeftWidth: CELL_SIZE*1.5, borderRightWidth: CELL_SIZE*1.5, borderBottomWidth: CELL_SIZE*1.5 }]} />
                <View style={[styles.tri, { borderTopColor: colors.blue, top: '50%', left: 0, borderLeftWidth: CELL_SIZE*1.5, borderRightWidth: CELL_SIZE*1.5, borderTopWidth: CELL_SIZE*1.5 }]} />
                <View style={[styles.tri, { borderRightColor: colors.red, left: 0, top: 0, borderTopWidth: CELL_SIZE*1.5, borderBottomWidth: CELL_SIZE*1.5, borderRightWidth: CELL_SIZE*1.5 }]} />
                <View style={[styles.tri, { borderLeftColor: colors.yellow, right: 0, top: 0, borderTopWidth: CELL_SIZE*1.5, borderBottomWidth: CELL_SIZE*1.5, borderLeftWidth: CELL_SIZE*1.5 }]} />
            </View>

            {/* Tokens */}
            {players.map(player => (
                (player.tokens || []).map((pos, idx) => {
                    let coords = getPosition(player.color, pos);
                    if (pos === 0) {
                        const bOff = { red: [0,0], green: [0,9], blue: [9,0], yellow: [9,9] }[player.color];
                        coords = {
                            row: bOff[0] + (idx < 2 ? 1.5 : 3.5),
                            col: bOff[1] + (idx % 2 === 0 ? 1.5 : 3.5)
                        };
                    }
                    if (!coords) return null;

                    return (
                        <Token
                            key={`${player.id}-${idx}`}
                            color={player.color}
                            position={coords}
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
                                onMove({ type: 'move', tokenIndex: idx });
                            }}
                            isSelectable={isMyTurn && phase === 'MOVE' && turn === player.id}
                            index={idx}
                        />
                    );
                })
            ))}
        </View>
      </View>

      <View style={styles.footerRow}>
         {players.slice(2, 4).map(p => <PlayerCard key={p.id} player={p} isActive={turn === p.id} />)}
      </View>

      <View style={styles.controls}>
          <TouchableOpacity 
            style={[styles.diceBtn, isMyTurn && phase === 'ROLL' && styles.diceBtnActive]}
            onPress={() => {
                ReactNativeHapticFeedback.trigger('impactHeavy', { enableVibrateFallback: true });
                onMove({ type: 'roll' });
            }}
            disabled={!isMyTurn || phase !== 'ROLL'}
          >
            <View style={styles.diceFace}>
                {dice ? (
                    <MaterialCommunityIcons name={`dice-${dice}`} size={44} color={colors[currentPlayer?.color] || '#334155'} />
                ) : (
                    <Ionicons name="cube" size={36} color="#475569" />
                )}
            </View>
            <Text style={styles.diceText}>{isMyTurn ? (phase === 'ROLL' ? "TAP TO ROLL" : "PICK A TOKEN") : "WAITING..."}</Text>
          </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: '#0f172a', paddingVertical: 10 },
  headerRow: { flexDirection: 'row', width: BOARD_SIZE, justifyContent: 'space-between', marginBottom: 15 },
  footerRow: { flexDirection: 'row', width: BOARD_SIZE, justifyContent: 'space-between', marginTop: 15 },
  boardWrapper: { padding: 6, backgroundColor: '#1e293b', borderRadius: 16, ...SHADOWS.xl },
  board: { width: BOARD_SIZE, height: BOARD_SIZE, backgroundColor: '#0f172a', position: 'relative', overflow: 'hidden', borderRadius: 8 },
  baseArea: { position: 'absolute', width: CELL_SIZE*6, height: CELL_SIZE*6, padding: CELL_SIZE*0.8 },
  baseWhite: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cell: { position: 'absolute', width: CELL_SIZE, height: CELL_SIZE, borderWidth: 0.5, justifyContent: 'center', alignItems: 'center' },
  centerArea: { position: 'absolute', top: CELL_SIZE*6, left: CELL_SIZE*6, width: CELL_SIZE*3, height: CELL_SIZE*3 },
  tri: { position: 'absolute', width: 0, height: 0, borderStyle: 'solid', backgroundColor: 'transparent' },
  
  tokenWrapper: { position: 'absolute', width: CELL_SIZE, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  tokenOuter: { width: 26, height: 26, borderRadius: 13, padding: 2, ...SHADOWS.md },
  tokenShine: { position: 'absolute', top: 3, left: 3, width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  tokenInner: { flex: 1, borderRadius: 11, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  tokenNumber: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  tokenIndicator: { position: 'absolute', bottom: -4, width: 6, height: 6, borderRadius: 3, ...SHADOWS.sm },

  playerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', width: (BOARD_SIZE/2) - 5 },
  playerColor: { width: 4, height: 24, borderRadius: 2, marginRight: 8 },
  playerName: { color: '#fff', fontSize: 11, fontWeight: '600', width: 80 },
  progressBar: { flexDirection: 'row', gap: 3, marginTop: 4 },
  progressDot: { width: 6, height: 6, borderRadius: 3 },

  controls: { width: '100%', marginTop: 20, alignItems: 'center' },
  diceBtn: { backgroundColor: 'rgba(30, 41, 59, 0.8)', padding: 12, borderRadius: 24, width: '60%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  diceBtnActive: { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#3b82f6', borderWidth: 2 },
  diceFace: { width: 68, height: 68, backgroundColor: '#fff', borderRadius: 16, justifyContent: 'center', alignItems: 'center', ...SHADOWS.lg },
  diceText: { color: '#94a3b8', fontSize: 12, fontWeight: '900', marginTop: 12, letterSpacing: 1.5, textTransform: 'uppercase' }
});

export default memo(LudoBoard);
