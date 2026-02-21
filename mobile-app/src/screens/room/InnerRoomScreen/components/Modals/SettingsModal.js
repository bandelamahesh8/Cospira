import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { modalStyles as styles, COLORS } from '../../styles/InnerRoomScreen.styles';

const SettingsModal = ({ visible, onClose }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Room Settings</Text>
                <TouchableOpacity onPress={onClose} accessible={true} accessibilityLabel="Close settings">
                  <Ionicons name="close" size={24} color={COLORS.gray[500]} />
                </TouchableOpacity>
              </View>

              <View style={{ paddingBottom: 20 }}>
                <TouchableOpacity
                  style={[styles.settingsOption, { marginBottom: 16 }]}
                  onPress={() => Alert.alert('Audio', 'Audio settings here')}
                >
                  <Ionicons name="volume-medium-outline" size={24} color={COLORS.gray[600]} />
                  <Text style={styles.settingsOptionText}>Audio Output</Text>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.gray[300]} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsOption, { marginBottom: 16 }]}
                  onPress={() => Alert.alert('Video', 'Video settings here')}
                >
                  <Ionicons name="videocam-outline" size={24} color={COLORS.gray[600]} />
                  <Text style={styles.settingsOptionText}>Video Settings</Text>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.gray[300]} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.settingsOption}
                  onPress={() => Alert.alert('Report', 'Reporting interface')}
                >
                  <Ionicons name="flag-outline" size={24} color={COLORS.gray[600]} />
                  <Text style={styles.settingsOptionText}>Report Issue</Text>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.gray[300]} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default memo(SettingsModal);
