import AsyncStorage from '@react-native-async-storage/async-storage';

const MOCK_THREATS = [
  { id: 't1', type: 'Intrusion', severity: 'Critical', sector: '04', coordinates: {x: 120, y: 45} },
  { id: 't2', type: 'Data Leak', severity: 'Warning', sector: '09', coordinates: {x: 80, y: 110} },
];

const MOCK_PREDICTIONS = [
  { id: 'p1', insight: 'Pattern match in Sector 7 indicates 88% probability of brute force.', confidence: 88 },
  { id: 'p2', insight: 'Resource optimization suggested for Node B.', confidence: 94 },
];

class AIService {
  constructor() {
    this.listeners = [];
    this.summaries = [];
    this.analysis = [];
    this.recommendations = [];
  }

  // Simulate network delay
  async _delay(ms = 500) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getStatus() {
    await this._delay();
    return {
      status: 'active',
      activeSectors: 12,
      aiConfidence: '98%',
      recommendation: 'Maintain Hold'
    };
  }

  async getPredictions() {
    await this._delay();
    return MOCK_PREDICTIONS;
  }

  async getThreatMap() {
    await this._delay();
    return MOCK_THREATS;
  }

  // AI Room Summary (Pro Mode)
  async generateRoomSummary(roomData, options = {}) {
    try {
      const {
        includeTranscript = true,
        includeActionItems = true,
        includeHighlights = true,
        summaryLength = 'medium' // short, medium, long
      } = options;

      await this._delay(1500); // Simulate AI processing

      const summary = {
        id: `summary_${Date.now()}`,
        roomId: roomData.id,
        roomName: roomData.name,
        generatedAt: new Date().toISOString(),
        summaryLength,
        
        // Executive summary
        executiveSummary: this._generateExecutiveSummary(roomData),
        
        // Key highlights
        highlights: includeHighlights ? this._generateHighlights(roomData) : [],
        
        // Action items
        actionItems: includeActionItems ? this._generateActionItems(roomData) : [],
        
        // Participant insights
        participantInsights: this._generateParticipantInsights(roomData),
        
        // Sentiment analysis
        sentimentAnalysis: this._analyzeSentiment(roomData),
        
        // Performance metrics
        performanceMetrics: this._generatePerformanceMetrics(roomData),
        
        // Recommendations
        recommendations: this._generateRecommendations(roomData),
        
        // Full transcript (if requested)
        transcript: includeTranscript ? roomData.transcript || [] : undefined,
        
        // AI confidence score
        confidenceScore: Math.floor(Math.random() * 20) + 80 // 80-100%
      };

      this.summaries.push(summary);
      await this._saveSummaries();
      
      return summary;
    } catch (error) {
      console.error('[AIService] Generate room summary error:', error);
      throw error;
    }
  }

  // Match Analysis for Games
  async analyzeGameplay(gameData, playerData) {
    try {
      await this._delay(1000);

      const analysis = {
        id: `analysis_${Date.now()}`,
        gameId: gameData.id,
        gameType: gameData.type,
        playerId: playerData.id,
        generatedAt: new Date().toISOString(),
        
        // Performance metrics
        performance: {
          accuracy: Math.floor(Math.random() * 30) + 70, // 70-100%
          reactionTime: Math.floor(Math.random() * 200) + 100, // 100-300ms
          strategyScore: Math.floor(Math.random() * 25) + 75, // 75-100%
          consistency: Math.floor(Math.random() * 20) + 80, // 80-100%
        },
        
        // Strengths
        strengths: this._identifyStrengths(gameData, playerData),
        
        // Areas for improvement
        improvements: this._identifyImprovements(gameData, playerData),
        
        // Tactical recommendations
        tactics: this._generateTacticalRecommendations(gameData, playerData),
        
        // Pattern recognition
        patterns: this._analyzePatterns(gameData, playerData),
        
        // Comparison with peers
        peerComparison: this._compareWithPeers(gameData, playerData),
        
        // Progress tracking
        progress: this._trackProgress(playerData),
        
        // AI confidence
        confidenceScore: Math.floor(Math.random() * 15) + 85 // 85-100%
      };

      this.analysis.push(analysis);
      await this._saveAnalysis();
      
      return analysis;
    } catch (error) {
      console.error('[AIService] Analyze gameplay error:', error);
      throw error;
    }
  }

