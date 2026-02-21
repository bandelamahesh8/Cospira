import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, ImageBackground, Animated, Easing, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { theme } from '../../core/theme';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import { useTheme } from '../../hooks/useTheme';
import GlassCard from '../../components/cards/GlassCard';
import { socketService } from '../../services/socket.service';
import { aiSimulationService } from '../../services/aiSimulation.service';
import LoadingSimulation from '../../components/dashboard/LoadingSimulation';

// Local AnimatedLogo removed in favor of reusable LoadingSimulation

const SimulationHubScreen = ({ route, navigation }) => {
  const { colors, isDark } = useTheme();
  const { roomId = 'default-room' } = route.params || {};
  const [templates, setTemplates] = useState([]);
  const [history, setHistory] = useState([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Real-time State - Expanded games list
  const [rankedGames, setRankedGames] = useState([
      { id: 1, title: 'GRAND CHESS', online: 135, image: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&q=80&w=400', key: 'chess' },
      { id: 2, title: 'CONNECT FOUR', online: 56, image: 'https://images.unsplash.com/photo-1611996575749-79a3a250f948?auto=format&fit=crop&q=80&w=400', key: 'connect4' },
      { id: 3, title: 'ULTIMATE OXO', online: 59, image: 'https://images.unsplash.com/photo-1629884638101-da3a456574c8?auto=format&fit=crop&q=80&w=400', key: 'oxo' },
      { id: 4, title: 'BATTLESHIP', online: 42, image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&q=80&w=400', key: 'battleship' },
      { id: 5, title: 'BILLIARDS', online: 38, image: 'https://images.unsplash.com/photo-1590247818434-9da549f335d7?auto=format&fit=crop&q=80&w=400', key: 'billiards' },
      { id: 6, title: 'CHECKERS', online: 31, image: 'https://images.unsplash.com/photo-1518897625608-36a6d4fecbb0?auto=format&fit=crop&q=80&w=400', key: 'checkers' },
      { id: 7, title: 'LUDO', online: 28, image: 'https://images.unsplash.com/photo-1572718156102-355a1e0b12b4?auto=format&fit=crop&q=80&w=400', key: 'ludo' },
      { id: 8, title: 'SNAKE LADDER', online: 25, image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7239a6?auto=format&fit=crop&q=80&w=400', key: 'snakeladder' },
      { id: 9, title: 'WORD BATTLE', online: 45, image: 'https://images.unsplash.com/photo-1455390582262-044c627a75e5?auto=format&fit=crop&q=80&w=400', key: 'wordbattle' },
      { id: 10, title: 'UNO', online: 67, image: 'https://images.unsplash.com/photo-1597297573829-0e6e69b5b3e5?auto=format&fit=crop&q=80&w=400', key: 'uno' },
  ]);

  useEffect(() => {
    loadData();
    
    // Listen for room updates to calculate real-time player counts
    const handleRoomsUpdate = (rooms) => {
        // Calculate players per game type based on active rooms
        const counts = { 
          chess: 135, connect4: 56, oxo: 59, battleship: 42, billiards: 38,
          checkers: 31, ludo: 28, snakeladder: 25, wordbattle: 45, uno: 67
        }; // Base counts
        
        rooms.forEach(r => {
            if (r.mode === 'gaming' || r.interests?.includes('gaming')) {
                // If room name or interest matches game type, add users
                const userCount = r.userCount || r.activeUsers || 0;
                if (r.name?.toLowerCase().includes('chess')) counts.chess += userCount;
                if (r.name?.toLowerCase().includes('connect')) counts.connect4 += userCount;
                if (r.name?.toLowerCase().includes('oxo') || r.name?.toLowerCase().includes('tic')) counts.oxo += userCount;
            }
        });

        setRankedGames(prev => prev.map(g => ({
            ...g,
            online: counts[g.key] + Math.floor(Math.random() * 3) // Add minor fluctuation
        })));
    };

    socketService.on('update-rooms', handleRoomsUpdate);
    
    // Simulate live feeling if no socket events
    const interval = setInterval(() => {
        setRankedGames(prev => prev.map(g => ({
            ...g,
            online: Math.max(10, g.online + Math.floor(Math.random() * 5) - 2)
        })));
    }, 5000);

    return () => {
        socketService.off('update-rooms', handleRoomsUpdate);
        clearInterval(interval);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [templateData, historyData] = await Promise.all([
      aiSimulationService.getTemplates(),
      aiSimulationService.getHistory(roomId)
    ]);
    setTemplates(templateData);
    setHistory(historyData);
    setLoading(false);
  };

  const handleRunSimulation = async (templateId) => {
    setRunning(true);
    await aiSimulationService.runSimulation(roomId, templateId);
    await loadData();
    setRunning(false);
  };

  if (loading) {
    return <LoadingSimulation />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <DashboardHeader navigation={navigation} />
        <View style={styles.titleRow}>
            <Text style={[styles.screenTitle, { color: colors.text }]}>Games</Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Enter the arena and rise through the ranks</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Featured Card: Grand Chess */}
        <TouchableOpacity activeOpacity={0.9} style={styles.featuredCardContainer}>
            <ImageBackground 
                source={{ uri: 'https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?auto=format&fit=crop&q=80&w=1000' }} 
                style={styles.featuredCard}
                imageStyle={{ borderRadius: 16 }}
            >
                <View style={styles.featuredOverlay}>
                    <View style={styles.featuredBadge}>
                        <Text style={styles.featuredBadgeText}>RANKED ARENA</Text>
                    </View>
                    <Text style={styles.featuredTitle}>GRAND CHESS</Text>
                    <View style={styles.featuredSubtitleRow}>
                        <View style={styles.accentLine} />
                        <Text style={styles.featuredSubtitle}>The ultimate test of intellect</Text>
                    </View>
                    
                    <View style={styles.featuredButtons}>
                        <TouchableOpacity style={[styles.playNowBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('GameRoom', { gameType: 'chess' })}>
                            <Ionicons name="play" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                            <Text style={styles.playNowText}>Play</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.detailsBtn}>
                            <Text style={styles.detailsText}>Details</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ImageBackground>
        </TouchableOpacity>

        {/* Tournaments Section */}
        <View style={styles.sectionHeader}>
            <View style={styles.sectionIconTitle}>
                <Ionicons name="pencil" size={16} color="#3b82f6" />
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>TOURNAMENTS</Text>
            </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            <TouchableOpacity style={[styles.tournamentCard, { backgroundColor: isDark ? colors.surface : '#ffffff', borderColor: colors.border }]}>
                <View style={[styles.tournamentIcon, { backgroundColor: isDark ? colors.background : '#f3f4ff' }]}>
                    <Text style={{ fontSize: 24 }}>🏆</Text>
                </View>
                <View style={styles.tournamentContent}>
                    <View style={styles.tournamentTopRow}>
                        <Text style={[styles.tournamentTitle, { color: colors.text }]}>Cyber Chess Open</Text>
                        <View style={styles.liveNowBadge}>
                            <Text style={styles.liveNowText}>LIVE NOW</Text>
                        </View>
                    </View>
                    <Text style={[styles.tournamentMeta, { color: colors.textSecondary }]}>$500 USD  |  150 Players</Text>
                </View>
                <TouchableOpacity style={styles.joinNowBtn} onPress={() => navigation.navigate('Tournament')}>
                    <Text style={styles.joinNowText}>ENTER</Text>
                </TouchableOpacity>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.tournamentCard, { backgroundColor: isDark ? colors.surface : '#ffffff', borderColor: colors.border }]}>
                <View style={[styles.tournamentIcon, { backgroundColor: isDark ? colors.background : '#f3f4ff' }]}>
                    <Text style={{ fontSize: 24 }}>🎮</Text>
                </View>
                <View style={styles.tournamentContent}>
                    <View style={styles.tournamentTopRow}>
                        <Text style={[styles.tournamentTitle, { color: colors.text }]}>Lego Master Series</Text>
                        <View style={[styles.detailsTag, { backgroundColor: isDark ? colors.background : '#f1f5f9' }]}>
                            <Text style={[styles.detailsTagText, { color: colors.textSecondary }]}>DETAILS</Text>
                            <Ionicons name="chevron-down" size={10} color={colors.textSecondary} />
                        </View>
                    </View>
                    <Text style={[styles.tournamentMeta, { color: colors.textSecondary }]}>$300 USD  |  FRI 5:00PM</Text>
                </View>
            </TouchableOpacity>
        </ScrollView>

        {/* Ranked Arena Section */}
        <View style={styles.sectionHeader}>
            <View style={styles.sectionIconTitle}>
                <Ionicons name="pencil" size={16} color="#3b82f6" />
                <Text style={styles.sectionLabel}>RANKED ARENA</Text>
            </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {rankedGames.map(item => (
                <TouchableOpacity key={item.id} style={styles.rankedCard} onPress={() => navigation.navigate('GameRoom', { gameType: item.key })}>
                    <Image source={{ uri: item.image }} style={styles.rankedImage} />
                    <View style={styles.rankedOverlay}>
                        <Text style={styles.rankedTitle}>{item.title}</Text>
                        <View style={styles.onlineRow}>
                            <View style={styles.onlineDot} />
                            <Text style={styles.onlineText}>{item.online} ONLINE</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            ))}
        </ScrollView>

        {/* Casual Sector Section */}
        <View style={styles.sectionHeader}>
            <View style={styles.sectionIconTitle}>
                <Ionicons name="pencil" size={16} color="#3b82f6" />
                <Text style={styles.sectionLabel}>CASUAL SECTOR</Text>
            </View>
        </View>
        <View style={styles.casualGrid}>
            <TouchableOpacity style={styles.casualItem} onPress={() => navigation.navigate('GameRoom', { gameType: 'ludo' })}>
                <View style={styles.casualIcon}><Text style={{ fontSize: 16 }}>🕹️</Text></View>
                <Text style={styles.casualText}>LEGO PRO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.casualItem} onPress={() => navigation.navigate('GameRoom', { gameType: 'tictactoe' })}>
                <View style={[styles.casualIcon, { backgroundColor: '#f5f3ff' }]}><Text style={{ fontSize: 16 }}>🎲</Text></View>
                <Text style={styles.casualText}>TIC-TAC-TOE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.casualItem} onPress={() => navigation.navigate('GameRoom', { gameType: 'uno' })}>
                <View style={[styles.casualIcon, { backgroundColor: '#fef3c7' }]}><Text style={{ fontSize: 16 }}>🃏</Text></View>
                <Text style={styles.casualText}>UNO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.casualItem} onPress={() => navigation.navigate('GameRoom', { gameType: 'wordbattle' })}>
                <View style={[styles.casualIcon, { backgroundColor: '#dbeafe' }]}><Text style={{ fontSize: 16 }}>📝</Text></View>
                <Text style={styles.casualText}>WORD BATTLE</Text>
            </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  titleAccent: {
    color: '#8b5cf6',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  featuredCardContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  featuredCard: {
    height: 180,
    width: '100%',
  },
  featuredOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 24,
    padding: 20,
    justifyContent: 'flex-end',
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  featuredBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  featuredTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  featuredSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  accentLine: {
    width: 2,
    height: 12,
    backgroundColor: '#8b5cf6',
    marginRight: 8,
  },
  featuredSubtitle: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '500',
  },
  featuredButtons: {
    flexDirection: 'row',
  },
  playNowBtn: {
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginRight: 10,
  },
  playNowText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  detailsBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  detailsText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginLeft: 6,
  },
  horizontalScroll: {
    paddingLeft: 20,
    marginBottom: 24,
  },
  tournamentCard: {
    width: 280,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  tournamentIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#f3f4ff',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tournamentContent: {
    flex: 1,
  },
  tournamentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tournamentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  liveNowBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveNowText: {
    color: '#b45309',
    fontSize: 9,
    fontWeight: '800',
  },
  detailsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailsTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    marginRight: 4,
  },
  tournamentMeta: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  joinNowBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 15,
    marginLeft: 10,
  },
  joinNowText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '500',
  },
  rankedCard: {
    width: 150,
    height: 200,
    borderRadius: 14,
    marginRight: 16,
    overflow: 'hidden',
  },
  rankedImage: {
    width: '100%',
    height: '100%',
  },
  rankedOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  rankedTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ade80',
    marginRight: 4,
  },
  onlineText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 8,
    fontWeight: '700',
  },
  casualGrid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 40,
  },
  casualItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 12,
    borderRadius: 14,
    flex: 1,
    minWidth: '45%',
    marginRight: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  casualIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#f3f4ff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    fontSize: 16,
  },
  casualText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  }
});

export default SimulationHubScreen;
