import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
  FlatList,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import GlassCard from '../../components/cards/GlassCard';
import { friendsService } from '../../services/friends.service';
import { socketService } from '../../services/socket.service';
import { authStore } from '../../store/authStore';
import LoadingState from '../../components/loading/LoadingState';
import { normalize, wp, hp } from '../../utils/responsive';

const { width: screenWidth } = Dimensions.get('window');

const FriendsScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  
  // -- Animations --
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tabSlideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    
    const unsubscribe = friendsService.subscribe((event, data) => {
      if (['friend_request_received', 'friend_request_accepted', 'presence_update', 'friend_status_change'].includes(event)) {
        loadData();
      }
    });

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    return () => unsubscribe();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const friendsData = friendsService.getFriends();
      const requestsData = friendsService.getFriendRequests();
      setFriends(friendsData);
      setFriendRequests(requestsData);
    } catch (error) {
      console.error('[FriendsScreen] Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setSearchLoading(true);
      const results = await friendsService.searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      console.error('[FriendsScreen] Search error:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendFriendRequest = async (userId) => {
    try {
      await friendsService.sendFriendRequest(userId, 'Let\'s be friends!');
      Alert.alert('Uplink Successful', 'Friend request has been transmitted.');
      setShowSearchModal(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      Alert.alert('Transmission Error', 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await friendsService.acceptFriendRequest(requestId);
      loadData();
    } catch (error) {
      Alert.alert('Operation Failed', 'Could not accept request at this time.');
    }
  };

  const handleInviteToRoom = async (friend) => {
    const currentRoom = socketService.getCurrentRoom();
    if (currentRoom) {
      try {
        await friendsService.inviteToRoom(friend.id, currentRoom.id);
        Alert.alert('Invite Sent', `Invitation shared with ${friend.displayName}`);
      } catch (error) {
        Alert.alert('Invite Failed', 'Failed to send invitation');
      }
    } else {
      Alert.alert('No Active Session', 'Jump into a room first to invite friends.');
    }
  };

  const handleRemoveFriend = async (friendId) => {
    Alert.alert(
      'Sever Connection?',
      'Are you sure you want to remove this agent from your network?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await friendsService.removeFriend(friendId);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove connection');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#10b981';
      case 'away': return '#f59e0b';
      case 'busy': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const renderFriendItem = ({ item, index }) => {
    const slideOffset = new Animated.Value(50);
    const opacity = new Animated.Value(0);

    Animated.parallel([
      Animated.timing(slideOffset, { toValue: 0, duration: 400, delay: index * 100, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, delay: index * 100, useNativeDriver: true })
    ]).start();

    return (
      <Animated.View style={{ opacity, transform: [{ translateY: slideOffset }] }}>
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => setSelectedFriend(item)}
          style={styles.friendCardContainer}
        >
          <GlassCard variant={isDark ? "dark" : "light"} style={styles.friendCard}>
            <View style={styles.friendLayout}>
              <View style={styles.avatarZone}>
                <View style={[styles.statusHalo, { borderColor: getStatusColor(item.presence?.status) }]}>
                  {item.profileImage ? (
                    <Image source={{ uri: item.profileImage }} style={styles.avatarImg} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                      <Text style={styles.avatarTxt}>{item.displayName?.charAt(0)?.toUpperCase()}</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.presence?.status) }]} />
              </View>

              <View style={styles.infoZone}>
                <Text style={[styles.friendName, { color: colors.text }]}>{item.displayName}</Text>
                <View style={styles.statusRow}>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                    {item.presence?.status || 'offline'}
                  </Text>
                  {item.presence?.currentRoom && (
                    <View style={[styles.roomBadge, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[styles.roomText, { color: colors.primary }]}>In: {item.presence.currentRoom}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.actionZone}>
                {item.presence?.status === 'online' && (
                  <TouchableOpacity 
                    style={[styles.smallActionBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleInviteToRoom(item)}
                  >
                    <Ionicons name="flash-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={[styles.smallActionBtn, { backgroundColor: colors.surface }]}
                  onPress={() => handleRemoveFriend(item.id)}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </GlassCard>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderRequestItem = ({ item }) => (
    <GlassCard variant={isDark ? "dark" : "light"} style={styles.requestCard}>
      <View style={styles.requestLayout}>
        <View style={styles.requestAvatarBox}>
          {item.sender.profileImage ? (
            <Image source={{ uri: item.sender.profileImage }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: '#8B5CF6' }]}>
              <Text style={styles.avatarTxt}>{item.sender.displayName?.charAt(0)}</Text>
            </View>
          )}
        </View>
        <View style={styles.requestContent}>
          <Text style={[styles.requestName, { color: colors.text }]}>{item.sender.displayName}</Text>
          <Text style={[styles.requestSub, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.message || "Wants to join your network"}
          </Text>
        </View>
        <View style={styles.requestButtons}>
          <TouchableOpacity style={[styles.reqBtn, styles.acceptBtn]} onPress={() => handleAcceptRequest(item.id)}>
            <Ionicons name="checkmark" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.reqBtn, styles.declineBtn]} onPress={() => friendsService.declineFriendRequest(item.id)}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </GlassCard>
  );

  if (loading) return <LoadingState />;

  const onlineFriends = friends.filter(f => f.presence?.status === 'online');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient 
        colors={isDark ? ['#0F172A', '#020617'] : ['#F8FAFC', '#F1F5F9']} 
        style={styles.gradientBg} 
      />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Spaces</Text>
          <View style={styles.activeRow}>
            <View style={styles.pulseDot} />
            <Text style={[styles.activeCount, { color: colors.textSecondary }]}>
              {onlineFriends.length} Agents active
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.headerSearchBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
          onPress={() => setShowSearchModal(true)}
        >
          <Ionicons name="search" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabContainer}>
        <View style={[styles.tabLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
          {['friends', 'requests', 'online'].map((tab) => (
            <TouchableOpacity 
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={styles.tabItem}
            >
              <Text style={[
                styles.tabLabel, 
                { color: activeTab === tab ? colors.primary : colors.textSecondary }
              ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              {activeTab === tab && (
                <View style={[styles.activeTabIndicator, { backgroundColor: colors.primary }]} />
              )}
              {tab === 'requests' && friendRequests.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{friendRequests.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {activeTab === 'friends' && (
          <FlatList
            data={friends}
            renderItem={renderFriendItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Connections Yet</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Invite your crew to start collaborating</Text>
                <TouchableOpacity style={styles.emptyAction} onPress={() => setShowSearchModal(true)}>
                  <Text style={[styles.emptyActionText, { color: colors.primary }]}>Find Collaborators</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}

        {activeTab === 'requests' && (
          <FlatList
             data={friendRequests}
             renderItem={renderRequestItem}
             keyExtractor={item => item.id}
             contentContainerStyle={styles.listContainer}
             showsVerticalScrollIndicator={false}
             ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="mail-unread-outline" size={64} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Inbox Empty</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>No pending transmission requests</Text>
              </View>
            }
          />
        )}

        {activeTab === 'online' && (
          <FlatList
            data={onlineFriends}
            renderItem={renderFriendItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="moon-outline" size={64} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Shadow Protocol Active</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>No friends are currently broadcasting presence</Text>
              </View>
            }
          />
        )}
      </Animated.View>

      {/* Search Modal */}
      <Modal visible={showSearchModal} animationType="slide" transparent={false}>
          <SafeAreaView style={[styles.searchModal, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowSearchModal(false)} style={styles.modalClose}>
                <Ionicons name="chevron-down" size={32} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Find Agents</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.searchInputBox}>
              <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput 
                style={[styles.searchField, { color: colors.text, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                placeholder="Search name or ID..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
              />
            </View>

            {searchLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 20 }}
                renderItem={({ item }) => (
                  <GlassCard variant={isDark ? "dark" : "light"} style={styles.searchResultCard}>
                    <View style={styles.searchResultContent}>
                       <View style={styles.resultAvatar}>
                        {item.profileImage ? (
                          <Image source={{ uri: item.profileImage }} style={styles.avatarImg} />
                        ) : (
                          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                            <Text style={styles.avatarTxt}>{item.displayName?.charAt(0)}</Text>
                          </View>
                        )}
                       </View>
                       <View style={{ flex: 1, marginLeft: 16 }}>
                         <Text style={[styles.resultName, { color: colors.text }]}>{item.displayName}</Text>
                         <Text style={[styles.resultUser, { color: colors.textSecondary }]}>@{item.username}</Text>
                       </View>
                       <TouchableOpacity 
                         style={[styles.addBtnModal, { backgroundColor: colors.primary }]}
                         onPress={() => handleSendFriendRequest(item.id)}
                       >
                         <Ionicons name="person-add" size={18} color="#fff" />
                       </TouchableOpacity>
                    </View>
                  </GlassCard>
                )}
                ListEmptyComponent={searchQuery.length > 1 ? (
                  <Text style={[styles.noResults, { color: colors.textSecondary }]}>No agents found on this frequency</Text>
                ) : null}
              />
            )}
          </SafeAreaView>
      </Modal>

      {/* Friend Options Modal */}
      <Modal visible={!!selectedFriend} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setSelectedFriend(null)}
        >
          <View style={[styles.bottomSheet, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetAvatarBox}>
                  {selectedFriend?.profileImage ? (
                    <Image source={{ uri: selectedFriend.profileImage }} style={styles.sheetAvatar} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary, width: 60, height: 60, borderRadius: 30 }]}>
                      <Text style={[styles.avatarTxt, { fontSize: 24 }]}>{selectedFriend?.displayName?.charAt(0)}</Text>
                    </View>
                  )}
              </View>
              <Text style={[styles.sheetName, { color: colors.text }]}>{selectedFriend?.displayName}</Text>
              <Text style={[styles.sheetStatus, { color: colors.textSecondary }]}>{selectedFriend?.presence?.status}</Text>
            </View>

            <View style={styles.sheetOptions}>
              <TouchableOpacity style={styles.sheetBtn} onPress={() => handleInviteToRoom(selectedFriend)}>
                <Ionicons name="megaphone-outline" size={24} color={colors.primary} />
                <Text style={[styles.sheetBtnText, { color: colors.text }]}>Invite to Session</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetBtn}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.primary} />
                <Text style={[styles.sheetBtnText, { color: colors.text }]}>Direct Message</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetBtn, { marginTop: 12 }]} onPress={() => handleRemoveFriend(selectedFriend.id)}>
                <Ionicons name="close-circle-outline" size={24} color="#ef4444" />
                <Text style={[styles.sheetBtnText, { color: '#ef4444' }]}>Terminate Uplink</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradientBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: hp(2),
    paddingBottom: 24,
  },
  title: {
    fontSize: normalize(28),
    fontWeight: '900',
    letterSpacing: -1,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowRadius: 4,
    shadowOpacity: 0.5,
  },
  activeCount: {
    fontSize: normalize(12),
    fontWeight: '700',
    opacity: 0.8,
  },
  headerSearchBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  tabLine: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 14,
    padding: 6,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: normalize(13),
    fontWeight: '800',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 20,
    height: 3,
    borderRadius: 2,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 8,
    backgroundColor: '#ef4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  content: { flex: 1 },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: hp(10),
  },
  friendCardContainer: {
    marginBottom: 12,
  },
  friendCard: {
    borderRadius: 24,
    padding: 12,
  },
  friendLayout: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarZone: {
    position: 'relative',
  },
  statusHalo: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTxt: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#020617', // Match bg
  },
  infoZone: {
    flex: 1,
    marginLeft: 16,
  },
  friendName: {
    fontSize: normalize(16),
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 8,
  },
  statusLabel: {
    fontSize: normalize(12),
    textTransform: 'capitalize',
    fontWeight: '600',
    opacity: 0.6,
  },
  roomBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roomText: {
    fontSize: normalize(10),
    fontWeight: '800',
  },
  actionZone: {
    flexDirection: 'row',
    gap: 8,
  },
  smallActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 24,
  },
  requestLayout: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestAvatarBox: {
    width: 44,
    height: 44,
  },
  requestContent: {
    flex: 1,
    marginLeft: 12,
  },
  requestName: {
    fontSize: 15,
    fontWeight: '800',
  },
  requestSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  requestButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  reqBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtn: { backgroundColor: '#10b981' },
  declineBtn: { backgroundColor: '#ef4444' },
  emptyState: {
    alignItems: 'center',
    marginTop: hp(10),
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
    paddingHorizontal: 40,
  },
  emptyAction: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  emptyActionText: {
    fontWeight: '800',
    fontSize: 14,
  },
  searchModal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
  },
  modalClose: { padding: 4 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  searchInputBox: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 40,
    zIndex: 2,
  },
  searchField: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    paddingLeft: 46,
    paddingRight: 20,
    fontSize: 16,
    fontWeight: '700',
  },
  searchResultCard: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 20,
  },
  searchResultContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultName: { fontSize: 16, fontWeight: '800' },
  resultUser: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  addBtnModal: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResults: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 24,
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  sheetAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#3b82f6',
  },
  sheetName: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 16,
  },
  sheetStatus: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 4,
    opacity: 0.6,
  },
  sheetOptions: {
    gap: 12,
  },
  sheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 16,
  },
  sheetBtnText: {
    fontSize: 16,
    fontWeight: '800',
  },
});

export default FriendsScreen;
