import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  StatusBar,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../hooks/useTheme';
import { socketService } from '../../services/socket.service';
import { authStore } from '../../store/authStore';
import { wp, hp, normalize } from '../../utils/responsive';
import ActivityItem from '../../components/dashboard/ActivityItem';
import LoadingState from '../../components/loading/LoadingState';
import FadeView from '../../components/animations/FadeView';

const RecentActivityScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivities = async (isRefreshing = false) => {
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);

      const token = authStore.token;
      if (!socketService.socket?.connected) {
        await socketService.connect(token);
      }
      
      const data = await socketService.getUserActivity(50);
      if (data) {
        setActivities(data);
      }
    } catch (error) {
      console.log('[RecentActivity] Fetch failed:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivities();
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
        return `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${ampm}`;
    };

    return `${formatHMM(start)} - ${formatHMM(end)}`;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={28} color={colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>All Activity</Text>
      <View style={{ width: 40 }} /> 
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ['#123B6D', '#0B1F3A', '#101922'] : ['#E3EDFB', '#F5F7F8', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        {renderHeader()}

        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingState variant="activity" count={8} />
          </View>
        ) : (
          <FlatList
            data={activities}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <FadeView delay={index * 50} style={styles.itemWrapper}>
                <ActivityItem 
                  type={item.type}
                  title={item.title + (item.endTime ? ` (${formatTimeRange(item.time, item.endTime)})` : '')}
                  subtitle={item.subtitle}
                  time={formatTime(item.time)}
                  duration={item.duration}
                />
              </FadeView>
            )}
            contentContainerStyle={styles.listContent}
            onRefresh={() => fetchActivities(true)}
            refreshing={refreshing}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={64} color={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No activity recorded yet</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: normalize(20),
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Space Grotesk',
  },
  loadingContainer: {
    flex: 1,
    paddingHorizontal: wp(5),
  },
  listContent: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(5),
  },
  itemWrapper: {
    marginBottom: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(20),
    gap: 16,
  },
  emptyText: {
    fontSize: normalize(16),
    fontWeight: '600',
  }
});

export default RecentActivityScreen;
