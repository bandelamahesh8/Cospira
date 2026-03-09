import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ImageBackground,
  ActivityIndicator,
  StatusBar,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import ActionCard from '../../components/dashboard/ActionCard';
import RoomListItem from '../../components/dashboard/RoomListItem';
import FeaturedEventBanner from '../../components/dashboard/FeaturedEventBanner';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FadeView from '../../components/animations/FadeView';
import { socketService } from '../../services/socket.service';
import { roomsService } from '../../services/rooms.service';
import { authStore } from '../../store/authStore';
import { wp, hp, normalize, isIOS } from '../../utils/responsive';
import { useTheme } from '../../hooks/useTheme';

import ActivityItem from '../../components/dashboard/ActivityItem';
import LoadingState from '../../components/loading/LoadingState';

const CommandHubScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const [userName, setUserName] = useState(authStore.user?.name || authStore.user?.username || 'Commander');
  
  const [recentActivities, setRecentActivities] = useState([]);
  const [isActivityVisible, setIsActivityVisible] = useState(true);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  
  // -- Create Room State --
  const [roomName, setRoomName] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [password, setPassword] = useState('');
  const [protocol, setProtocol] = useState('fun');

  // -- Join Room State --
  const [joinMethod, setJoinMethod] = useState('code'); // 'code' | 'url'
  const [joinInput, setJoinInput] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  
  // -- Loading States --
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(true);

  // -- Animations --
  const modalScale = useRef(new Animated.Value(0)).current;
  const joinModalScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (createModalVisible) {
      Animated.spring(modalScale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 15,
        stiffness: 100
      }).start();
    } else {
      modalScale.setValue(0);
    }
  }, [createModalVisible]);

  useEffect(() => {
    if (joinModalVisible) {
      Animated.spring(joinModalScale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 15,
        stiffness: 100
      }).start();
    } else {
      joinModalScale.setValue(0);
    }
  }, [joinModalVisible]);

  useEffect(() => {
    const token = authStore.token;
    socketService.connect(token);
    
    const fetchActivities = async () => {
      try {
        setLoadingActivity(true);
        
        // Ensure socket is connected before fetching
        if (!socketService.socket?.connected) {
          await socketService.connect(token);
        }
        
        const data = await socketService.getUserActivity(10);
        console.log('[Dashboard] Activities fetched:', data?.length);
        if (data) {
          setRecentActivities(data);
        }
      } catch (error) {
        console.log('[Dashboard] Activity fetch failed:', error.message);
      } finally {
        setLoadingActivity(false);
      }
    };

    fetchActivities();
    
    // Refresh activity every minute
    const interval = setInterval(fetchActivities, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const formatTimeRange = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const formatHMM = (date) => {
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; 
        const strTime = `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${ampm}`;
        return strTime;
    };

    return `${formatHMM(start)} - ${formatHMM(end)}`;
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return;
    try {
      setCreating(true);
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let roomId = '';
      for (let i = 0; i < 6; i++) roomId += chars.charAt(Math.floor(Math.random() * chars.length));
      
      const result = await roomsService.create(roomName, roomId, privacy === 'private' ? 'password' : 'public', password || "", { mode: protocol }, authStore.user);
      setCreateModalVisible(false);
      
      // Navigate to the created room
      navigation.navigate('IntelligentRoom', {
        roomId: result.roomId,
        roomName: roomName,
        isHost: true
      });
    } catch (error) {
      alert('Failed to create room: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Atmospheric Background */}
      <LinearGradient
        colors={isDark ? ['#123B6D', '#0B1F3A', '#101922'] : ['#E3EDFB', '#F5F7F8', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <DashboardHeader navigation={navigation} title="Home" />

        <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
          <FadeView delay={100}>
            <FeaturedEventBanner onPress={() => {}} />
          </FadeView>

          <View style={styles.actionsSection}>
            <FadeView delay={200}>
              <ActionCard 
                variant="wide"
                title="Create Room"
                subtitle="Start a new session with friends"
                icon="add-circle-outline"
                color="#2F6BFF"
                onPress={() => setCreateModalVisible(true)}
              />
            </FadeView>

            <View style={styles.compactActions}>
               <FadeView delay={250} style={{flex: 1}}>
                <ActionCard 
                  title="Join Room"
                  subtitle="Enter invite code"
                  icon="person-add-outline"
                  color="#10B981"
                  onPress={() => setJoinModalVisible(true)}
                />
               </FadeView>
               <FadeView delay={300} style={{flex: 1}}>
                <ActionCard 
                  title="Global Connect"
                  subtitle="Meet new players"
                  icon="globe-outline"
                  color="#F59E0B"
                  onPress={() => navigation.navigate('Global')}
                />
               </FadeView>
            </View>
          </View>

          <View style={styles.roomsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
            {isActivityVisible ? (
              <TouchableOpacity 
                style={styles.closeHeaderBtn}
                onPress={() => setIsActivityVisible(false)}
              >
                  <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setIsActivityVisible(true)}>
                  <Text style={styles.viewAll}>Show</Text>
              </TouchableOpacity>
            )}
          </View>

          {isActivityVisible && (
            <View style={styles.roomsList}>
              {loadingActivity ? (
                <LoadingState variant="activity" count={3} />
              ) : (
                recentActivities.slice(0, 5).map((activity, index) => (
                  <FadeView key={activity.id} delay={400 + (index * 100)}>
                    <ActivityItem 
                      type={activity.type}
                      title={activity.title + (activity.endTime ? ` (${formatTimeRange(activity.time, activity.endTime)})` : '')}
                      subtitle={activity.subtitle}
                      time={formatTime(activity.time)}
                      duration={activity.duration}
                    />
                  </FadeView>
                ))
              )}
              
              {!loadingActivity && recentActivities.length > 0 && (
                <View style={styles.activityActions}>
                  <TouchableOpacity onPress={() => navigation.navigate('RecentActivity')}>
                      <Text style={styles.viewAllFull}>View full activity</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {!loadingActivity && recentActivities.length === 0 && (
                <View style={styles.emptyState}>
                   <Ionicons name="calendar-outline" size={48} color={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'} />
                   <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recent activity found</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.footerSpacing} />
        </ScrollView>
      </SafeAreaView>
      
      {/* Create Room Modal (Redesigned for context) */}
      <Modal
          animationType="fade"
          transparent={true}
          visible={createModalVisible}
          onRequestClose={() => setCreateModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View 
              style={[
                styles.modalContent, 
                { 
                  backgroundColor: isDark ? '#12151C' : '#fff',
                  transform: [{ scale: modalScale }],
                  opacity: modalScale
                }
              ]}
            >
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Create Room</Text>
                    <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                        <Ionicons name="close" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Room Name</Text>
                    <TextInput 
                        style={[styles.input, { color: colors.text, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                        placeholder="e.g. Strategy Meeting"
                        placeholderTextColor="#64748b"
                        value={roomName}
                        onChangeText={setRoomName}
                    />

                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Privacy</Text>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity 
                            style={[styles.tab, privacy === 'public' && styles.activeTab]}
                            onPress={() => setPrivacy('public')}
                        >
                            <Ionicons name="globe-outline" size={18} color={privacy === 'public' ? '#fff' : colors.textSecondary} />
                            <Text style={[styles.tabText, privacy === 'public' && styles.activeTabText]}>Public</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tab, privacy === 'private' && styles.activeTab]}
                            onPress={() => setPrivacy('private')}
                        >
                            <Ionicons name="lock-closed-outline" size={18} color={privacy === 'private' ? '#fff' : colors.textSecondary} />
                            <Text style={[styles.tabText, privacy === 'private' && styles.activeTabText]}>Private</Text>
                        </TouchableOpacity>
                    </View>

                    {privacy === 'private' && (
                        <FadeView>
                             <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password</Text>
                             <TextInput 
                                 style={[styles.input, { color: colors.text, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                 placeholder="Set room password"
                                 placeholderTextColor="#64748b"
                                 secureTextEntry
                                 value={password}
                                 onChangeText={setPassword}
                             />
                        </FadeView>
                    )}

                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Protocol Mode</Text>
                    <View style={styles.protocolContainer}>
                        {['fun', 'deep', 'focus', 'mixed'].map((p) => (
                            <TouchableOpacity 
                                key={p}
                                style={[styles.protocolChip, protocol === p && styles.activeProtocol]}
                                onPress={() => setProtocol(p)}
                            >
                                <Text style={[styles.protocolText, protocol === p && styles.activeProtocolText]}>
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity 
                        style={[styles.modalSubmit, { marginTop: 20 }]}
                        onPress={handleCreateRoom}
                        disabled={creating}
                    >
                        {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Initialize Sector</Text>}
                    </TouchableOpacity>
                    
                    <View style={{height: 20}} />
                </ScrollView>
            </Animated.View>
          </View>
      </Modal>

      {/* Join Room Modal */}
      <Modal
          animationType="fade"
          transparent={true}
          visible={joinModalVisible}
          onRequestClose={() => setJoinModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View 
              style={[
                styles.modalContent, 
                { 
                  backgroundColor: isDark ? '#12151C' : '#fff',
                  transform: [{ scale: joinModalScale }],
                  opacity: joinModalScale
                }
              ]}
            >
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Join Room</Text>
                    <TouchableOpacity onPress={() => setJoinModalVisible(false)}>
                        <Ionicons name="close" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Connect Method</Text>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity 
                            style={[styles.tab, joinMethod === 'code' && styles.activeTab]}
                            onPress={() => setJoinMethod('code')}
                        >
                            <Ionicons name="keypad-outline" size={18} color={joinMethod === 'code' ? '#fff' : colors.textSecondary} />
                            <Text style={[styles.tabText, joinMethod === 'code' && styles.activeTabText]}>Code</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tab, joinMethod === 'url' && styles.activeTab]}
                            onPress={() => setJoinMethod('url')}
                        >
                            <Ionicons name="link-outline" size={18} color={joinMethod === 'url' ? '#fff' : colors.textSecondary} />
                            <Text style={[styles.tabText, joinMethod === 'url' && styles.activeTabText]}>Invite Link</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                        {joinMethod === 'code' ? 'Sector Code' : 'URL Endpoint'}
                    </Text>
                    <TextInput 
                        style={[styles.input, { color: colors.text, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                        placeholder={joinMethod === 'code' ? "Enter 6-digit code" : "https://cospira.app/r/..."}
                        placeholderTextColor="#64748b"
                        value={joinInput}
                        onChangeText={setJoinInput}
                        autoCapitalize={joinMethod === 'code' ? 'characters' : 'none'}
                    />

                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Security Access (If required)</Text>
                    <TextInput 
                        style={[styles.input, { color: colors.text, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                        placeholder="Room Password"
                        placeholderTextColor="#64748b"
                        secureTextEntry
                        value={joinPassword}
                        onChangeText={setJoinPassword}
                    />

                    <TouchableOpacity 
                        style={[styles.modalSubmit, { marginTop: 20 }]}
                        onPress={() => {
                            setJoinModalVisible(false);
                            navigation.navigate('IntelligentRoom', { 
                              roomId: joinInput, 
                              roomName: 'Joined Room', 
                              password: joinPassword,
                              isHost: false 
                            });
                        }}
                    >
                        <Text style={styles.modalSubmitText}>Authorize Access</Text>
                    </TouchableOpacity>
                    
                    <View style={{height: 20}} />
                </ScrollView>
            </Animated.View>
          </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: normalize(100),
  },
  actionsSection: {
    paddingHorizontal: wp(5),
    marginVertical: 10,
  },
  compactActions: {
    flexDirection: 'row',
    gap: 12,
  },
  roomsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(6),
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: normalize(20),
    fontWeight: '800',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Space Grotesk',
  },
  viewAll: {
    fontSize: normalize(14),
    color: '#2F6BFF',
    fontWeight: '700',
  },
  viewAllFull: {
    fontSize: normalize(14),
    color: '#2F6BFF',
    fontWeight: '700',
    marginTop: 8,
  },
  closeHeaderBtn: {
    padding: 4,
  },
  activityActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  closeActivityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 2,
  },
  closeText: {
    fontSize: normalize(13),
    fontWeight: '600',
  },
  roomsList: {
    paddingHorizontal: wp(5),
  },
  footerSpacing: {
    height: normalize(100),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: normalize(22),
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Space Grotesk',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: normalize(14),
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#2F6BFF',
  },
  tabText: {
    fontSize: normalize(14),
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#fff',
  },
  protocolContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  protocolChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  activeProtocol: {
    backgroundColor: 'rgba(47, 107, 255, 0.1)',
    borderColor: '#2F6BFF',
  },
  protocolText: {
    fontSize: normalize(13),
    fontWeight: '600',
    color: '#64748b',
  },
  activeProtocolText: {
    color: '#2F6BFF',
  },
  input: {
    width: '100%',
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  modalSubmit: {
    width: '100%',
    height: 56,
    backgroundColor: '#0B1F3A',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2F6BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalSubmitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalClose: {
    marginTop: 15,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: normalize(14),
    fontWeight: '600',
  }
});

export default CommandHubScreen;
