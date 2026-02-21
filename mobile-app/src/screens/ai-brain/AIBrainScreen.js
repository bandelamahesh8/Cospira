import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { spacing } from '../../core/theme/spacing';
import { borderRadius } from '../../core/theme/borderRadius';
import { shadows } from '../../core/theme/shadows';

import DashboardHeader from '../../components/dashboard/DashboardHeader';
import GlassCard from '../../components/cards/GlassCard';
import StatusBadge from '../../components/ai-widgets/StatusBadge';
import { aiStore } from '../../store/aiStore';
import { authStore } from '../../store/authStore';
import { aiMemoryService } from '../../services/aiMemory.service';
import { aiContextService } from '../../services/aiContext.service';
import { aiReasoningService } from '../../services/aiReasoning.service';
import { aiPersonalityService } from '../../services/aiPersonality.service';
import { aiAgentService } from '../../services/aiAgents.service';
import { aiConflictService } from '../../services/aiConflicts.service';
import { aiTrustService } from '../../services/aiTrust.service';
import { aiEthicsService } from '../../services/aiEthics.service';
import { aiTimelineService } from '../../services/aiTimeline.service';
import { aiTwinService } from '../../services/aiTwin.service';
import AgentDebatePanel from '../../components/ai-widgets/AgentDebatePanel';
import ConflictTimeline from '../../components/ai-widgets/ConflictTimeline';
import TrustMeter from '../../components/ai-widgets/TrustMeter';
import RiskPredictionPanel from '../../components/ai-widgets/RiskPredictionPanel';
import EthicalPulse from '../../components/ai-widgets/EthicalPulse';
import DeepTimeline from '../../components/ai-widgets/DeepTimeline';
import DigitalTwinCard from '../../components/ai-widgets/DigitalTwinCard';
import SimulationPreviewCard from '../../components/ai-widgets/SimulationPreviewCard';
import OptimizationPanel from '../../components/ai-widgets/OptimizationPanel';
import KernelMonitor from '../../components/ai-widgets/KernelMonitor';
import PlatformStatusCard from '../../components/ai-widgets/PlatformStatusCard';
import EnterpriseDashboard from '../../components/ai-widgets/EnterpriseDashboard';
import PluginRegistry from '../../components/ai-widgets/PluginRegistry';
import GoalTracker from '../../components/ai-widgets/GoalTracker';
import { aiSimulationService } from '../../services/aiSimulation.service';
import { aiOptimizeService } from '../../services/aiOptimize.service';
import { aiKernelService } from '../../services/aiKernel.service';
import { aiPlatformService } from '../../services/aiPlatform.service';
import { aiEnterpriseService } from '../../services/aiEnterprise.service';
import { aiPluginsService } from '../../services/aiPlugins.service';
import { aiAutonomousService } from '../../services/aiAutonomous.service';
import { aiOSService } from '../../services/aiOS.service';