  // Matchmaking AI
  async findOptimalMatch(playerProfile, preferences = {}) {
    try {
      await this._delay(800);

      const candidates = this._generateMatchCandidates(playerProfile, preferences);
      const ranked = this._rankCandidates(candidates, playerProfile);
      
      return {
        optimalMatches: ranked.slice(0, 5),
        matchQuality: ranked[0]?.compatibility || 0,
        estimatedWaitTime: Math.floor(Math.random() * 120) + 30, // 30-150 seconds
        alternatives: ranked.slice(5, 10),
        reasoning: this._generateMatchReasoning(ranked[0], playerProfile)
      };
    } catch (error) {
      console.error('[AIService] Find optimal match error:', error);
      throw error;
    }
  }

  // Content Moderation
  async moderateContent(content, contentType = 'text') {
    try {
      await this._delay(300);

      const moderation = {
        id: `moderation_${Date.now()}`,
        contentType,
        timestamp: new Date().toISOString(),
        
        // Safety analysis
        safety: {
          isSafe: Math.random() > 0.1, // 90% safe
          confidence: Math.floor(Math.random() * 10) + 90, // 90-100%
          categories: this._analyzeSafetyCategories(content),
        },
        
        // Toxicity detection
        toxicity: {
          level: this._assessToxicityLevel(content),
          score: Math.floor(Math.random() * 100),
          confidence: Math.floor(Math.random() * 15) + 85,
        },
        
        // Spam detection
        spam: {
          isSpam: Math.random() > 0.8, // 20% spam
          confidence: Math.floor(Math.random() * 20) + 80,
          reasons: this._identifySpamReasons(content),
        },
        
        // Recommendations
        action: this._recommendModerationAction(content),
        appealable: true
      };

      return moderation;
    } catch (error) {
      console.error('[AIService] Moderate content error:', error);
      throw error;
    }
  }

  // Tournament Predictions
  async predictTournamentOutcome(tournamentData, participantData) {
    try {
      await this._delay(1200);

      const predictions = {
        tournamentId: tournamentData.id,
        generatedAt: new Date().toISOString(),
        
        // Winner predictions
        winnerPredictions: this._predictWinners(participantData),
        
        // Bracket analysis
        bracketAnalysis: this._analyzeBracket(tournamentData, participantData),
        
        // Upset predictions
        potentialUpsets: this._predictUpsets(participantData),
        
        // Statistical insights
        insights: this._generateTournamentInsights(tournamentData, participantData),
        
        // Confidence scores
        confidence: Math.floor(Math.random() * 20) + 75, // 75-95%
      };

      return predictions;
    } catch (error) {
      console.error('[AIService] Predict tournament outcome error:', error);
      throw error;
    }
  }

  // Real-time event subscription
  subscribeToEvents(callback) {
    const interval = setInterval(() => {
       // Randomly emit an event
       if (Math.random() > 0.7) {
         callback({ type: 'ANOMALY_DETECTED', sector: Math.floor(Math.random() * 10) });
       }
    }, 5000);
    return () => clearInterval(interval);
  }

  // Get saved summaries
  async getSummaries(roomId) {
    try {
      const stored = await AsyncStorage.getItem('ai_summaries');
      const summaries = stored ? JSON.parse(stored) : [];
      
      if (roomId) {
        return summaries.filter(s => s.roomId === roomId);
      }
      
      return summaries;
    } catch (error) {
      console.error('[AIService] Get summaries error:', error);
      return [];
    }
  }

