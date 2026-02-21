import React, { useRef, memo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { chatStyles as styles, COLORS } from '../../styles/InnerRoomScreen.styles';

const ChatOverlay = ({ messages, onClose, onSendMessage }) => {
  const [chatInput, setChatInput] = React.useState('');
  const scrollViewRef = useRef(null);

  const handleSend = () => {
    if (chatInput.trim()) {
      onSendMessage(chatInput.trim());
      setChatInput('');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.chatOverlay}
    >
      <View style={styles.chatHeader}>
        <Text style={styles.chatTitle}>Room Chat</Text>
        <TouchableOpacity onPress={onClose} accessible={true} accessibilityLabel="Close chat">
          <Ionicons name="close" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.chatList}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.chatMsg,
              msg.userId === 'me' ? styles.myMsg : styles.theirMsg,
            ]}
          >
            <Text
              style={[
                styles.msgText,
                msg.userId === 'me' ? styles.myMsgText : {},
              ]}
            >
              {msg.text || msg.content}
            </Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.chatInputContainer}>
        <TextInput
          style={styles.chatInput}
          value={chatInput}
          onChangeText={setChatInput}
          placeholder="Type a message..."
          placeholderTextColor="#94a3b8"
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity 
            style={styles.sendBtn} 
            onPress={handleSend}
            accessible={true}
            accessibilityLabel="Send message"
            accessibilityRole="button"
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default memo(ChatOverlay);
