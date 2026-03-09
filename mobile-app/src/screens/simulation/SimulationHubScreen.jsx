import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Image, 
  ImageBackground, 
  Animated, 
  Easing, 
  StatusBar,
  Dimensions,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import GlassCard from '../../components/cards/GlassCard';
import { socketService } from '../../services/socket.service';
import { aiSimulationService } from '../../services/aiSimulation.service';
import LoadingSimulation from '../../components/dashboard/LoadingSimulation';
import { normalize, wp, hp } from '../../utils/responsive';

const { width: screenWidth } = Dimensions.get('window');

const SimulationHubScreen = ({ route, navigation }) => {
  const { colors, isDark } = useTheme();
  const { roomId = 'default-room' } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [rankedGames, setRankedGames] = useState([
    { id: 1, title: 'GRAND CHESS', online: 135, image: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&q=80&w=400', key: 'chess', genre: 'STRATEGY' },
    { id: 2, title: 'CONNECT FOUR', online: 56, image: 'https://images.unsplash.com/photo-1611996575749-79a3a250f948?auto=format&fit=crop&q=80&w=400', key: 'connect4', genre: 'CLASSIC' },
    { id: 3, title: 'ULTIMATE OXO', online: 59, image: 'https://images.unsplash.com/photo-1629884638101-da3a456574c8?auto=format&fit=crop&q=80&w=400', key: 'oxo', genre: 'STRATEGY' },
    { id: 4, title: 'BATTLESHIP', online: 42, image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&q=80&w=400', key: 'battleship', genre: 'TACTICAL' },
  ]);

  // -- Animations --
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    setupSocketListeners();
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    const interval = setInterval(() => {
      setRankedGames(prev => prev.map(g => ({
        ...g,
        online: Math.max(10, g.online + Math.floor(Math.random() * 5) - 2)
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    // Mimic previous load logic
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
  };

  const setupSocketListeners = () => {
    const handleRoomsUpdate = (rooms) => {
      // Mock update logic preserved from original
      setRankedGames(prev => prev.map(g => ({
        ...g,
        online: g.online + Math.floor(Math.random() * 3)
      })));
    };
    socketService.on('update-rooms', handleRoomsUpdate);
    return () => socketService.off('update-rooms', handleRoomsUpdate);
  };

  if (loading) return <LoadingSimulation />;

  const renderSectionHeader = (title, icon) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconTitle}>
        <Ionicons name={icon} size={16} color={colors.primary} />
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{title}</Text>
      </View>
      <TouchableOpacity>
        <Text style={[styles.seeAll, { color: colors.primary }]}>View All</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient 
        colors={isDark ? ['#0F172A', '#020617'] : ['#F8FAFC', '#F1F5F9']} 
        style={styles.absoluteBg} 
      />

      <Animated.ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Cinematic Header */}
        <View style={styles.header}>
            <Text style={[styles.welcome, { color: colors.textSecondary }]}>CHOOSE YOUR ARENA</Text>
            <Text style={[styles.screenTitle, { color: colors.text }]}>Gaming Pool</Text>
        </View>

        {/* Featured Card */}
        <TouchableOpacity 
          activeOpacity={0.9} 
          style={styles.featuredContainer}
          onPress={() => navigation.navigate('GameRoom', { gameType: 'chess' })}
        >
          <ImageBackground 
            source={{ uri: 'https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?auto=format&fit=crop&q=80&w=1000' }} 
            style={styles.featuredCard}
            imageStyle={{ borderRadius: 32 }}
          >
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.featuredOverlay}
            >
              <View style={styles.featuredContent}>
                <View style={styles.liveTag}>
                   <View style={styles.liveDot} />
                   <Text style={styles.liveText}>LIVE ARENA</Text>
                </View>
                <Text style={styles.featuredTitle}>Grand Chess</Text>
                <Text style={styles.featuredSub}>Rise through the grandmaster ranks</Text>
                
                <View style={styles.featuredFooter}>
                  <View style={[styles.playBtn, { backgroundColor: colors.primary }]}>
                    <Ionicons name="play" size={18} color="#fff" />
                    <Text style={styles.playText}>BATTLE NOW</Text>
                  </View>
                  <View style={styles.playerCount}>
                    <Ionicons name="people" size={14} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.countText}>12.4k Active</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </TouchableOpacity>

        {/* Tournaments */}
        {renderSectionHeader('ACTIVE TOURNAMENTS', 'trophy-outline')}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          <TouchableOpacity style={styles.tourneyCard}>
            <GlassCard variant={isDark ? "dark" : "light"} style={styles.tourneyInner}>
                <LinearGradient colors={['#9333EA', '#4F46E5']} style={styles.tourneyIcon}>
                   <Ionicons name="flash" size={24} color="#fff" />
                </LinearGradient>
                <View style={styles.tourneyInfo}>
                  <Text style={[styles.tourneyTitle, { color: colors.text }]}>Cyber Chess Open</Text>
                  <Text style={[styles.tourneyMeta, { color: colors.textSecondary }]}>Prize: $500 • Ends in 2h</Text>
                </View>
                <View style={[styles.tourneyBadge, { backgroundColor: '#10b98120' }]}>
                   <Text style={[styles.tourneyBadgeText, { color: '#10b981' }]}>JOIN</Text>
                </View>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tourneyCard}>
            <GlassCard variant={isDark ? "dark" : "light"} style={styles.tourneyInner}>
                <LinearGradient colors={['#F59E0B', '#EF4444']} style={styles.tourneyIcon}>
                   <Ionicons name="game-controller" size={24} color="#fff" />
                </LinearGradient>
                <View style={styles.tourneyInfo}>
                  <Text style={[styles.tourneyTitle, { color: colors.text }]}>Lego Masters</Text>
                  <Text style={[styles.tourneyMeta, { color: colors.textSecondary }]}>Prize: $300 • Starts 5 PM</Text>
                </View>
                <View style={[styles.tourneyBadge, { backgroundColor: colors.surface }]}>
                   <Text style={[styles.tourneyBadgeText, { color: colors.textSecondary }]}>INFO</Text>
                </View>
            </GlassCard>
          </TouchableOpacity>
        </ScrollView>

        {/* Ranked Arena */}
        {renderSectionHeader('RANKED MATCHMAKING', 'rocket-outline')}
        <View style={styles.rankedGrid}>
          {rankedGames.map((game, index) => (
            <TouchableOpacity 
              key={game.id} 
              style={styles.rankedTile}
              onPress={() => navigation.navigate('GameRoom', { gameType: game.key })}
            >
              <Image source={{ uri: game.image }} style={styles.tileImage} />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.9)']}
                style={styles.tileOverlay}
              >
                <Text style={styles.tileGenre}>{game.genre}</Text>
                <Text style={styles.tileTitle}>{game.title}</Text>
                <View style={styles.tileOnline}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineCount}>{game.online} Playing</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Casual Sector */}
        {renderSectionHeader('CASUAL SECTOR', 'dice-outline')}
        <View style={styles.casualSector}>
          {[
            { label: 'LEGO PRO', icon: 'cube-outline', color: '#3b82f6', key: 'ludo' },
            { label: 'TIC-TAC-TOE', icon: 'grid-outline', color: '#8b5cf6', key: 'tictactoe' },
            { label: 'QUANTUM UNO', icon: 'albums-outline', color: '#f59e0b', key: 'uno' },
            { label: 'WORD BATTLE', icon: 'text-outline', color: '#ec4899', key: 'wordbattle' }
          ].map((item) => (
            <TouchableOpacity 
              key={item.label} 
              style={styles.casualItem}
              onPress={() => navigation.navigate('GameRoom', { gameType: item.key })}
            >
              <GlassCard variant={isDark ? "dark" : "light"} style={styles.casualInner}>
                <View style={[styles.casualIconBox, { backgroundColor: item.color + '20' }]}>
                   <Ionicons name={item.icon} size={22} color={item.color} />
                </View>
                <Text style={[styles.casualLabel, { color: colors.text }]}>{item.label}</Text>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>

      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  absoluteBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scrollContent: { paddingBottom: 100 },
  header: { padding: 24, paddingTop: 16 },
  welcome: { fontSize: 12, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  screenTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  featuredContainer: { marginHorizontal: 24, marginBottom: 32 },
  featuredCard: { height: 220, width: '100%', overflow: 'hidden' },
  featuredOverlay: { flex: 1, padding: 24, justifyContent: 'flex-end' },
  featuredContent: {},
  liveTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.2)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginBottom: 8, gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
  liveText: { color: '#ef4444', fontSize: 10, fontWeight: '900' },
  featuredTitle: { color: '#fff', fontSize: 28, fontWeight: '900' },
  featuredSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', marginTop: 4 },
  featuredFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  playBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, gap: 8 },
  playText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  playerCount: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  countText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  sectionIconTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  seeAll: { fontSize: 13, fontWeight: '700' },
  horizontalScroll: { paddingLeft: 24, marginBottom: 32 },
  tourneyCard: { width: screenWidth * 0.75, marginRight: 16 },
  tourneyInner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 24 },
  tourneyIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  tourneyInfo: { flex: 1, marginLeft: 12 },
  tourneyTitle: { fontSize: 14, fontWeight: '800' },
  tourneyMeta: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  tourneyBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  tourneyBadgeText: { fontSize: 10, fontWeight: '900' },
  rankedGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12, marginBottom: 32 },
  rankedTile: { width: (screenWidth - 52) / 2, height: 180, borderRadius: 28, overflow: 'hidden' },
  tileImage: { width: '100%', height: '100%' },
  tileOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, justifyContent: 'flex-end' },
  tileGenre: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  tileTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 2 },
  tileOnline: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  onlineCount: { color: '#10b981', fontSize: 10, fontWeight: '800' },
  casualSector: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 24, gap: 12 },
  casualItem: { width: (screenWidth - 60) / 2 },
  casualInner: { padding: 16, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 12 },
  casualIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  casualLabel: { fontSize: 12, fontWeight: '800', flex: 1 },
});

export default SimulationHubScreen;
