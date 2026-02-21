import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
  ScrollView,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../hooks/useTheme';
import GlassCard from '../../components/cards/GlassCard';
import { socketService } from '../../services/socket.service';
import { aiService } from '../../services/ai.service';
import LoadingState from '../../components/loading/LoadingState';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const GameRoomScreen = ({ route, navigation }) => {
  const { colors, isDark } = useTheme();
  const { gameType, tournamentId, roomId } = route.params || {};
  const [gameState, setGameState] = useState('waiting'); // waiting, playing, finished
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [score, setScore] = useState({ player: 0, opponent: 0 });
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [showResults, setShowResults] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    initializeGame();
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const initializeGame = async () => {
    try {
      // Find or create match
      const matchData = await findMatch();
      setGameData(matchData);
      
      // Set up players
      setCurrentPlayer(matchData.players[0]);
      setOpponent(matchData.players[1]);
      setPlayers(matchData.players);
      
      // Start game if ready
      if (matchData.players.length === 2) {
        startGame();
      }
    } catch (error) {
      console.error('[GameRoomScreen] Initialize game error:', error);
      Alert.alert('Error', 'Failed to initialize game');
    }
  };

  const findMatch = async () => {
    // Simulate matchmaking
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      id: `game_${Date.now()}`,
      type: gameType || 'chess',
      players: [
        {
          id: 'player1',
          displayName: 'You',
          rating: 1500,
          isAI: false,
          avatar: null
        },
        {
          id: 'player2',
          displayName: Math.random() > 0.5 ? 'AI Opponent' : 'Human Player',
          rating: 1450 + Math.floor(Math.random() * 100),
          isAI: Math.random() > 0.5,
          avatar: null
        }
      ],
      status: 'ready',
      startTime: new Date().toISOString()
    };
  };

  const startGame = () => {
    setGameState('playing');
    startTimer();
    
    // Setup socket listeners for game events
    socketService.on('game_move', handleGameMove);
    socketService.on('game_end', handleGameEnd);
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleGameMove = (moveData) => {
    // Process opponent move
    setGameData(prev => ({
      ...prev,
      ...moveData
    }));
  };

  const handleGameEnd = (result) => {
    endGame(result.reason);
  };

  const makeMove = async (move) => {
    try {
      // Send move to server
      await socketService.emit('game_move', {
        gameId: gameData.id,
        playerId: currentPlayer.id,
        move
      });
      
      // Update local game state
      setGameData(prev => ({
        ...prev,
        lastMove: move,
        currentPlayer: opponent.id
      }));
      
      // If playing against AI, simulate AI response
      if (opponent.isAI) {
        setAiThinking(true);
        setTimeout(() => {
          makeAIMove();
          setAiThinking(false);
        }, 1000 + Math.random() * 2000);
      }
    } catch (error) {
      console.error('[GameRoomScreen] Make move error:', error);
    }
  };

  const makeAIMove = () => {
    // Simulate AI move
    const aiMove = generateAIMove();
    handleGameMove({
      playerId: opponent.id,
      move: aiMove
    });
  };

  const generateAIMove = () => {
    // Generate a valid AI move based on game type
    switch (gameType) {
      case 'chess':
        return { from: 'e2', to: 'e4', piece: 'pawn' };
      case 'tictactoe':
        return { position: Math.floor(Math.random() * 9) };
      case 'connect4':
        return { column: Math.floor(Math.random() * 7) };
      default:
        return { action: 'move', data: {} };
    }
  };

  const endGame = async (reason) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setGameState('finished');
    
    // Determine winner
    let winner = null;
    let result = 'draw';
    
    if (reason === 'timeout') {
      winner = timeLeft > 0 ? currentPlayer : opponent;
      result = winner === currentPlayer ? 'win' : 'loss';
    } else if (reason === 'resign') {
      winner = opponent;
      result = 'loss';
    } else if (reason === 'checkmate') {
      winner = currentPlayer;
      result = 'win';
    }
    
    // Generate AI analysis
    if (!opponent.isAI) {
      try {
        const gameAnalysis = await aiService.analyzeGameplay(gameData, currentPlayer);
        setAnalysis(gameAnalysis);
      } catch (error) {
        console.error('[GameRoomScreen] Analysis error:', error);
      }
    }
    
    setShowResults(true);
  };

  const resign = () => {
    Alert.alert(
      'Resign Game',
      'Are you sure you want to resign?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resign',
          style: 'destructive',
          onPress: () => endGame('resign')
        }
      ]
    );
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderGameBoard = () => {
    switch (gameType) {
      case 'chess':
        return renderChessBoard();
      case 'tictactoe':
      case 'oxo':
        return renderTicTacToeBoard();
      case 'connect4':
        return renderConnect4Board();
      default:
        return renderDefaultBoard();
    }
  };

  const renderChessBoard = () => (
    <View style={styles.chessBoard}>
      {Array.from({ length: 8 }, (_, row) => (
        <View key={row} style={styles.chessRow}>
          {Array.from({ length: 8 }, (_, col) => {
            const isLight = (row + col) % 2 === 0;
            return (
              <TouchableOpacity
                key={`${row}-${col}`}
                style={[
                  styles.chessSquare,
                  { backgroundColor: isLight ? colors.surface : colors.primary }
                ]}
                onPress={() => makeMove({ from: `${row}${col}`, to: `${row}${col}` })}
              >
                <Text style={styles.chessNotation}>
                  {String.fromCharCode(97 + col)}{8 - row}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );

  const renderTicTacToeBoard = () => (
    <View style={styles.ticTacToeBoard}>
      {Array.from({ length: 9 }, (_, index) => {
        const row = Math.floor(index / 3);
        const col = index % 3;
        const hasPiece = Math.random() > 0.7;
        const piece = hasPiece ? (Math.random() > 0.5 ? 'X' : 'O') : '';
        
        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.ticTacToeSquare,
              { 
                borderTopWidth: row === 0 ? 2 : 1,
                borderLeftWidth: col === 0 ? 2 : 1,
                borderColor: colors.border
              }
            ]}
            onPress={() => makeMove({ position: index })}
          >
            <Text style={[styles.ticTacToePiece, { color: colors.text }]}>
              {piece}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderConnect4Board = () => (
    <View style={styles.connect4Board}>
      {Array.from({ length: 6 }, (_, row) => (
        <View key={row} style={styles.connect4Row}>
          {Array.from({ length: 7 }, (_, col) => {
            const hasPiece = Math.random() > 0.6;
            const piece = hasPiece ? (Math.random() > 0.5 ? 'red' : 'yellow') : null;
            
            return (
              <TouchableOpacity
                key={`${row}-${col}`}
                style={styles.connect4Cell}
                onPress={() => makeMove({ column: col })}
              >
                <View style={[
                  styles.connect4Piece,
                  { 
                    backgroundColor: piece === 'red' ? '#ef4444' : 
                                   piece === 'yellow' ? '#fbbf24' : 
                                   'transparent'
                  }
                ]} />
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );

  const renderDefaultBoard = () => (
    <View style={styles.defaultBoard}>
      <Text style={[styles.defaultBoardText, { color: colors.text }]}>
        {gameType?.toUpperCase()} Game Board
      </Text>
      <TouchableOpacity
        style={[styles.defaultMoveButton, { backgroundColor: colors.primary }]}
        onPress={() => makeMove({ action: 'move' })}
      >
        <Text style={styles.defaultMoveButtonText}>Make Move</Text>
      </TouchableOpacity>
    </View>
  );

  const renderGameInfo = () => (
    <View style={styles.gameInfo}>
      <View style={styles.playerInfo}>
        <View style={styles.playerCard}>
          <Text style={[styles.playerName, { color: colors.text }]}>
            {currentPlayer?.displayName}
          </Text>
          <Text style={[styles.playerRating, { color: colors.textSecondary }]}>
            Rating: {currentPlayer?.rating}
          </Text>
          <View style={[
            styles.playerStatus,
            { backgroundColor: gameState === 'playing' ? '#4ade80' : '#6b7280' }
          ]}>
            <Text style={styles.playerStatusText}>
              {gameState === 'playing' ? 'Your Turn' : 'Waiting'}
            </Text>
          </View>
        </View>
        
        <View style={styles.vsContainer}>
          <Text style={[styles.vsText, { color: colors.textSecondary }]}>VS</Text>
        </View>
        
        <View style={styles.playerCard}>
          <Text style={[styles.playerName, { color: colors.text }]}>
            {opponent?.displayName}
          </Text>
          <Text style={[styles.playerRating, { color: colors.textSecondary }]}>
            Rating: {opponent?.rating}
          </Text>
          <View style={[
            styles.playerStatus,
            { backgroundColor: aiThinking ? '#fbbf24' : '#6b7280' }
          ]}>
            <Text style={styles.playerStatusText}>
              {aiThinking ? 'Thinking...' : 'Waiting'}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.gameControls}>
        <View style={styles.timerContainer}>
          <Ionicons name="time" size={20} color={colors.textSecondary} />
          <Text style={[styles.timerText, { color: colors.text }]}>
            {formatTime(timeLeft)}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.resignButton, { backgroundColor: colors.surface }]}
          onPress={resign}
        >
          <Text style={[styles.resignButtonText, { color: colors.text }]}>
            Resign
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderResults = () => (
    <Modal
      visible={showResults}
      animationType="fade"
      transparent
      onRequestClose={() => setShowResults(false)}
    >
      <View style={styles.resultsOverlay}>
        <GlassCard variant="dark" style={styles.resultsModal}>
          <View style={styles.resultsHeader}>
            <Text style={[styles.resultsTitle, { color: colors.text }]}>
              Game Complete!
            </Text>
            <TouchableOpacity onPress={() => setShowResults(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.resultsContent}>
            <View style={styles.resultsScore}>
              <Text style={[styles.resultsScoreText, { color: colors.text }]}>
                {currentPlayer?.displayName}: {score.player}
              </Text>
              <Text style={[styles.resultsScoreText, { color: colors.text }]}>
                {opponent?.displayName}: {score.opponent}
              </Text>
            </View>
            
            {analysis && (
              <View style={styles.analysisSection}>
                <Text style={[styles.analysisTitle, { color: colors.text }]}>
                  AI Analysis
                </Text>
                <View style={styles.analysisMetrics}>
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                      Accuracy
                    </Text>
                    <Text style={[styles.metricValue, { color: colors.primary }]}>
                      {analysis.performance.accuracy}%
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                      Strategy
                    </Text>
                    <Text style={[styles.metricValue, { color: colors.primary }]}>
                      {analysis.performance.strategyScore}%
                    </Text>
                  </View>
                </View>
                
                <View style={styles.analysisInsights}>
                  <Text style={[styles.insightsTitle, { color: colors.text }]}>
                    Strengths
                  </Text>
                  {analysis.strengths.map((strength, index) => (
                    <Text key={index} style={[styles.insightText, { color: colors.textSecondary }]}>
                      • {strength}
                    </Text>
                  ))}
                  
                  <Text style={[styles.insightsTitle, { color: colors.text }]}>
                    Improvements
                  </Text>
                  {analysis.improvements.map((improvement, index) => (
                    <Text key={index} style={[styles.insightText, { color: colors.textSecondary }]}>
                      • {improvement}
                    </Text>
                  ))}
                </View>
              </View>
            )}
            
            <View style={styles.resultsActions}>
              <TouchableOpacity
                style={[styles.playAgainButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setShowResults(false);
                  initializeGame();
                }}
              >
                <Text style={styles.playAgainButtonText}>Play Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.leaveButton, { backgroundColor: colors.surface }]}
                onPress={() => navigation.goBack()}
              >
                <Text style={[styles.leaveButtonText, { color: colors.text }]}>
                  Leave Game
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </GlassCard>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          {gameType?.toUpperCase()} Game
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Game Info */}
      {renderGameInfo()}

      {/* Game Board */}
      <Animated.View style={[styles.gameBoardContainer, { opacity: fadeAnim }]}>
        {renderGameBoard()}
      </Animated.View>

      {/* Results Modal */}
      {renderResults()}
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
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  gameInfo: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  playerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  playerCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  playerRating: {
    fontSize: 12,
    marginBottom: 8,
  },
  playerStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  playerStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  vsContainer: {
    paddingHorizontal: 20,
  },
  vsText: {
    fontSize: 16,
    fontWeight: '700',
  },
  gameControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  resignButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resignButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  gameBoardContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  chessBoard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  chessRow: {
    flex: 1,
    flexDirection: 'row',
  },
  chessSquare: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chessNotation: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
  },
  ticTacToeBoard: {
    flex: 1,
    aspectRatio: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 8,
    overflow: 'hidden',
  },
  ticTacToeSquare: {
    width: '33.33%',
    height: '33.33%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticTacToePiece: {
    fontSize: 32,
    fontWeight: '700',
  },
  connect4Board: {
    flex: 1,
    aspectRatio: 7/6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  connect4Row: {
    flex: 1,
    flexDirection: 'row',
  },
  connect4Cell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  connect4Piece: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  defaultBoard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  defaultBoardText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  defaultMoveButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  defaultMoveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsModal: {
    width: screenWidth * 0.9,
    maxHeight: screenHeight * 0.8,
    padding: 20,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  resultsContent: {
    paddingBottom: 20,
  },
  resultsScore: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resultsScoreText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  analysisSection: {
    marginBottom: 20,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  analysisMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  analysisInsights: {
    marginBottom: 16,
  },
  insightsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 12,
    marginBottom: 2,
  },
  resultsActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  playAgainButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  playAgainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  leaveButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GameRoomScreen;
