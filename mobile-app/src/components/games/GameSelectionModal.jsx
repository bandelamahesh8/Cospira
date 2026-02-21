
import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, FlatList, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { modalStyles as styles, COLORS, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING, SHADOWS } from '../../screens/room/InnerRoomScreen/styles/InnerRoomScreen.styles';
import { authStore } from '../../store/authStore';

const GAMES = [
  { id: 'ludo', name: 'Ludo', icon: 'grid-outline', color: COLORS.error.main, surface: COLORS.error.surface },
  { id: 'snakeladder', name: 'Snakes & Ladders', icon: 'trending-up-outline', color: COLORS.success.main, surface: COLORS.success.surface },
  { id: 'chess', name: 'Chess', icon: 'disc-outline', color: COLORS.gray[900], surface: COLORS.gray[200] },
  { id: 'xoxo', name: 'Tic-Tac-Toe', icon: 'close-outline', color: COLORS.primary.main, surface: COLORS.primary.surface }
];

const GameSelectionModal = ({ visible, onClose, onSelectGame, users = [] }) => {
  const [selectedGame, setSelectedGame] = useState(null);
  const [step, setStep] = useState('game'); // 'game' or 'player'

  const handleClose = () => {
    setStep('game');
    setSelectedGame(null);
    onClose();
  };

  const handleSelectGame = (game) => {
    setSelectedGame(game);
    setStep('player');
  };

  const handleSelectPlayer = (opponentId) => {
    if (selectedGame) {
      onSelectGame(selectedGame.id, [authStore.user?.id, opponentId]);
      handleClose();
    }
  };

  const renderGameItem = ({ item }) => (
    <TouchableOpacity 
      style={componentStyles.gameCard} 
      onPress={() => handleSelectGame(item)}
    >
      <View style={[componentStyles.iconContainer, { backgroundColor: item.surface }]}>
        <Ionicons name={item.icon} size={32} color={item.color} />
      </View>
      <Text style={componentStyles.gameName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderPlayerItem = ({ item }) => (
    <TouchableOpacity 
      style={componentStyles.playerRow} 
      onPress={() => handleSelectPlayer(item.id)}
    >
      <View style={componentStyles.playerAvatar}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={componentStyles.avatarImage} />
        ) : (
          <View style={componentStyles.avatarPlaceholder}>
            <Text style={componentStyles.avatarInitial}>
              {item.name ? item.name[0].toUpperCase() : '?'}
            </Text>
          </View>
        )}
      </View>
      <View style={componentStyles.playerInfo}>
        <Text style={componentStyles.playerName}>{item.name || 'Anonymous'}</Text>
        <Text style={componentStyles.playerStatus}>Online</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.gray[300]} />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableOpacity 
         style={styles.modalOverlay} 
         activeOpacity={1} 
         onPress={handleClose}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {step === 'player' && (
                    <TouchableOpacity onPress={() => setStep('game')} style={{ marginRight: 10 }}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.gray[900]} />
                    </TouchableOpacity>
                )}
                <Text style={styles.modalTitle}>
                    {step === 'game' ? 'Select a Game' : `Play ${selectedGame?.name} with...`}
                </Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={COLORS.gray[500]} />
            </TouchableOpacity>
          </View>
          
          {step === 'game' ? (
            <FlatList
              data={GAMES}
              renderItem={renderGameItem}
              keyExtractor={item => item.id}
              numColumns={2}
              columnWrapperStyle={componentStyles.row}
              contentContainerStyle={componentStyles.listContent}
            />
          ) : (
            <View style={componentStyles.playerListContainer}>
              {users.length > 0 ? (
                <FlatList
                  data={users}
                  renderItem={renderPlayerItem}
                  keyExtractor={item => item.id}
                  contentContainerStyle={componentStyles.playerList}
                />
              ) : (
                <View style={componentStyles.emptyState}>
                  <Ionicons name="people-outline" size={48} color={COLORS.gray[300]} />
                  <Text style={componentStyles.emptyText}>No other participants in the room</Text>
                  <Text style={componentStyles.emptySubtext}>Invite friends to play together!</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const componentStyles = StyleSheet.create({
  listContent: {
    paddingBottom: SPACING.xl,
  },
  row: {
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  gameCard: {
    width: '48%',
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
    ...SHADOWS.sm,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  gameName: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
  },
  playerListContainer: {
      minHeight: 300,
  },
  playerList: {
      paddingBottom: SPACING.xl,
  },
  playerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.md,
      backgroundColor: '#fff',
      borderRadius: BORDER_RADIUS.lg,
      marginBottom: SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.gray[100],
  },
  playerAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      overflow: 'hidden',
      marginRight: SPACING.md,
  },
  avatarImage: {
      width: '100%',
      height: '100%',
  },
  avatarPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: COLORS.primary.surface,
      justifyContent: 'center',
      alignItems: 'center',
  },
  avatarInitial: {
      color: COLORS.primary.main,
      fontWeight: 'bold',
      fontSize: 18,
  },
  playerInfo: {
      flex: 1,
  },
  playerName: {
      fontSize: FONT_SIZE.md,
      fontWeight: 'bold',
      color: COLORS.gray[900],
  },
  playerStatus: {
      fontSize: FONT_SIZE.xs,
      color: COLORS.success.main,
  },
  emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 50,
  },
  emptyText: {
      marginTop: 10,
      fontSize: FONT_SIZE.md,
      color: COLORS.gray[600],
      fontWeight: '600',
  },
  emptySubtext: {
      fontSize: FONT_SIZE.sm,
      color: COLORS.gray[400],
  }
});

export default GameSelectionModal;
