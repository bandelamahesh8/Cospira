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
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../hooks/useTheme';
import GlassCard from '../../components/cards/GlassCard';
import { friendsService } from '../../services/friends.service';
import { socketService } from '../../services/socket.service';
import { authStore } from '../../store/authStore';
import LoadingState from '../../components/loading/LoadingState';

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
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    
    const unsubscribe = friendsService.subscribe((event, data) => {
      switch (event) {
        case 'friend_request_received':
        case 'friend_request_accepted':
        case 'presence_update':
        case 'friend_status_change':
          loadData();
          break;
      }
    });

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
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
      Alert.alert('Success', 'Friend request sent!');
      setShowSearchModal(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await friendsService.acceptFriendRequest(requestId);
      Alert.alert('Success', 'Friend request accepted!');
    } catch (error) {
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      await friendsService.declineFriendRequest(requestId);
    } catch (error) {
      Alert.alert('Error', 'Failed to decline friend request');
    }
  };

  const handleInviteToRoom = async (friend) => {
    try {
      // Get current room or show room selection
      const currentRoom = socketService.getCurrentRoom();
      if (currentRoom) {
        await friendsService.inviteToRoom(friend.id, currentRoom.id);
        Alert.alert('Success', `Invitation sent to ${friend.displayName}`);
        setInviteModalVisible(false);
      } else {
        Alert.alert('No Room', 'Please join a room first');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send invitation');
    }
  };

  const handleRemoveFriend = async (friendId) => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await friendsService.removeFriend(friendId);
              Alert.alert('Success', 'Friend removed');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove friend');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#4ade80';
      case 'away': return '#fbbf24';
      case 'busy': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online': return 'Online';
      case 'away': return 'Away';
      case 'busy': return 'Busy';
      case 'in_game': return 'In Game';
      default: return 'Offline';
    }
  };

  const renderFriendItem = ({ item }) => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <GlassCard variant="dark" style={styles.friendCard}>
        <TouchableOpacity
          style={styles.friendContent}
          onLongPress={() => setSelectedFriend(item)}
          onPress={() => setSelectedFriend(item)}
        >
          <View style={styles.friendInfo}>
            <View style={styles.avatarContainer}>
              {item.profileImage ? (
                <Image source={{ uri: item.profileImage }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>
                    {item.displayName?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <View style={[
                styles.statusIndicator,
                { backgroundColor: getStatusColor(item.presence?.status) }
              ]} />
            </View>
            
            <View style={styles.friendDetails}>
              <Text style={[styles.friendName, { color: colors.text }]}>
                {item.displayName}
              </Text>
              <View style={styles.statusRow}>
                <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                  {getStatusText(item.presence?.status)}
                </Text>
                {item.presence?.currentRoom && (
                  <Text style={[styles.roomText, { color: colors.primary }]}>
                    🏠 {item.presence.currentRoom}
                  </Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.friendActions}>
            {item.presence?.status === 'online' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={() => handleInviteToRoom(item)}
              >
                <Ionicons name="person-add" size={16} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={() => handleRemoveFriend(item.id)}
            >
              <Ionicons name="remove" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </GlassCard>
    </Animated.View>
  );

  const renderRequestItem = (request) => (
    <GlassCard variant="dark" style={styles.requestCard}>
      <View style={styles.requestContent}>
        <View style={styles.requestInfo}>
          <View style={styles.avatarContainer}>
            {request.sender.profileImage ? (
              <Image source={{ uri: request.sender.profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>
                  {request.sender.displayName?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.requestDetails}>
            <Text style={[styles.requestName, { color: colors.text }]}>
              {request.sender.displayName}
            </Text>
            {request.message && (
              <Text style={[styles.requestMessage, { color: colors.textSecondary }]}>
                {request.message}
              </Text>
            )}
            <Text style={[styles.requestTime, { color: colors.textSecondary }]}>
              {new Date(request.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.acceptButton, { backgroundColor: colors.primary }]}
            onPress={() => handleAcceptRequest(request.id)}
          >
            <Ionicons name="check" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.declineButton, { backgroundColor: colors.surface }]}
            onPress={() => handleDeclineRequest(request.id)}
          >
            <Ionicons name="close" size={16} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </GlassCard>
  );

  const renderSearchResult = (user) => {
    const status = friendsService.getFriendshipStatus(user.id);
    
    return (
      <GlassCard variant="dark" style={styles.searchResultCard}>
        <View style={styles.searchContent}>
          <View style={styles.searchInfo}>
            <View style={styles.avatarContainer}>
              {user.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>
                    {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.searchDetails}>
              <Text style={[styles.searchName, { color: colors.text }]}>
                {user.displayName}
              </Text>
              <Text style={[styles.searchUsername, { color: colors.textSecondary }]}>
                @{user.username}
              </Text>
            </View>
          </View>

          <View style={styles.searchActions}>
            {status === 'friends' ? (
              <Text style={[styles.alreadyFriendsText, { color: colors.primary }]}>
                Friends
              </Text>
            ) : status === 'pending' ? (
              <Text style={[styles.pendingText, { color: colors.textSecondary }]}>
                Pending
              </Text>
            ) : (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => handleSendFriendRequest(user.id)}
              >
                <Ionicons name="person-add" size={16} color="#fff" />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </GlassCard>
    );
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Friends</Text>
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: colors.surface }]}
          onPress={() => setShowSearchModal(true)}
        >
          <Ionicons name="search" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'friends' ? colors.primary : colors.textSecondary }
          ]}>
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'requests' ? colors.primary : colors.textSecondary }
          ]}>
            Requests ({friendRequests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'online' && styles.activeTab]}
          onPress={() => setActiveTab('online')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'online' ? colors.primary : colors.textSecondary }
          ]}>
            Online ({friends.filter(f => f.presence?.status === 'online').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'friends' && (
          <FlatList
            data={friends}
            renderItem={renderFriendItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}

        {activeTab === 'requests' && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            <View style={styles.requestsContainer}>
              {friendRequests.length > 0 ? (
                friendRequests.map(renderRequestItem)
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="person-off" size={48} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No friend requests
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {activeTab === 'online' && (
          <FlatList
            data={friends.filter(f => f.presence?.status === 'online')}
            renderItem={renderFriendItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="moon" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No friends online
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSearchModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Find Friends</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text, backgroundColor: colors.surface }]}
              placeholder="Search by name or username..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={handleSearch}
              autoFocus
            />
          </View>

          {searchLoading && (
            <View style={styles.searchLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.searchLoadingText, { color: colors.textSecondary }]}>
                Searching...
              </Text>
            </View>
          )}

          <ScrollView contentContainerStyle={styles.searchResults}>
            {searchResults.map(renderSearchResult)}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Friend Options Modal */}
      <Modal
        visible={!!selectedFriend}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedFriend(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.optionsModal, { backgroundColor: colors.surface }]}>
            {selectedFriend && (
              <>
                <View style={styles.optionsHeader}>
                  <Text style={[styles.optionsTitle, { color: colors.text }]}>
                    {selectedFriend.displayName}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedFriend(null)}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.optionsContent}>
                  <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => handleInviteToRoom(selectedFriend)}
                  >
                    <Ionicons name="home" size={20} color={colors.primary} />
                    <Text style={[styles.optionText, { color: colors.text }]}>
                      Invite to Room
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.optionItem}>
                    <Ionicons name="chatbubble" size={20} color={colors.primary} />
                    <Text style={[styles.optionText, { color: colors.text }]}>
                      Send Message
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.optionItem}>
                    <Ionicons name="call" size={20} color={colors.primary} />
                    <Text style={[styles.optionText, { color: colors.text }]}>
                      Voice Call
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => handleRemoveFriend(selectedFriend.id)}
                  >
                    <Ionicons name="person-remove" size={20} color="#ef4444" />
                    <Text style={[styles.optionText, { color: '#ef4444' }]}>
                      Remove Friend
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  friendCard: {
    marginBottom: 12,
  },
  friendContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 4,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
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
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#1e293b',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  roomText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  friendActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  requestsContainer: {
    paddingBottom: 20,
  },
  requestCard: {
    marginBottom: 12,
  },
  requestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 4,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestDetails: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  requestMessage: {
    fontSize: 14,
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 12,
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  declineButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    borderRadius: 12,
  },
  searchLoading: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  searchLoadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  searchResults: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchResultCard: {
    marginBottom: 12,
  },
  searchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 4,
  },
  searchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  searchDetails: {
    flex: 1,
  },
  searchName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  searchUsername: {
    fontSize: 14,
  },
  searchActions: {
    alignItems: 'flex-end',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  alreadyFriendsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pendingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsModal: {
    width: screenWidth * 0.9,
    borderRadius: 16,
    padding: 20,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  optionsContent: {
    paddingBottom: 10,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 16,
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
});

export default FriendsScreen;