const AIBrainScreen = ({ navigation }) => {
  const [memories, setMemories] = useState([]);
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Intelligence State
  const [agents, setAgents] = useState([]);
  const [agentLogs, setAgentLogs] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [trustProfile, setTrustProfile] = useState(null);
  const [ethicsProfile, setEthicsProfile] = useState({ score: 100, status: 'OPTIMAL' });
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [twin, setTwin] = useState(null);
  const [latestSimulation, setLatestSimulation] = useState(null);
  const [optiState, setOptiState] = useState({ settings: { autoHeal: false }, recommendations: [] });
  const [kernelStatus, setKernelStatus] = useState(null);
  const [platformState, setPlatformState] = useState({ sessions: [], lastSync: null });
  const [enterpriseState, setEnterpriseState] = useState({ stats: null, audit: { policies: [], logs: [] } });
  const [pluginState, setPluginState] = useState({ active: [], marketplace: [] });
  const [activeGoal, setActiveGoal] = useState(null);
  const [osPulse, setOsPulse] = useState(null);
  
  const [isEnterpriseMode, setIsEnterpriseMode] = useState(false); // Toggle for demo
  
  // Personality State
  const [personalities, setPersonalities] = useState([]);
  const [currentPersonality, setCurrentPersonality] = useState(null);
  const [switching, setSwitching] = useState(false);
  
  // Reasoning Modal State
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);
  
  // Mock Data replaced with derived state
  const [activeThreads, setActiveThreads] = useState(128);
  const [stats, setStats] = useState({
      roomsJoined: 0,
      sessionsAnalyzed: '0h',
      performanceRating: 92
  });

  const refreshData = useCallback(async () => {
    setLoading(true);
    const user = authStore.user;
    const roomId = 'default-room'; // Analytics root
    const userId = user?.id || 'guest';
    const orgId = user?.orgId || 'org-789'; 
    const roomIds = [roomId];

    try {
      const [
        memList, contextData, personalityData, agentData, logs, 
        conflictData, trustData, ethicsData, timelineData, 
        twinData, simHistory, optiData, kernelData, 
        platformData, entStats, entAudit, pluginData, goalData,
        osPulseData
      ] = await Promise.all([
        aiMemoryService.getMemories(roomId, 10),
        aiContextService.getContext(roomId),
        aiPersonalityService.getPersonalities(),
        aiAgentService.getAgents(),
        aiAgentService.getAgentLogs(),
        aiConflictService.getConflicts(),
        aiTrustService.getTrustProfile(roomId).catch(() => null),
        aiEthicsService.getPulse(),
        aiTimelineService.getTimeline(roomId),
        aiTwinService.getTwin(roomId),
        aiSimulationService.getHistory(roomId),
        aiOptimizeService.getStatus(roomId),
        aiKernelService.getStatus(),
        aiPlatformService.getStatus(userId),
        aiEnterpriseService.getOrgStats(orgId, roomIds),
        aiEnterpriseService.getAudit(orgId),
        aiPluginsService.getPlugins(),
        activeGoal ? aiAutonomousService.getGoalStatus(activeGoal.id) : Promise.resolve(null),
        aiOSService.getPulse()
      ]);
      
      setMemories(memList || []);
      setContext(contextData);
      setAgents(agentData || []);
      setAgentLogs(logs || []);
      setConflicts(conflictData || []);
      setTrustProfile(trustData);
      setEthicsProfile(ethicsData || { score: 100, status: 'OPTIMAL' });
      setTimelineEvents(timelineData || []);
      setTwin(twinData);
      setOptiState(optiData || { settings: { autoHeal: false }, recommendations: [] });
      setKernelStatus(kernelData);
      setPlatformState(platformData || { sessions: [], lastSync: null });
      setEnterpriseState({ stats: entStats, audit: entAudit || { policies: [], logs: [] } });
      setPluginState(pluginData || { active: [], marketplace: [] });
      if (goalData) setActiveGoal(goalData);
      setOsPulse(osPulseData);

      // Derive Real Stats
      const totalMemories = memList ? memList.length : 0;
      const totalAgents = agentData ? agentData.length : 0;
      const analyzedHours = (totalMemories * 0.5).toFixed(1); // Mock derivation
      
      setStats({
          roomsJoined: platformData?.sessions?.length || 0,
          sessionsAnalyzed: `${analyzedHours}h`,
          performanceRating: Math.min(99, 85 + totalAgents * 2)
      });
      
      setActiveThreads(128 + (agentData ? agentData.length * 4 : 0));

      // Auto-register current platform if not already there
      if (platformData && !platformData.sessions.find(s => s.platform === 'MOBILE')) {
        await aiPlatformService.registerPlatform(userId, 'MOBILE', { audio: true, biometric: true });
      }

      if (simHistory && simHistory.length > 0) {
        setLatestSimulation(simHistory[simHistory.length - 1]);
      }

      if (personalityData) {
        setPersonalities(personalityData.all);
        setCurrentPersonality(personalityData.current);
      }
    } catch (error) {
      console.error('[AIBrainScreen] Refresh failed:', error);
    } finally {
      setLoading(false);
    }
  }, [activeGoal]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 15000); // Auto-refresh every 15s
    return () => clearInterval(interval);
  }, [refreshData]);

  const handleSetPersonality = async (id) => {
    setSwitching(true);
    const result = await aiPersonalityService.setPersonality(id);
    if (result && result.success) {
      setCurrentPersonality(result.personality);
      Alert.alert('Personality Switched', `AI is now operating in ${result.personality.name} mode.`);
    }
    setSwitching(false);
  };

  const handleExplain = async (memory) => {
    setSelectedMemory(memory);
    setExplanation(null);
    setExplaining(true);
    
    const result = await aiReasoningService.explain(memory.id);
    setExplanation(result);
    setExplaining(false);
  };
  
  const handleApplyOptimization = async (rec) => {
    setSwitching(true);
    await aiOptimizeService.applyRecommendation('default-room', rec);
    await refreshData();
    setSwitching(false);
  };

  const handleToggleAutoHeal = async (value) => {
    await aiOptimizeService.updateSettings({ autoHeal: value });
    await refreshData();
  };

  const handleTogglePlugin = async (pluginId, action) => {
    await aiPluginsService.togglePlugin(pluginId, action);
    await refreshData();
  };

  const handleLaunchGoal = async (description) => {
    const result = await aiAutonomousService.launchGoal(description, 'default-room');
    if (result && result.goal) {
      setActiveGoal(result.goal);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <DashboardHeader navigation={navigation} />
        <View style={styles.titleRow}>
            <MaterialCommunityIcons name="brain" size={24} color="#8b5cf6" style={{ marginRight: 8 }} />
            <Text style={styles.screenTitle}>AI <Text style={styles.titleAccent}>ANALYTICS</Text></Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
            <Ionicons name="file-tray-full-outline" size={16} color="#64748b" />
            <Text style={styles.sectionLabel}>Recent</Text>
        </View>

        {/* Metric Cards Row */}
        <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
                <View style={styles.metricIconContainer}>
                    <Ionicons name="add" size={20} color="#3b82f6" />
                </View>
                <Text style={styles.metricTitle}>Rooms Joined</Text>
                <View style={styles.metricValueRow}>
                    <Text style={styles.metricBigValue}>{stats.roomsJoined}</Text>
                    <Text style={styles.metricSmallValue}>{stats.roomsJoined > 0 ? '+1' : '-'}</Text>
                </View>
            </View>

            <View style={styles.metricCard}>
                <View style={[styles.metricIconContainer, { backgroundColor: '#f1f5f9' }]}>
                    <Ionicons name="stats-chart" size={18} color="#1e293b" />
                </View>
                <Text style={styles.metricTitle}>Sessions Analyzed</Text>
                <View style={styles.metricValueRow}>
                    <Text style={styles.metricBigValue}>{stats.sessionsAnalyzed}</Text>
                    <Text style={styles.metricSmallValue}>LIVE</Text>
                </View>
            </View>
        </View>

        {/* Performance Rating Card */}
        <TouchableOpacity style={styles.performanceCard} activeOpacity={0.9}>
            <View style={styles.perfHeader}>
                <View style={styles.perfLabelRow}>
                    <Ionicons name="cube-outline" size={18} color="#3b82f6" />
                    <Text style={styles.perfLabel}>Performance Rating</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </View>

            <View style={styles.perfContent}>
                <View>
                    <Text style={styles.perfPercentage}>+{stats.performanceRating}%</Text>
                    <Text style={styles.perfSubtitle}>Active Threads: {activeThreads}</Text>
                </View>
                <View style={styles.perfGraphic}>
                    <View style={styles.perfCircle}>
                        <Ionicons name="home" size={26} color="#ffffff" />
                    </View>
                </View>
            </View>
        </TouchableOpacity>

        {/* Recommended For You Section */}
        <View style={styles.sectionHeader}>
            <Ionicons name="sparkles-outline" size={16} color="#3b82f6" />
            <Text style={styles.sectionLabel}>Recommended For You</Text>
        </View>

        <TouchableOpacity style={styles.toolCard}>
            <View style={[styles.toolIcon, { backgroundColor: '#cbd5e1' }]}>
                <Text style={styles.toolIconText}>A!</Text>
            </View>
            <View style={styles.toolContent}>
                <Text style={styles.toolTitle}>Orion Neural Net</Text>
                <Text style={styles.toolMeta}>210 Rooms Joined</Text>
                <View style={styles.ratingRow}>
                    {[1,2,3,4,5].map(i => <Ionicons key={i} name="star" size={12} color="#fbbf24" style={{marginRight: 2}} />)}
                    <View style={styles.toolStats}>
                        <Ionicons name="people" size={12} color="#94a3b8" />
                        <Text style={styles.toolStatText}>33</Text>
                    </View>
                    <View style={styles.toolStats}>
                        <Ionicons name="copy-outline" size={12} color="#94a3b8" />
                        <Text style={styles.toolStatText}>14</Text>
                    </View>
                </View>
            </View>
            <View style={styles.toolSideGraphic}>
                <View style={styles.sideGraphicCircle}>
                    <Ionicons name="fitness" size={20} color="#3b82f6" />
                </View>
            </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolCard}>
            <View style={[styles.toolIcon, { backgroundColor: '#1e293b' }]}>
                <Ionicons name="cube" size={24} color="#ffffff" />
            </View>
            <View style={styles.toolContent}>
                <Text style={styles.toolTitle}>Neural Nexus 103</Text>
                <Text style={styles.toolMeta}>100 Rooms Joined</Text>
                <View style={styles.ratingRow}>
                     {[1,2,3,4,5].map(i => <Ionicons key={i} name="star" size={12} color={i < 5 ? "#fbbf24" : "#e2e8f0"} style={{marginRight: 2}} />)}
                     <View style={styles.toolStats}>
                        <Ionicons name="people" size={12} color="#94a3b8" />
                        <Text style={styles.toolStatText}>20</Text>
                    </View>
                    <View style={styles.toolStats}>
                        <Ionicons name="copy-outline" size={12} color="#94a3b8" />
                        <Text style={styles.toolStatText}>18</Text>
                    </View>
                </View>
            </View>
            <View style={styles.toolSideGraphic}>
                <View style={styles.sideGraphicCircle}>
                    <Ionicons name="person" size={20} color="#3b82f6" />
                </View>
            </View>
        </TouchableOpacity>

      </ScrollView>

      {/* 4. Reasoning Modal */}
      <Modal
        visible={!!selectedMemory}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedMemory(null)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>NEURAL REASONING TRACE</Text>
              <TouchableOpacity onPress={() => setSelectedMemory(null)}>
                 <Text style={styles.closeBtn}>CLOSE</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.explanationScroll}>
              {explaining ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.loadingText}>Retracing neural pathways...</Text>
                </View>
              ) : explanation ? (
                <View>
                  <Text style={styles.explanationText}>{explanation.explanation}</Text>
                  
                  <View style={styles.divider} />
                  
                  <Text style={styles.logicHeader}>LOGIC STEPS</Text>
                  {explanation.logic_steps.map((step, idx) => (
                    <Text key={idx} style={styles.logicStep}>• {step}</Text>
                  ))}
                  
                  <View style={styles.confidenceBox}>
                     <Text style={styles.confidenceLabel}>CONFIDENCE</Text>
                     <Text style={styles.confidenceValue}>{(explanation.confidence * 100).toFixed(1)}%</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.errorText}>Reasoning trace corrupted or unavailable.</Text>
              )}
            </ScrollView>
          </GlassCard>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
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
    fontWeight: '900',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: '#64748b',
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    marginTop: 10,
  },
  sectionLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  metricIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  metricBigValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
  },
  metricSmallValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  performanceCard: {
    backgroundColor: '#000000',
    borderRadius: 30,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 4,
  },
  perfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  perfLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  perfLabel: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: '700',
  },
  perfContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  perfPercentage: {
    fontSize: 42,
    fontWeight: '900',
    color: '#1e293b',
    letterSpacing: -1,
  },
  perfSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  perfCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  toolIconText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  toolContent: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  toolMeta: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    gap: 4,
  },
  toolStatText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
  },
  trustRiskRow: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
  },
  agentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  agentCard: {
    width: '31%',
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  agentName: {
    color: colors.textPrimary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  agentStatus: {
    color: colors.textTertiary,
    fontSize: 8,
    fontFamily: typography.fonts.mono,
    marginBottom: 4,
  },
  agentAction: {
    color: colors.primary,
    fontSize: 7,
    textAlign: 'center',
    opacity: 0.7,
  },
  emptyStatus: {
    color: colors.textTertiary,
    fontSize: 10,
    textAlign: 'center',
    width: '100%',
    padding: 20,
    fontStyle: 'italic',
  },
  navGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  navCard: {
    width: '48%',
    backgroundColor: colors.surface, // Use generic surface, GlassCard is heavy
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginBottom: 16,
    opacity: 0.8,
  },
  navTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  navDesc: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  insightItem: {
    marginBottom: spacing.sm,
    padding: 16,
  },
  insightText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  refreshText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  memoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  typeTag: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: typography.fonts.mono,
  },
  timeLabel: {
    color: colors.textTertiary,
    fontSize: 10,
  },
  emptyCard: {
    padding: spacing.lg,
    alignItems: 'center',
    opacity: 0.6,
  },
  tapTip: {
    color: colors.primary,
    fontSize: 9,
    marginTop: 8,
    fontWeight: 'bold',
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    maxHeight: '80%',
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  closeBtn: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  explanationScroll: {
    maxHeight: 400,
  },
  explanationText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 24,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: spacing.lg,
  },
  logicHeader: {
    color: colors.secondary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  logicStep: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 6,
  },
  confidenceBox: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 12,
    borderRadius: 8,
  },
  confidenceLabel: {
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  confidenceValue: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: typography.fonts.mono,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 12,
  },
  reliabilityText: {
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'right',
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    padding: 20,
  },
  modeToggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: spacing.lg,
  },
  modeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  activeModeBtn: {
    backgroundColor: colors.primary,
  },
  modeBtnText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  activeModeBtnText: {
    color: '#000',
  },
  pilotBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activePilotBtn: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderColor: colors.danger,
  },
  pilotBtnText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  }
});

const getTypeColor = (type) => {
  switch (type) {
    case 'decision': return colors.primary;
    case 'anomaly': return colors.danger;
    case 'insight': return colors.secondary;
    case 'feedback': return colors.info;
    default: return colors.textSecondary;
  }
};

const getReliabilityColor = (reliability) => {
  switch (reliability) {
    case 'HIGH': return colors.success;
    case 'MEDIUM': return colors.warning;
    case 'LOW': return colors.danger;
    default: return colors.textTertiary;
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'ACTIVE': return colors.primary;
    case 'THINKING': return colors.secondary;
    case 'IDLE': return colors.success;
    default: return colors.textTertiary;
  }
};

export default AIBrainScreen;
