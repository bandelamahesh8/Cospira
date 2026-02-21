import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { headerStyles as styles, COLORS } from '../styles/InnerRoomScreen.styles';

const Header = ({
  roomId,
  isConnected,
  isOnline,
  participantCount,
  isHost,
  onCopyRoomCode,
  onOpenSettings,
  onOpenParticipants,
  onOpenLeaderboard,
  onLeave,
}) => {
  const signalColor = isConnected && isOnline ? COLORS.success.main : COLORS.error.main;

  return (
    <View style={styles.header}>
      {/* Left: LIVE Status + Signal */}
      <View style={styles.headerLeft}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <Ionicons
          name="cellular"
          size={18}
          color={signalColor}
          accessible={true}
          accessibilityLabel={isOnline ? 'Connected' : 'Disconnected'}
        />
      </View>

      {/* Center: Room Code + Settings */}
      <View style={styles.headerCenter}>
        <TouchableOpacity
          onPress={onCopyRoomCode}
          accessible={true}
          accessibilityLabel="Copy room code"
          accessibilityRole="button"
        >
          <Text style={styles.roomCode}>{roomId || 'V5GNB5'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onOpenSettings}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessible={true}
          accessibilityLabel="Open settings"
          accessibilityRole="button"
        >
          <Ionicons name="settings-outline" size={16} color={COLORS.gray[500]} />
        </TouchableOpacity>
      </View>

      {/* Right: Participants + Leave */}
      <View style={styles.headerRight}>
        <TouchableOpacity
          style={[styles.userCountPill, { marginRight: 8, backgroundColor: 'rgba(251, 191, 36, 0.1)' }]}
          onPress={onOpenLeaderboard}
          accessible={true}
          accessibilityLabel="View leaderboard"
          accessibilityRole="button"
        >
          <Ionicons name="trophy-outline" size={16} color="#d97706" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.userCountPill}
          onPress={onOpenParticipants}
          accessible={true}
          accessibilityLabel={`${participantCount} participants`}
          accessibilityRole="button"
        >
          <Ionicons name="people-outline" size={16} color={COLORS.gray[600]} />
          <Text style={styles.userCountText}>{participantCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtnSmall}
          onPress={onLeave}
          accessible={true}
          accessibilityLabel={isHost ? 'End session' : 'Leave call'}
          accessibilityRole="button"
        >
          <Ionicons
            name={isHost ? 'trash-outline' : 'call-outline'}
            size={20}
            color={COLORS.error.main}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default memo(Header);