  // Get saved analysis
  async getAnalysis(playerId) {
    try {
      const stored = await AsyncStorage.getItem('ai_analysis');
      const analysis = stored ? JSON.parse(stored) : [];
      
      if (playerId) {
        return analysis.filter(a => a.playerId === playerId);
      }
      
      return analysis;
    } catch (error) {
      console.error('[AIService] Get analysis error:', error);
      return [];
    }
  }

  // Private helper methods
  _generateExecutiveSummary(roomData) {
    const templates = [
      "Productive session with {participants} participants focusing on {topic}. Key decisions made and action items identified.",
      "Collaborative discussion on {topic} resulted in {outcomes} outcomes. Strong engagement from all participants.",
      "Strategic meeting covering {topic}. Effective problem-solving and clear next steps established."
    ];
    
    return templates[Math.floor(Math.random() * templates.length)]
      .replace('{participants}', roomData.participants?.length || 4)
      .replace('{topic}', roomData.topic || 'project planning')
      .replace('{outcomes}', Math.floor(Math.random() * 3) + 2);
  }

  _generateHighlights(roomData) {
    return [
      "Key decision made on project timeline",
      "New feature requirements identified",
      "Budget allocation approved",
      "Team roles clarified"
    ].slice(0, Math.floor(Math.random() * 3) + 2);
  }

  _generateActionItems(roomData) {
    return [
      { text: "Review and finalize project proposal", assignee: "Team Lead", priority: "high" },
      { text: "Schedule follow-up meeting", assignee: "Coordinator", priority: "medium" },
      { text: "Prepare budget report", assignee: "Finance", priority: "high" }
    ].slice(0, Math.floor(Math.random() * 2) + 1);
  }

  _generateParticipantInsights(roomData) {
    return {
      mostActive: "John Doe",
      mostContributions: "Jane Smith",
      bestIdeas: "Mike Johnson",
      engagementLevel: "High"
    };
  }

  _analyzeSentiment(roomData) {
    return {
      overall: "Positive",
      confidence: 0.87,
      breakdown: {
        positive: 0.65,
        neutral: 0.25,
        negative: 0.10
      }
    };
  }

  _generatePerformanceMetrics(roomData) {
    return {
      efficiency: 85,
      participation: 92,
      decisionMaking: 78,
      collaboration: 88
    };
  }

  _generateRecommendations(roomData) {
    return [
      "Consider shorter meetings for better focus",
      "Prepare agenda in advance for efficiency",
      "Follow up on action items promptly"
    ];
  }

  _identifyStrengths(gameData, playerData) {
    return [
      "Excellent strategic planning",
      "Quick decision making",
      "Consistent performance under pressure"
    ];
  }

  _identifyImprovements(gameData, playerData) {
    return [
      "Consider more aggressive opening strategies",
      "Practice endgame scenarios",
      "Study opponent patterns more carefully"
    ];
  }

  _generateTacticalRecommendations(gameData, playerData) {
    return [
      "Focus on controlling the center",
      "Develop piece coordination early",
      "Maintain pawn structure integrity"
    ];
  }

  _analyzePatterns(gameData, playerData) {
    return {
      openingStyle: "Aggressive",
      midgameStrategy: "Tactical",
      endgameSkill: "Strong",
      commonMistakes: ["Time pressure", "Overextension"]
    };
  }

  _compareWithPeers(gameData, playerData) {
    return {
      percentile: 78,
      strongerThan: "65% of players",
      areasAhead: ["Tactical play", "Speed"],
      areasBehind: ["Endgame technique"]
    };
  }

  _trackProgress(playerData) {
    return {
      ratingChange: "+45",
      winRate: 0.68,
      improvementRate: 0.12,
      streak: "W3"
    };
  }

