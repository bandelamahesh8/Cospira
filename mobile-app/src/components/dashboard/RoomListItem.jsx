import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { wp, hp, normalize } from '../../utils/responsive';
import { useTheme } from '../../hooks/useTheme';

const RoomListItem = ({ title, userCount, capacity, isLive, requiresPassword, lastActive, thumbnail, members, onPress, status }) => {
  const { colors, isDark } = useTheme();
  
  const isStartingSoon = status === 'starting-soon';
  const isLocked = status === 'locked' || (requiresPassword && status !== 'active');

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        isLive && styles.liveContainer,
        isStartingSoon && styles.soonContainer,
        isLocked && styles.lockedContainer
      ]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.thumbnailBox}>
        <Image 
          source={thumbnail ? { uri: thumbnail } : require('../../../assets/images/logo.png')} 
          style={[styles.thumbnail, isLocked && { grayscale: 1 }]} 
        />
        {isLive && (
          <View style={styles.liveIndicatorShadow}>
            <Ionicons name="eye" size={12} color="#fff" />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.statusRow}>
          {isLive && (
            <>
              <View style={styles.pulseDot} />
              <Text style={styles.statusLabel}>ACTIVE NOW</Text>
            </>
          )}
          {isStartingSoon && (
            <Text style={styles.soonLabel}>STARTING SOON • STARTS IN 8M</Text>
          )}
          {isLocked && (
            <Text style={styles.idleLabel}>IDLE</Text>
          )}
        </View>

        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          {requiresPassword && (
            <Ionicons name={isLocked ? "lock-closed" : "lock-open"} size={14} color="#94a3b8" style={{marginLeft: 4}} />
          )}
        </View>

        {lastActive && <Text style={styles.lastActive}>{lastActive}</Text>}

        <View style={styles.footer}>
          <View style={styles.memberAvatars}>
            {members && members.slice(0, 3).map((m, idx) => (
              <View key={idx} style={[styles.miniAvatar, { marginLeft: idx > 0 ? -normalize(8) : 0, zIndex: 5 - idx }]}>
                {m.image ? <Image source={{ uri: m.image }} style={styles.avatarImg} /> : <View style={styles.avatarPlace} />}
              </View>
            ))}
          </View>
          <View style={styles.countBox}>
            <Ionicons name="people" size={12} color="#94a3b8" />
            <Text style={styles.countText}>{userCount || 0}/{capacity || 20}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={[
            styles.joinBtn, 
            isStartingSoon && styles.requestBtn,
            isLocked && styles.lockedBtn
        ]}
        onPress={onPress}
        disabled={isLocked}
      >
        <Text style={[styles.joinBtnText, isStartingSoon && styles.requestBtnText, isLocked && styles.lockedBtnText]}>
          {isLive ? 'Join' : isStartingSoon ? 'Request' : 'Locked'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: normalize(12),
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 12,
  },
  liveContainer: {
    backgroundColor: '#fff',
    borderColor: 'rgba(47, 107, 255, 0.6)',
    borderWidth: 1.5,
    shadowColor: '#0B1F3A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 4,
    transform: [{ scale: 1.02 }],
  },
  soonContainer: {
    borderColor: 'rgba(47, 107, 255, 0.3)',
  },
  lockedContainer: {
    opacity: 0.6,
  },
  thumbnailBox: {
    width: normalize(56),
    height: normalize(56),
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#e2e8f0',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  liveIndicatorShadow: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    padding: 2,
    backdropFilter: 'blur(4px)',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2F6BFF',
    marginRight: 6,
  },
  statusLabel: {
    fontSize: normalize(9),
    fontWeight: '800',
    color: '#2F6BFF',
    letterSpacing: 0.5,
  },
  soonLabel: {
    fontSize: normalize(9),
    fontWeight: '800',
    color: '#d97706',
    letterSpacing: 0.5,
  },
  idleLabel: {
    fontSize: normalize(9),
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: normalize(14),
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Space Grotesk',
  },
  lastActive: {
    fontSize: normalize(9),
    color: '#94a3b8',
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  memberAvatars: {
    flexDirection: 'row',
  },
  miniAvatar: {
    width: normalize(20),
    height: normalize(20),
    borderRadius: normalize(10),
    backgroundColor: '#e2e8f0',
    borderWidth: 1.5,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlace: {
    flex: 1,
    backgroundColor: '#CBD5E1',
  },
  countBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countText: {
    fontSize: normalize(10),
    color: '#64748b',
    fontWeight: '600',
  },
  joinBtn: {
    backgroundColor: '#0B1F3A',
    paddingHorizontal: normalize(16),
    paddingVertical: normalize(8),
    borderRadius: 10,
    shadowColor: '#2F6BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  joinBtnText: {
    color: '#fff',
    fontSize: normalize(12),
    fontWeight: 'bold',
  },
  requestBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  requestBtnText: {
    color: '#64748b',
  },
  lockedBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowOpacity: 0,
    elevation: 0,
  },
  lockedBtnText: {
    color: '#cbd5e1',
  }
});

export default RoomListItem;
