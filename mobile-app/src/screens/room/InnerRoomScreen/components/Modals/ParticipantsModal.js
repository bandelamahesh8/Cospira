import React, { memo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { authStore } from '../../../../../store/authStore';
import { modalStyles as styles, COLORS } from '../../styles/InnerRoomScreen.styles';

const ParticipantsModal = ({ visible, users, isHost, onClose }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.participantsModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Participants ({users.length + 1})</Text>
            <TouchableOpacity onPress={onClose} accessible={true} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={COLORS.gray[500]} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.participantsList}>
            {/* Local User */}
            <View style={styles.participantRow}>
              <View style={styles.participantAvatar}>
                <Text style={styles.participantInitials}>You</Text>
              </View>
              <Text style={styles.participantName}>
                {authStore.user?.name || authStore.user?.display_name || 'You'} (Me)
              </Text>
              {isHost && (
                <View style={styles.hostBadge}>
                  <Text style={styles.hostBadgeText}>Host</Text>
                </View>
              )}
            </View>

            {/* Remote Users */}
            {users.map((u, index) => (
              <View key={index} style={styles.participantRow}>
                <View style={[styles.participantAvatar, { backgroundColor: COLORS.gray[100] }]}>
                  <Text style={styles.participantInitials}>
                    {(u.name?.[0] || 'U').toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.participantName}>
                  {u.name || `User ${u.id?.slice(0, 4)}`}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default memo(ParticipantsModal);
