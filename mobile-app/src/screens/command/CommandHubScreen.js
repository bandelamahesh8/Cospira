import React, { useState, useEffect } from 'react';
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
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import ActionCard from '../../components/dashboard/ActionCard';
import RoomListItem from '../../components/dashboard/RoomListItem';
import AIMatchCard from '../../components/dashboard/AIMatchCard';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Feather from 'react-native-vector-icons/Feather';
import FadeView from '../../components/animations/FadeView';
import { socketService } from '../../services/socket.service';
import { roomsService } from '../../services/rooms.service';
import { authStore } from '../../store/authStore';
import { wp, hp, normalize, isIOS } from '../../utils/responsive';
import { useTheme } from '../../hooks/useTheme';

const CommandHubScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const [userName, setUserName] = useState(authStore.user?.name || authStore.user?.username || 'Commander');
  const [activeRooms, setActiveRooms] = useState([]);
  
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


  useEffect(() => {
    // 1. Initial Data Fetch
    const token = authStore.token;
    socketService.connect(token);
    


    // Fetch Active Rooms
    socketService.emit('get-active-rooms', (response) => {
        if (response?.success) {
            mapAndSetRooms(response.rooms);
        }
    });

    // 2. Setup Listeners
    const handleConnect = () => {
        console.log('[CommandHub] Socket connected, refreshing data...');

        socketService.emit('get-active-rooms', (response) => {
            if (response?.success) {
                mapAndSetRooms(response.rooms);
            }
        });
    };

    const handleRoomsUpdate = (rooms) => {
        mapAndSetRooms(rooms);
    };
    


    socketService.on('connect', handleConnect);
    socketService.on('update-rooms', handleRoomsUpdate);

    return () => {
        socketService.off('connect', handleConnect);
        socketService.off('update-rooms', handleRoomsUpdate);
    };
  }, []);

  const mapAndSetRooms = (rooms) => {
      // Map server room objects to UI model
      const mapped = rooms.map(r => ({
          id: r.id,
          title: r.name,
          tags: [
              r.accessType === 'public' ? 'Public' : 'Private',
              r.mode ? r.mode.toUpperCase() : 'FUN',
              ...(r.interests || [])
          ].slice(0, 3),
          members: Array(r.userCount || 0).fill({ name: 'User', image: null }).slice(0, 4), // Visual placeholder
          isLive: true,
          matchPercentage: null, 
          userCount: r.userCount
      }));
      setActiveRooms(mapped);
  };


  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      console.warn('[CommandHub] Room name is required');
      return;
    }

    try {
      setCreating(true);
      console.log('[CommandHub] Creating room:', { roomName, privacy, password, protocol });
      
      // Determine access type
      let accessType = 'public';
      if (privacy === 'private') {
        accessType = password ? 'password' : 'private';
      }
      
      // Generate a unique roomId (6-char alphanumeric like web)
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let roomId = '';
      for (let i = 0; i < 6; i++) {
          roomId += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const generatedRoomId = roomId;
      
      // Normalize password to string
      const finalPassword = password || "";

      // Ensure socket is connected before trying to create a room
      if (!socketService.socket?.connected) {
          console.log('[CommandHub] Socket not connected, waiting for connection...');
          try {
              // Re-connect and wait
              const token = authStore.token;
              await socketService.connect(token);
              
              // Double check connection status with a small retry loop
              let secureRetry = 0;
              while (!socketService.socket?.connected && secureRetry < 20) {
                  await new Promise(r => setTimeout(r, 200));
                  secureRetry++;
              }
              
              if (!socketService.socket?.connected) {
                  throw new Error('Could not establish server connection. Please try again.');
              }
          } catch (connErr) {
              console.error('[CommandHub] Connection failed:', connErr);
              throw new Error('Connection failed: ' + connErr.message);
          }
      }

      // Create room on backend first
      const result = await roomsService.create(
        roomName,
        generatedRoomId,
        accessType,
        finalPassword,
        {
          mode: protocol,
          maxParticipants: 50
        },
        authStore.user // Pass current user
      );
      
      console.log('[CommandHub] Room created successfully:', result);
      setCreateModalVisible(false);
      
      // Navigate to the created room
      navigation.navigate('IntelligentRoom', {
        roomId: result.roomId,
        roomName: roomName,
        isHost: true
      });
      
      // Reset form
      setRoomName('');
      setPassword('');
      setPrivacy('public');
      setProtocol('fun');
      
    } catch (error) {
      console.error('[CommandHub] Failed to create room:', error);
      // TODO: Show error modal to user
      alert('Failed to create room: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinInput.trim()) {
      console.warn('[CommandHub] Room ID is required');
      return;
    }

    try {
      setJoining(true);
      console.log('[CommandHub] Joining room:', joinInput);
      
      // Check if room exists and get requirements
      const roomInfo = await roomsService.checkRoom(joinInput);
      console.log('[CommandHub] Room info:', roomInfo);
      
      if (roomInfo.requiresPassword && !joinPassword) {
        // TODO: Show password input modal
        alert('This room requires a password');
        setJoining(false);
        return;
      }
      
      setJoinModalVisible(false);
      
      // Navigate to room (joining happens in IntelligentRoom)
      navigation.navigate('IntelligentRoom', {
        roomId: joinInput,
        roomName: roomInfo.name || 'Joined Room',
        isHost: false,
        password: joinPassword || null
      });
      
      // Reset form
      setJoinInput('');
      setJoinPassword('');
      
    } catch (error) {
      console.error('[CommandHub] Failed to join room:', error);
      alert('Failed to join room: ' + error.message);
    } finally {
      setJoining(false);
    }
  };


  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <DashboardHeader userName={userName} navigation={navigation} />

        <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
          <FadeView delay={100}>
            <View style={styles.welcomeSection}>
                <Text style={[styles.greeting, { color: colors.text }]}>Hello, {userName}</Text>
                <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>Your unified connection platform</Text>
            </View>
          </FadeView>

          <FadeView delay={200}>
            <AIMatchCard 
                matchPercentage={Math.floor(Math.random() * (98 - 70) + 70)}
                recommendedRoom={activeRooms.length > 0 ? activeRooms[0].title : "Global Lobby"}
                tags={['AI', 'Strategic']}
                onPress={() => navigation.navigate('GlobalConnect')}
            />
          </FadeView>

          <FadeView delay={300}>
            <View style={styles.actionGrid}>
                <TouchableOpacity 
                    style={[styles.secondaryActionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setCreateModalVisible(true)}
                >
                    <View style={styles.actionIconBox}>
                        <Ionicons name="add" size={normalize(24)} color={colors.textSecondary} />
                    </View>
                    <Text style={[styles.actionTitle, { color: colors.text }]}>Create Room</Text>
                    <Text style={[styles.actionSub, { color: colors.textSecondary }]}>Host a private session</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.secondaryActionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setJoinModalVisible(true)}
                >
                    <View style={styles.actionIconBox}>
                        <Ionicons name="enter-outline" size={normalize(24)} color={colors.textSecondary} />
                    </View>
                    <Text style={[styles.actionTitle, { color: colors.text }]}>Join Room</Text>
                    <Text style={[styles.actionSub, { color: colors.textSecondary }]}>Enter via secure link</Text>
                </TouchableOpacity>
            </View>
          </FadeView>



          <View style={styles.footerSpacing} />
        </ScrollView>

        {/* ---------------- CREATE ROOM MODAL ---------------- */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={createModalVisible}
          onRequestClose={() => setCreateModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.modalOverlay}
            >
              <View style={[styles.modalContent, { backgroundColor: isDark ? colors.surface : '#fff' }]}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Create Room</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Customize your sector below.</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.closeButton, { backgroundColor: isDark ? colors.background : '#f1f5f9' }]} 
                    onPress={() => setCreateModalVisible(false)}
                  >
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Form Fields */}
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Room Name */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Room Name</Text>
                    <View style={[styles.inputContainer, { backgroundColor: isDark ? colors.background : '#f8fafc', borderColor: colors.border }]}>
                      <TextInput
                        style={[styles.textInput, { color: colors.text }]}
                        value={roomName}
                        onChangeText={setRoomName}
                        placeholder="Enter room name"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>

                  {/* Privacy Access */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Privacy Access</Text>
                    <View style={styles.privacyRow}>
                      <TouchableOpacity 
                        style={[styles.privacyOption, privacy === 'public' && styles.privacyActive, { backgroundColor: privacy === 'public' ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#e6fffa') : (isDark ? colors.background : '#f1f5f9') }]}
                        onPress={() => setPrivacy('public')}
                      >
                         <View style={[styles.privacyIconBox, privacy === 'public' ? {backgroundColor: '#10b981'} : {backgroundColor: isDark ? colors.surface : '#e2e8f0'}]}>
                           <Ionicons name="globe-outline" size={18} color={privacy === 'public' ? "#fff" : "#64748b"} />
                         </View>
                         <View style={styles.privacyContent}>
                           <Text style={[styles.privacyTitle, { color: colors.text }]}>Public</Text>
                           <Text style={[styles.privacyDesc, { color: colors.textSecondary }]}>OPEN UPLINK</Text>
                         </View>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.privacyOption, privacy === 'private' && styles.privacyActivePrivate, { backgroundColor: privacy === 'private' ? (isDark ? 'rgba(124, 58, 237, 0.2)' : '#f5f3ff') : (isDark ? colors.background : '#f1f5f9') }]}
                        onPress={() => setPrivacy('private')}
                      >
                         <View style={[styles.privacyIconBox, privacy === 'private' ? {backgroundColor: '#7c3aed'} : {backgroundColor: isDark ? colors.surface : '#e2e8f0'}]}>
                           <Ionicons name="lock-closed" size={16} color={privacy === 'private' ? "#fff" : "#64748b"} />
                         </View>
                         <View style={styles.privacyContent}>
                           <Text style={[styles.privacyTitle, { color: colors.text }]}>Private</Text>
                           <Text style={[styles.privacyDesc, { color: colors.textSecondary }]}>PASSKEY LOCKED</Text>
                         </View>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Password Field - CONDITIONAL */}
                  {privacy === 'private' && (
                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                      <View style={[styles.inputContainer, { backgroundColor: isDark ? colors.background : '#f8fafc', borderColor: colors.border }]}>
                        <TextInput
                          style={[styles.textInput, { color: colors.text }]}
                          value={password}
                          onChangeText={setPassword}
                          placeholder="Enter the room password"
                          placeholderTextColor={colors.textSecondary}
                          secureTextEntry
                        />
                        <TouchableOpacity onPress={() => setPassword('')}>
                          <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Sector Protocol */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Sector Protocol</Text>
                    <View style={[styles.protocolRow, { backgroundColor: isDark ? colors.background : '#f1f5f9' }]}>
                      {[
                        { id: 'fun', label: 'FUN', icon: 'game-controller-outline', lib: Ionicons },
                        { id: 'pro', label: 'PRO', icon: 'briefcase-outline', lib: Ionicons },
                        { id: 'ultra', label: 'ULTRA', icon: 'shield-outline', lib: Ionicons },
                        { id: 'mixed', label: 'MIXED', icon: 'shuffle', lib: Ionicons },
                      ].map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.protocolItem, protocol === item.id && styles.protocolActive]}
                          onPress={() => setProtocol(item.id)}
                        >
                          <item.lib name={item.icon} size={20} color={protocol === item.id ? '#fff' : '#94a3b8'} style={{marginBottom: 4}} />
                          <Text style={[styles.protocolLabel, protocol === item.id && styles.textActive]}>{item.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Initialize Button */}
                  <TouchableOpacity 
                    style={[styles.submitButton, creating && styles.submitButtonDisabled]} 
                    onPress={handleCreateRoom}
                    disabled={creating}
                  >
                    <View style={styles.submitBtnBg}>
                      {creating ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.submitBtnText}>Initialize System</Text>
                      )}
                    </View>
                  </TouchableOpacity>

                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </Modal>

        {/* ---------------- JOIN ROOM MODAL ---------------- */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={joinModalVisible}
          onRequestClose={() => setJoinModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.modalOverlay}
            >
              <View style={[styles.modalContent, { backgroundColor: isDark ? colors.surface : '#fff' }]}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Join Room</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Link up with a sector through valid uplink.</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.closeButton, { backgroundColor: isDark ? colors.background : '#f1f5f9' }]} 
                    onPress={() => setJoinModalVisible(false)}
                  >
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Form Fields */}
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Dynamic Input Based on Join Method */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>{joinMethod === 'code' ? 'Sector Code' : 'Invite URL'}</Text>
                    <View style={[styles.inputContainer, { backgroundColor: isDark ? colors.background : '#f8fafc', borderColor: colors.border }]}>
                      <TextInput
                        style={[styles.textInput, { color: colors.text }]}
                        value={joinInput}
                        onChangeText={setJoinInput}
                        placeholder={joinMethod === 'code' ? "# Enter Sector Code..." : "https://cospira.app/..."}
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>

                  {/* OR Divider */}
                  <View style={styles.orDivider}>
                    <View style={[styles.line, { backgroundColor: colors.border }]} />
                    <Text style={[styles.orText, { color: colors.textSecondary }]}>OR</Text>
                    <View style={[styles.line, { backgroundColor: colors.border }]} />
                  </View>

                  {/* Toggle Options */}
                  <TouchableOpacity 
                    style={[styles.joinMethodOption, joinMethod === 'code' && styles.joinMethodActive, { backgroundColor: joinMethod === 'code' ? '#4f46e5' : (isDark ? colors.background : '#f8fafc'), borderColor: joinMethod === 'code' ? '#4f46e5' : colors.border }]}
                    onPress={() => { setJoinMethod('code'); setJoinInput(''); }}
                  >
                    <View style={[styles.iconCircle, joinMethod === 'code' ? styles.iconCircleActive : { backgroundColor: isDark ? colors.surface : 'rgba(0,0,0,0.05)' }]}>
                        <Ionicons name="link-outline" size={20} color={joinMethod === 'code' ? '#fff' : colors.textSecondary} />
                    </View>
                    <View>
                        <Text style={[styles.methodTitle, { color: joinMethod === 'code' ? '#fff' : colors.text }]}>Sector Code</Text>
                        <Text style={[styles.methodDesc, { color: joinMethod === 'code' ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>OPEN UPLINK</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.joinMethodOption, joinMethod === 'url' && styles.joinMethodActive, { backgroundColor: joinMethod === 'url' ? '#4f46e5' : (isDark ? colors.background : '#f8fafc'), borderColor: joinMethod === 'url' ? '#4f46e5' : colors.border }]}
                    onPress={() => { setJoinMethod('url'); setJoinInput(''); }}
                  >
                    <View style={[styles.iconCircle, joinMethod === 'url' ? styles.iconCircleActive : { backgroundColor: isDark ? colors.surface : 'rgba(0,0,0,0.05)' }]}>
                        <Ionicons name="link" size={20} color={joinMethod === 'url' ? '#fff' : colors.textSecondary} />
                    </View>
                    <View>
                        <Text style={[styles.methodTitle, { color: joinMethod === 'url' ? '#fff' : colors.text }]}>Paste Invite URL...</Text>
                        <Text style={[styles.methodDesc, { color: joinMethod === 'url' ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>Secure HTTPS Link</Text>
                    </View>
                  </TouchableOpacity>

                  <Text style={[styles.securityNote, { color: colors.textSecondary }]}>Auto-extracting secure ID from beams.</Text>

                  {/* Establish Connection Button */}
                  <TouchableOpacity 
                    style={[styles.submitButton, joining && styles.submitButtonDisabled]} 
                    onPress={handleJoinRoom}
                    disabled={joining}
                  >
                    <View style={styles.submitBtnBg}>
                      {joining ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text style={styles.submitBtnText}>Establish Connection</Text>
                          <Ionicons name="chevron-forward" size={20} color="#fff" style={{marginLeft: 8}} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </Modal>


      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f4ff',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: hp(5),
  },
  welcomeSection: {
    paddingHorizontal: wp(5),
    marginTop: hp(1),
    marginBottom: hp(2),
  },
  greeting: {
    fontSize: normalize(24),
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: normalize(14),
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    gap: 12,
    marginBottom: hp(2),
  },
  secondaryActionCard: {
    flex: 1,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: normalize(15),
    fontWeight: '600',
    marginBottom: 2,
  },
  actionSub: {
    fontSize: normalize(11),
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    marginTop: hp(2),
    marginHorizontal: wp(5),
    borderTopWidth: 1,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    alignSelf: 'center',
  },
  statusText: {
    fontSize: normalize(12),
    fontWeight: '600',
  },
  statusValue: {
    fontSize: normalize(14),
    fontWeight: '700',
  },
  statusLabel: {
    fontSize: normalize(11),
    fontWeight: '500',
  },
  statusDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 16,
  },
  footerSpacing: {
    height: 60,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    maxWidth: '85%',
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    height: '100%',
  },
  privacyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  privacyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  privacyActive: {
    backgroundColor: '#e6fffa', 
    borderColor: '#10b981',
  },
  privacyActivePrivate: {
    backgroundColor: '#f5f3ff',
    borderColor: '#7c3aed',
  },
  privacyIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  textActive: {
    color: '#1e293b', 
  },
  privacyDesc: {
    fontSize: 10, 
    color: '#94a3b8', 
    fontWeight: '500',
    marginTop: 2,
  },
  protocolRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 4,
    borderRadius: 16,
  },
  protocolItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  protocolActive: {
    backgroundColor: '#6366f1',
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  protocolLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  textActive: {
    color: '#fff',
  },
  submitButton: {
    marginTop: 10,
    marginBottom: 20,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  submitBtnBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6366f1', // Fallback if image fails
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Join Room Specific Styles
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  orText: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  joinMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc', // Default light
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  joinMethodActive: {
    backgroundColor: '#4f46e5', // Deep purple/blue
    borderColor: '#4f46e5',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconCircleActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  methodTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  methodDesc: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  textWhite: {
    color: '#ffffff',
  },
  textWhiteOpac: {
    color: 'rgba(255,255,255,0.7)',
  },
  securityNote: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
});

export default CommandHubScreen;