  _generateMatchCandidates(playerProfile, preferences) {
    // Generate mock candidates
    return Array.from({ length: 20 }, (_, i) => ({
      id: `player_${i + 1}`,
      rating: playerProfile.rating + Math.floor(Math.random() * 200) - 100,
      winRate: Math.random() * 0.4 + 0.4, // 0.4-0.8
      playStyle: ["Aggressive", "Defensive", "Balanced"][Math.floor(Math.random() * 3)],
      availability: Math.random() > 0.3,
      latency: Math.floor(Math.random() * 100) + 20
    }));
  }

  _rankCandidates(candidates, playerProfile) {
    return candidates
      .map(candidate => ({
        ...candidate,
        compatibility: this._calculateCompatibility(candidate, playerProfile)
      }))
      .sort((a, b) => b.compatibility - a.compatibility);
  }

  _calculateCompatibility(candidate, playerProfile) {
    const ratingDiff = Math.abs(candidate.rating - playerProfile.rating);
    const ratingScore = Math.max(0, 100 - ratingDiff / 2);
    const availabilityScore = candidate.availability ? 100 : 0;
    const latencyScore = Math.max(0, 100 - candidate.latency);
    
    return (ratingScore * 0.4 + availabilityScore * 0.4 + latencyScore * 0.2);
  }

  _generateMatchReasoning(match, playerProfile) {
    return `Selected for optimal rating match (${Math.abs(match.rating - playerProfile.rating)} point difference), good availability, and low latency connection.`;
  }

  _analyzeSafetyCategories(content) {
    return {
      harassment: Math.random() > 0.95,
      hateSpeech: Math.random() > 0.98,
      violence: Math.random() > 0.99,
      selfHarm: Math.random() > 0.99,
      sexualContent: Math.random() > 0.9
    };
  }

  _assessToxicityLevel(content) {
    const score = Math.random();
    if (score < 0.7) return 'low';
    if (score < 0.9) return 'medium';
    return 'high';
  }

  _identifySpamReasons(content) {
    const reasons = [];
    if (Math.random() > 0.5) reasons.push("Repetitive content");
    if (Math.random() > 0.7) reasons.push("Unsolicited promotion");
    if (Math.random() > 0.8) reasons.push("Excessive messaging");
    return reasons;
  }

  _recommendModerationAction(content) {
    const toxicity = Math.random();
    if (toxicity < 0.7) return "allow";
    if (toxicity < 0.9) return "flag";
    return "remove";
  }

  _predictWinners(participantData) {
    return participantData
      .map(p => ({
        participant: p.id,
        winProbability: Math.random(),
        confidence: Math.random() * 0.3 + 0.7
      }))
      .sort((a, b) => b.winProbability - a.winProbability)
      .slice(0, 5);
  }

  _analyzeBracket(tournamentData, participantData) {
    return {
      toughestQuarter: "Q2",
      easiestPath: "Winner of Q1",
      potentialFinal: "Player 1 vs Player 3",
      bracketStrength: 0.78
    };
  }

  _predictUpsets(participantData) {
    return participantData
      .filter(() => Math.random() > 0.7)
      .slice(0, 3)
      .map(p => ({
        underdog: p.id,
        opponent: `Player_${Math.floor(Math.random() * 10)}`,
        upsetProbability: Math.random() * 0.4 + 0.1
      }));
  }

  _generateTournamentInsights(tournamentData, participantData) {
    return [
      "Top seeds have 78% historical win rate",
      "Upsets more likely in early rounds",
      "Player experience correlates strongly with performance"
    ];
  }

  // Storage methods
  async _saveSummaries() {
    try {
      await AsyncStorage.setItem('ai_summaries', JSON.stringify(this.summaries));
    } catch (error) {
      console.error('[AIService] Save summaries error:', error);
    }
  }

  async _saveAnalysis() {
    try {
      await AsyncStorage.setItem('ai_analysis', JSON.stringify(this.analysis));
    } catch (error) {
      console.error('[AIService] Save analysis error:', error);
    }
  }
}

export const aiService = new AIService();
