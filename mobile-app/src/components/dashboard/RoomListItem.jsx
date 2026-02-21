import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import PressableScale from '../animations/PressableScale';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { wp, hp, normalize } from '../../utils/responsive';
import { useTheme } from '../../hooks/useTheme';

const RoomListItem = ({ title, subtitle, tags, members, userCount, isLive, matchPercentage, type, rating, capacity, variant, requiresPassword, status, onPress }) => {
  const { colors, isDark } = useTheme();
  if (variant === 'high-fidelity') {
    const isAI = type === 'AI';
    const activeColor = isAI ? '#8b5cf6' : '#3b82f6';
    
    return (
      <PressableScale style={[styles.hiFiContainer, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress}>
        <View style={styles.hiFiIconContainer}>
            <View style={[styles.hiFiIconCircle, { backgroundColor: isDark ? colors.background : '#f1f5f9' }]}>
                <MaterialCommunityIcons 
                    name={isAI ? 'brain' : 'controller-classic'} 
                    size={normalize(20)} 
                    color={isDark ? colors.text : colors.primary} 
                />
            </View>
        </View>
        <View style={styles.hiFiContent}>
            <Text style={[styles.hiFiTitle, { color: colors.text }]}>{title}</Text>
            <View style={styles.hiFiSubtitleRow}>
                <Text style={[styles.hiFiSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
            </View>
            
        </View>

        <View style={[styles.statusBadge, { backgroundColor: isDark ? '#161A23' : '#f1f5f9', borderColor: requiresPassword ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)' }]}>
            <Text style={[styles.statusText, { color: requiresPassword ? '#f87171' : '#4ade80' }]}>
                {requiresPassword ? 'Private' : 'Public'}
            </Text>
        </View>
      </PressableScale>
    );
  }

  const isFull = status === 'full';
  
  return (
    <PressableScale style={[styles.container, isFull && { opacity: 0.7 }]} onPress={isFull ? null : onPress} disabled={isFull}>
      <View style={[styles.card, { backgroundColor: isDark ? colors.surface : 'rgba(255, 255, 255, 0.6)', borderColor: isFull ? colors.danger : (isDark ? colors.border : 'rgba(255, 255, 255, 0.8)') }]}>
        <View style={styles.header}>
            <View style={styles.iconContainer}>
                 <Ionicons name="flash-outline" size={normalize(20)} color="#ffffff" />
            </View>
            <View style={styles.titleSection}>
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                <View style={styles.userCountRow}>
                   <Ionicons name="people" size={12} color={isFull ? colors.danger : colors.textSecondary} style={{ marginRight: 4 }} />
                   <Text style={[styles.tags, { color: isFull ? colors.danger : colors.textSecondary }]}>
                     {userCount || 0}/{capacity || 50} • {tags.join(' • ')}
                   </Text>
                </View>
            </View>
            <View style={[styles.joinButton, { backgroundColor: isFull ? colors.border : (isDark ? colors.background : '#ffffff'), borderColor: colors.border }]}>
                <Text style={[styles.joinText, isFull && { color: colors.textSecondary }]}>{isFull ? 'FULL' : (requiresPassword ? 'Connect' : 'Join')}</Text>
                <Ionicons 
                    name={isFull ? "close-circle" : (requiresPassword ? "lock-closed" : "chevron-forward")} 
                    size={14} 
                    color={isFull ? colors.textSecondary : "#7b61ff"} 
                />
            </View>
        </View>

        <View style={styles.footer}>
            <View style={styles.membersRow}>
                {members && Array.isArray(members) && members.map((member, index) => (
                    <View key={index} style={[styles.memberAvatar, { marginLeft: index > 0 ? -12 : 0, zIndex: 10 - index }]}>
                        {member.image ? (
                            <Image source={{ uri: member.image }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: ['#bfdbfe', '#fef3c7', '#dcfce7'][index % 3] }]}>
                                <Text style={styles.placeholderText}>{member.name[0]}</Text>
                            </View>
                        )}
                    </View>
                ))}
            </View>
            {matchPercentage && (
                <View style={[styles.badgeContainer, { backgroundColor: isDark ? colors.background : '#ffffff', borderColor: colors.border }]}>
                    <Text style={[styles.matchText, { color: colors.textSecondary }]}>{matchPercentage}% Match</Text>
                    {isLive && (
                        <>
                            <View style={[styles.badgeDivider, { backgroundColor: colors.border }]} />
                            <Text style={styles.liveText}>LIVE</Text>
                        </>
                    )}
                </View>
            )}
        </View>
      </View>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  // High-fidelity variant styles
  hiFiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 18, // Slightly increased
    marginBottom: 16,
    borderWidth: 1,
    // Soft gradient effect via background color or simple shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  hiFiIconContainer: {
    // This style was not explicitly in the user's snippet, but it's part of the hiFiContainer structure
  },
  hiFiIconCircle: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hiFiTitle: {
    fontSize: normalize(15),
    fontWeight: '600',
    marginBottom: 2,
  },
  hiFiSubtitle: {
    fontSize: normalize(11),
    fontWeight: '400',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: normalize(9),
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Legacy Styles
  container: {
    marginBottom: hp(2),
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: normalize(28),
    padding: normalize(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  iconContainer: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(12),
    backgroundColor: '#7b61ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: normalize(16),
    fontWeight: '700',
    color: '#1e293b',
  },
  tags: {
    fontSize: normalize(12),
    color: '#94a3b8',
    marginTop: 2,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  joinText: {
    fontSize: normalize(13),
    fontWeight: '600',
    color: '#7b61ff',
    marginRight: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  membersRow: {
    flexDirection: 'row',
  },
  memberAvatar: {
    width: normalize(28),
    height: normalize(28),
    borderRadius: normalize(14),
    borderWidth: 2,
    borderColor: '#ffffff',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: normalize(10),
    fontWeight: '700',
    color: '#475569',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  matchText: {
    fontSize: normalize(10),
    fontWeight: '600',
    color: '#64748b',
  },
  badgeDivider: {
    width: 1,
    height: 10,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 6,
  },
  liveText: {
    fontSize: normalize(10),
    fontWeight: '700',
    color: '#7b61ff',
  },
});

export default RoomListItem;
