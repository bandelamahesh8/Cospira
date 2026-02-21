import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
  FlatList,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../hooks/useTheme';
import GlassCard from '../../components/cards/GlassCard';
import { tournamentService } from '../../services/tournament.service';
import { friendsService } from '../../services/friends.service';
import LoadingState from '../../components/loading/LoadingState';

const { width: screenWidth } = Dimensions.get('window');

const TournamentScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('live');
  const [tournaments, setTournaments] = useState([]);
  const [userTournaments, setUserTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [tournamentDetailsVisible, setTournamentDetailsVisible] = useState(false);
  const [bracketVisible, setBracketVisible] = useState(false);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [matches, setMatches] = useState([]);
  
  // Create tournament form state
  const [tournamentName, setTournamentName] = useState('');
  const [gameType, setGameType] = useState('chess');
  const [maxParticipants, setMaxParticipants] = useState('8');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [entryFee, setEntryFee] = useState('0');
  const [prizePool, setPrizePool] = useState('0');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    
    const unsubscribe = tournamentService.subscribe((event, data) => {
      switch (event) {
        case 'tournament_created':
        case 'tournament_updated':
        case 'tournament_started':
        case 'tournament_ended':
          loadData();
          break;
        case 'match_created':
        case 'match_updated':
        case 'match_completed':
          if (selectedTournament) {
            loadTournamentMatches(selectedTournament.id);
          }
          break;
      }
    });

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
      const allTournaments = await tournamentService.getTournaments();
      const userTourneys = tournamentService.getUserTournaments();
      
      setTournaments(allTournaments);
      setUserTournaments(userTourneys);
    } catch (error) {
      console.error('[TournamentScreen] Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTournamentMatches = async (tournamentId) => {
    try {
      const tournamentMatches = await tournamentService.getTournamentMatches(tournamentId);
      setMatches(tournamentMatches);
    } catch (error) {
      console.error('[TournamentScreen] Load matches error:', error);
    }
  };

  const loadTournamentLeaderboard = async (tournamentId) => {
    try {
      const tournamentLeaderboard = await tournamentService.getTournamentLeaderboard(tournamentId);
      setLeaderboard(tournamentLeaderboard);
    } catch (error) {
      console.error('[TournamentScreen] Load leaderboard error:', error);
    }
  };

  const handleCreateTournament = async () => {
    const errors = tournamentService.validateTournamentData({
      name: tournamentName,
      gameType,
      startTime,
      endTime,
      maxParticipants: parseInt(maxParticipants)
    });

    if (errors.length > 0) {
      Alert.alert('Validation Error', errors.join('\n'));
      return;
    }

    try {
      await tournamentService.createTournament({
        name: tournamentName,
        gameType,
        maxParticipants: parseInt(maxParticipants),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        entryFee: parseFloat(entryFee) || 0,
        prizePool: parseFloat(prizePool) || 0,
        tournamentType: 'single_elimination'
      });

      Alert.alert('Success', 'Tournament created successfully!');
      setCreateModalVisible(false);
      resetCreateForm();
    } catch (error) {
      Alert.alert('Error', 'Failed to create tournament');
    }
  };

  const handleJoinTournament = async (tournamentId) => {
    try {
      await tournamentService.joinTournament(tournamentId);
      Alert.alert('Success', 'Joined tournament successfully!');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to join tournament');
    }
  };

  const handleLeaveTournament = async (tournamentId) => {
    Alert.alert(
      'Leave Tournament',
      'Are you sure you want to leave this tournament?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await tournamentService.leaveTournament(tournamentId);
              Alert.alert('Success', 'Left tournament successfully!');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to leave tournament');
            }
          }
        }
      ]
    );
  };

  const resetCreateForm = () => {
    setTournamentName('');
    setGameType('chess');
    setMaxParticipants('8');
    setStartTime('');
    setEndTime('');
    setEntryFee('0');
    setPrizePool('0');
  };

  const getTournamentStatus = (tournament) => {
    return tournamentService.getTournamentStatus(tournament);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'live': return '#4ade80';
      case 'upcoming': return '#3b82f6';
      case 'completed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'live': return 'LIVE NOW';
      case 'upcoming': return 'UPCOMING';
      case 'completed': return 'COMPLETED';
      default: return 'UNKNOWN';
    }
  };

  const getGameIcon = (gameType) => {
    switch (gameType) {
      case 'chess': return '♟️';
      case 'connect4': return '🔴';
      case 'oxo':
      case 'tictactoe': return '⭕';
      default: return '🎮';
    }
  };

  const renderTournamentCard = ({ item }) => {
    const status = getTournamentStatus(item);
    const isParticipating = userTournaments.some(t => t.id === item.id);
    const stats = tournamentService.getTournamentStats(item.id);

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <GlassCard variant="dark" style={styles.tournamentCard}>
          <TouchableOpacity
            style={styles.tournamentContent}
            onPress={() => {
              setSelectedTournament(item);
              setTournamentDetailsVisible(true);
            }}
          >
            <View style={styles.tournamentHeader}>
              <View style={styles.tournamentInfo}>
                <View style={styles.tournamentIcon}>
                  <Text style={styles.tournamentIconText}>
                    {getGameIcon(item.gameType)}
                  </Text>
                </View>
                <View style={styles.tournamentDetails}>
                  <Text style={[styles.tournamentName, { color: colors.text }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.tournamentGame, { color: colors.textSecondary }]}>
                    {item.gameType?.toUpperCase()}
                  </Text>
                </View>
              </View>
              
              <View style={styles.tournamentStatus}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
                  <Text style={styles.statusText}>{getStatusText(status)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.tournamentStats}>
              <View style={styles.statItem}>
                <Ionicons name="people" size={16} color={colors.textSecondary} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {stats?.totalParticipants || 0}/{item.maxParticipants}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons name="trophy" size={16} color={colors.textSecondary} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  ${item.prizePool || 0}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons name="time" size={16} color={colors.textSecondary} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {new Date(item.startTime).toLocaleDateString()}
                </Text>
              </View>
            </View>

            <View style={styles.tournamentActions}>
              {status === 'upcoming' && !isParticipating && (
                <TouchableOpacity
                  style={[styles.joinButton, { backgroundColor: colors.primary }]}
                  onPress={() => handleJoinTournament(item.id)}
                >
                  <Text style={styles.joinButtonText}>JOIN</Text>
                </TouchableOpacity>
              )}
              
              {isParticipating && status === 'upcoming' && (
                <TouchableOpacity
                  style={[styles.leaveButton, { backgroundColor: colors.surface }]}
                  onPress={() => handleLeaveTournament(item.id)}
                >
                  <Text style={[styles.leaveButtonText, { color: colors.text }]}>LEAVE</Text>
                </TouchableOpacity>
              )}
              
              {status === 'live' && isParticipating && (
                <TouchableOpacity
                  style={[styles.playButton, { backgroundColor: colors.primary }]}
                  onPress={() => navigation.navigate('GameRoom', { tournamentId: item.id })}
                >
                  <Ionicons name="play" size={16} color="#fff" />
                  <Text style={styles.playButtonText}>PLAY</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </GlassCard>
      </Animated.View>
    );
  };

  const renderBracketMatch = (match) => (
    <GlassCard variant="dark" style={styles.bracketMatch}>
      <View style={styles.matchContent}>
        <View style={styles.matchPlayers}>
          <View style={styles.matchPlayer}>
            <Text style={[styles.playerName, { color: colors.text }]}>
              {match.player1?.displayName || 'TBD'}
            </Text>
            {match.winner === match.player1?.id && (
              <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
            )}
          </View>
          
          <Text style={[styles.vsText, { color: colors.textSecondary }]}>VS</Text>
          
          <View style={styles.matchPlayer}>
            <Text style={[styles.playerName, { color: colors.text }]}>
              {match.player2?.displayName || 'TBD'}
            </Text>
            {match.winner === match.player2?.id && (
              <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
            )}
          </View>
        </View>
        
        {match.winner && (
          <View style={styles.matchResult}>
            <Text style={[styles.resultText, { color: colors.primary }]}>
              Winner: {match.winnerName}
            </Text>
          </View>
        )}
      </View>
    </GlassCard>
  );

  const renderLeaderboardItem = (item, index) => (
    <GlassCard variant="dark" style={styles.leaderboardItem}>
      <View style={styles.leaderboardRank}>
        <Text style={[
          styles.rankText,
          { color: index < 3 ? colors.primary : colors.text }
        ]}>
          #{index + 1}
        </Text>
        {index < 3 && (
          <Text style={styles.medalEmoji}>
            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
          </Text>
        )}
      </View>
      
      <View style={styles.leaderboardPlayer}>
        <Text style={[styles.playerName, { color: colors.text }]}>
          {item.displayName}
        </Text>
        <Text style={[styles.playerStats, { color: colors.textSecondary }]}>
          Wins: {item.wins} | Losses: {item.losses}
        </Text>
      </View>
      
      <View style={styles.leaderboardScore}>
        <Text style={[styles.scoreText, { color: colors.primary }]}>
          {item.points} pts
        </Text>
      </View>
    </GlassCard>
  );

  if (loading) {
    return <LoadingState />;
  }

  const liveTournaments = tournaments.filter(t => getTournamentStatus(t) === 'live');
  const upcomingTournaments = tournaments.filter(t => getTournamentStatus(t) === 'upcoming');
  const completedTournaments = tournaments.filter(t => getTournamentStatus(t) === 'completed');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Tournaments</Text>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={() => setCreateModalVisible(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'live' && styles.activeTab]}
          onPress={() => setActiveTab('live')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'live' ? colors.primary : colors.textSecondary }
          ]}>
            Live ({liveTournaments.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'upcoming' ? colors.primary : colors.textSecondary }
          ]}>
            Upcoming ({upcomingTournaments.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && styles.activeTab]}
          onPress={() => setActiveTab('my')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'my' ? colors.primary : colors.textSecondary }
          ]}>
            My Tournaments ({userTournaments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'live' && (
          <FlatList
            data={liveTournaments}
            renderItem={renderTournamentCard}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="radio-off" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No live tournaments
                </Text>
              </View>
            }
          />
        )}

        {activeTab === 'upcoming' && (
          <FlatList
            data={upcomingTournaments}
            renderItem={renderTournamentCard}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="calendar" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No upcoming tournaments
                </Text>
              </View>
            }
          />
        )}

        {activeTab === 'my' && (
          <FlatList
            data={userTournaments}
            renderItem={renderTournamentCard}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="person-off" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  You haven't joined any tournaments
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Create Tournament Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Tournament</Text>
            <TouchableOpacity onPress={handleCreateTournament}>
              <Ionicons name="checkmark" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.createForm}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Tournament Name</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, backgroundColor: colors.surface }]}
                placeholder="Enter tournament name"
                placeholderTextColor={colors.textSecondary}
                value={tournamentName}
                onChangeText={setTournamentName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Game Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['chess', 'connect4', 'tictactoe', 'oxo'].map(game => (
                  <TouchableOpacity
                    key={game}
                    style={[
                      styles.gameTypeOption,
                      { backgroundColor: gameType === game ? colors.primary : colors.surface }
                    ]}
                    onPress={() => setGameType(game)}
                  >
                    <Text style={[
                      styles.gameTypeText,
                      { color: gameType === game ? '#fff' : colors.text }
                    ]}>
                      {getGameIcon(game)} {game.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Max Participants</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, backgroundColor: colors.surface }]}
                placeholder="Maximum participants"
                placeholderTextColor={colors.textSecondary}
                value={maxParticipants}
                onChangeText={setMaxParticipants}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Entry Fee ($)</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.text, backgroundColor: colors.surface }]}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  value={entryFee}
                  onChangeText={setEntryFee}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Prize Pool ($)</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.text, backgroundColor: colors.surface }]}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  value={prizePool}
                  onChangeText={setPrizePool}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Tournament Details Modal */}
      <Modal
        visible={tournamentDetailsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTournamentDetailsVisible(false)}
      >
        {selectedTournament && (
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setTournamentDetailsVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {selectedTournament.name}
              </Text>
              <TouchableOpacity onPress={() => {
                setTournamentDetailsVisible(false);
                setBracketVisible(true);
              }}>
                <Ionicons name="git-branch" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.tournamentDetails}>
              <View style={styles.detailSection}>
                <Text style={[styles.detailTitle, { color: colors.text }]}>Tournament Info</Text>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Game:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedTournament.gameType?.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Participants:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedTournament.participants?.length || 0}/{selectedTournament.maxParticipants}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Prize Pool:</Text>
                  <Text style={[styles.detailValue, { color: colors.primary }]}>
                    ${selectedTournament.prizePool || 0}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.viewBracketButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setTournamentDetailsVisible(false);
                  setBracketVisible(true);
                }}
              >
                <Ionicons name="git-branch" size={20} color="#fff" />
                <Text style={styles.viewBracketText}>View Bracket</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.viewLeaderboardButton, { backgroundColor: colors.surface }]}
                onPress={() => {
                  setTournamentDetailsVisible(false);
                  setLeaderboardVisible(true);
                  loadTournamentLeaderboard(selectedTournament.id);
                }}
              >
                <Ionicons name="podium" size={20} color={colors.text} />
                <Text style={[styles.viewLeaderboardText, { color: colors.text }]}>
                  View Leaderboard
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* Bracket Modal */}
      <Modal
        visible={bracketVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setBracketVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setBracketVisible(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Tournament Bracket</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.bracketContent}>
            {matches.map(renderBracketMatch)}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Leaderboard Modal */}
      <Modal
        visible={leaderboardVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLeaderboardVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setLeaderboardVisible(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Leaderboard</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.leaderboardContent}>
            {leaderboard.map((item, index) => renderLeaderboardItem(item, index))}
          </ScrollView>
        </SafeAreaView>
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
  createButton: {
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
  tournamentCard: {
    marginBottom: 16,
  },
  tournamentContent: {
    padding: 4,
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tournamentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tournamentIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tournamentIconText: {
    fontSize: 20,
  },
  tournamentDetails: {
    flex: 1,
  },
  tournamentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  tournamentGame: {
    fontSize: 12,
    fontWeight: '500',
  },
  tournamentStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  tournamentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  tournamentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  leaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  leaveButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
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
  createForm: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  gameTypeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  gameTypeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tournamentDetails: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  viewBracketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  viewBracketText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  viewLeaderboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  viewLeaderboardText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bracketContent: {
    padding: 20,
  },
  bracketMatch: {
    marginBottom: 12,
  },
  matchContent: {
    padding: 4,
  },
  matchPlayers: {
    marginBottom: 8,
  },
  matchPlayer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '500',
  },
  vsText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    marginVertical: 4,
  },
  matchResult: {
    alignItems: 'center',
  },
  resultText: {
    fontSize: 12,
    fontWeight: '600',
  },
  leaderboardContent: {
    padding: 20,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    marginBottom: 12,
  },
  leaderboardRank: {
    width: 60,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
  },
  medalEmoji: {
    fontSize: 20,
    marginTop: 2,
  },
  leaderboardPlayer: {
    flex: 1,
    marginLeft: 12,
  },
  playerStats: {
    fontSize: 12,
    marginTop: 2,
  },
  leaderboardScore: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default TournamentScreen;
