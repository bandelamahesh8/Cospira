import React, { memo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { modalStyles as styles, COLORS } from '../../styles/InnerRoomScreen.styles';

const InputModal = ({
  visible,
  title,
  placeholder,
  buttonText,
  keyboardType = 'default',
  onClose,
  onSubmit,
}) => {
  const [value, setValue] = useState('');

  const  handleSubmit = () => {
      onSubmit(value);
      setValue('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{title}</Text>
                  <TouchableOpacity onPress={onClose} accessible={true} accessibilityLabel="Close input">
                    <Ionicons
                      name="close-circle-outline"
                      size={28}
                      color={COLORS.gray[500]}
                    />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder={placeholder}
                  placeholderTextColor="#94a3b8"
                  value={value}
                  onChangeText={setValue}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType={keyboardType}
                />

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleSubmit}
                  accessible={true}
                  accessibilityLabel={buttonText}
                  accessibilityRole="button"
                >
                  <Text style={styles.submitBtnText}>{buttonText}</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default memo(InputModal);
