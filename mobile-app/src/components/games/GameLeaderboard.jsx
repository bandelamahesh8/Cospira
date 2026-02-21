
import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, BORDER_RADIUS, SHADOWS, SPACING, FONT_SIZE, FONT_WEIGHT } from '../../screens/room/InnerRoomScreen/styles/InnerRoomScreen.styles';

const GameLeaderboard = ({ stats = [], onClose }) => {
  // stats: [{ id, name, avatarUrl, wins, losses, draws }]
  
  const sortedStats = [...stats].sort((a, b) => b.wins - a.wins);

  return (
    <View style={localStyles.overlay}>
      <View style={localStyles.container}>
        <View style={localStyles.header}>
            <View style={localStyles.titleBox}>
                <Ionicons name="trophy" size={24} color="#fbbf24" style={{ marginRight: 8 }} />
                <Text style={localStyles.title}>Room Leaderboard</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={localStyles.closeBtn}>
                <Ionicons name="close" size={24} color={COLORS.gray[500]} />
            </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={localStyles.listContent}>
            {sortedStats.length > 0 ? (
                sortedStats.map((player, index) => (
                    <View key={player.id} style={localStyles.playerRow}>
                        <View style={localStyles.rankBox}>
                            <Text style={[localStyles.rankText, index === 0 && localStyles.firstPlace]}>
                                #{index + 1}
                            </Text>
                        </View>
                        
                        <View style={localStyles.playerAvatar}>
                            {player.avatarUrl ? (
                                <Image source={{ uri: player.avatarUrl }} style={localStyles.avatarImage} />
                            ) : (
                                <View style={localStyles.avatarPlaceholder}>
                                    <Text style={localStyles.avatarInitial}>{player.name ? player.name[0].toUpperCase() : '?'}</Text>
                                </View>
                            )}
                        </View>

                        <View style={localStyles.playerInfo}>
                            <Text style={localStyles.playerName} numberOfLines={1}>{player.name}</Text>
                            <View style={localStyles.statsRow}>
                                <Text style={localStyles.statItem}><Text style={localStyles.statWin}>{player.wins}W</Text></Text>
                                <Text style={localStyles.statDivider}>•</Text>
                                <Text style={localStyles.statItem}><Text style={localStyles.statLoss}>{player.losses}L</Text></Text>
                            </View>
                        </View>

                        <View style={localStyles.scoreBox}>
                            <Text style={localStyles.scoreText}>{player.wins * 10 - player.losses * 2} pts</Text>
                        </View>
                    </View>
                ))
            ) : (
                <View style={localStyles.emptyState}>
                    <Ionicons name="game-controller-outline" size={48} color={COLORS.gray[300]} />
                    <Text style={localStyles.emptyText}>No matches played yet</Text>
                    <Text style={localStyles.emptySubtext}>Start a game and compete!</Text>
                </View>
            )}
        </ScrollView>
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      paddingTop: 60,
      paddingHorizontal: 20,
      zIndex: 1000,
  },
  container: {
      backgroundColor: '#fff',
      borderRadius: BORDER_RADIUS.xl,
      maxHeight: 400,
      ...SHADOWS.xl,
      overflow: 'hidden',
  },
  header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.gray[100],
  },
  titleBox: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: COLORS.gray[900],
  },
  closeBtn: {
      padding: 4,
  },
  listContent: {
      padding: SPACING.md,
  },
  playerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.gray[50],
  },
  rankBox: {
      width: 30,
      alignItems: 'center',
  },
  rankText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: COLORS.gray[400],
  },
  firstPlace: {
      color: '#fbbf24',
      fontSize: 16,
  },
  playerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      overflow: 'hidden',
      marginHorizontal: 12,
  },
  avatarImage: {
      width: '100%',
      height: '100%',
  },
  avatarPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: COLORS.primary.surface,
      justifyContent: 'center',
      alignItems: 'center',
  },
  avatarInitial: {
      color: COLORS.primary.main,
      fontWeight: 'bold',
  },
  playerInfo: {
      flex: 1,
  },
  playerName: {
      fontSize: 14,
      fontWeight: 'bold',
      color: COLORS.gray[800],
      marginBottom: 2,
  },
  statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  statItem: {
      fontSize: 12,
  },
  statWin: {
      color: COLORS.success.main,
      fontWeight: 'bold',
  },
  statLoss: {
      color: COLORS.error.main,
  },
  statDivider: {
      marginHorizontal: 6,
      color: COLORS.gray[300],
  },
  scoreBox: {
      backgroundColor: COLORS.gray[50],
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
  },
  scoreText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: COLORS.gray[600],
  },
  emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
  },
  emptyText: {
      marginTop: 10,
      fontSize: 16,
      color: COLORS.gray[600],
      fontWeight: 'bold',
  },
  emptySubtext: {
      fontSize: 12,
      color: COLORS.gray[400],
  }
});

export default memo(GameLeaderboard);
