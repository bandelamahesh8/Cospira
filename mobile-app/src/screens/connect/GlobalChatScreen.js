import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, BackHandler, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

const YOUR_IMG = 'https://i.pravatar.cc/300?img=33'; // You

const GlobalChatScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [strangerIndex, setStrangerIndex] = useState(0);
  const inputRef = React.useRef(null);

  // Initial connection simulation
  useEffect(() => {
      connectToNewStranger();
  }, []);

  const connectToNewStranger = () => {
      setMessages([
          { id: 'sys-1', type: 'system', text: 'Connected to anonymous user.' },
      ]);
      // Simulate receiving a message after a delay
      setTimeout(() => {
          setMessages(prev => [...prev, { id: 'msg-1', type: 'received', text: 'Hello! Anyone there? 👋', time: 'Now' }]);
      }, 1000);
  };

  const handleSkip = () => {
      // Logic to switch user
      setStrangerIndex((prev) => prev + 1); // Just increment to trigger effect if dependent, here just sim re-render
      connectToNewStranger();
  };

  const handleSend = () => {
    if (inputText.trim().length > 0) {
      setMessages([...messages, { id: Date.now(), type: 'sent', text: inputText, time: 'Just now' }]);
      setInputText('');
    }
  };
  
  // Handle Hardware Back Button
  useEffect(() => {
    const backAction = () => {
      Alert.alert(
          'Disengage Link?',
          'Are you sure you want to leave the chat connect?',
          [
              { text: 'Cancel', onPress: () => null, style: 'cancel' },
              { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() }
          ]
      );
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, []);

  const handleLeave = () => {
      Alert.alert(
          'Disengage Link?',
          'Are you sure you want to leave the chat connect?',
          [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() }
          ]
      );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={['#fdf4ff', '#f3f4ff', '#e0e7ff']}
        style={styles.background}
      />

      {/* --- HEADER --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLeave} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Chat Connect</Text>
          <View style={styles.statusRow}>
              <View style={styles.secureBadge}>
                  <Ionicons name="lock-closed" size={10} color="#166534" style={{marginRight: 2}} />
                  <Text style={styles.secureText}>End-to-End Encrypted</Text>
              </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#be123c' }]} onPress={handleLeave}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
          {/* --- CHAT SECTION --- */}
          <View style={styles.chatSection}>
              
              {/* Messages Area */}
              <ScrollView 
                style={styles.messagesScrollView}
                contentContainerStyle={styles.messagesContainer}
                showsVerticalScrollIndicator={false}
              >
                      {messages.map((msg) => {
                          if (msg.type === 'system') {
                              return (
                                <View key={msg.id} style={styles.systemMsgContainer}>
                                    <View style={styles.systemIcon}>
                                        <Ionicons name="flash" size={12} color="#64748b" />
                                    </View>
                                    <Text style={styles.systemMsgText}>{msg.text}</Text>
                                </View>
                              );
                          }
                          if (msg.type === 'received') {
                              return (
                                  <View key={msg.id} style={styles.receivedMsgBubble}>
                                      <Text style={styles.msgText}>{msg.text}</Text>
                                  </View>
                              );
                          }
                           return (
                              <View key={msg.id} style={styles.sentMsgBubble}>
                                  <Text style={styles.sentMsgText}>{msg.text}</Text>
                              </View>
                          );
                      })}
              </ScrollView>

              {/* Input Area */}
              <View style={styles.inputRow}>
                  <TouchableOpacity style={{marginRight: 8}} onPress={() => Alert.alert('Emoji', 'Emoji picker coming soon!')}>
                      <Ionicons name="happy-outline" size={24} color="#64748b" />
                  </TouchableOpacity>
                  <TextInput 
                      ref={inputRef}
                      style={styles.chatInput}
                      placeholder="Type a message..."
                      placeholderTextColor="#94a3b8"
                      value={inputText}
                      onChangeText={setInputText}
                      onSubmitEditing={handleSend}
                  />
                  <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
                      <Ionicons name="send" size={20} color="#6366f1" />
                  </TouchableOpacity>
              </View>

              {/* --- BOTTOM CONTROLS --- */}
              <View style={styles.controlsRow}>
                  {/* Skip Button - Only control needed here essentially to cycle chats */}
                  <TouchableOpacity style={[styles.controlBtn, { flex: 1 }]} onPress={handleSkip}>
                      <View style={[styles.btnBase, { backgroundColor: '#e9d5ff' }]}>
                          <Ionicons name="play-forward" size={20} color="#6b21a8" />
                          <Text style={[styles.controlText, { color: '#6b21a8' }]}>Skip Stranger</Text>
                      </View>
                  </TouchableOpacity>
              </View>
          </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  background: {
      position: 'absolute',
      left: 0, 
      right: 0, 
      top: 0, 
      bottom: 0,
  },
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginTop: Platform.OS === 'android' ? 40 : 0,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0,0,0,0.05)',
      backgroundColor: 'rgba(255,255,255,0.7)',
      zIndex: 999,
      elevation: 50,
  },
  iconBtn: {
      width: 40, 
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff',
      borderRadius: 20,
      shadowColor: '#64748b',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
  },
  headerCenter: {
      alignItems: 'center',
  },
  headerTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#0f172a',
  },
  statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
  },
  secureBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#dcfce7',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
  },
  secureText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#166534',
  },
  
  // CHAT
  chatSection: {
      flex: 1,
      backgroundColor: '#fff', // Or keep transparent if we want the gradient bg
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 20,
  },

  messagesScrollView: {
      flex: 1,
  },
  messagesContainer: {
      paddingBottom: 20,
      paddingTop: 10,
  },
  systemMsgContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: 'rgba(0,0,0,0.03)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      marginBottom: 16,
      marginTop: 8,
  },
  systemIcon: {
      marginRight: 6,
  },
  systemMsgText: {
      fontSize: 12,
      color: '#64748b',
      fontWeight: '600',
  },
  receivedMsgBubble: {
      backgroundColor: '#f3e8ff', // Light purple
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 20,
      borderTopLeftRadius: 4,
      alignSelf: 'flex-start',
      marginBottom: 12,
      maxWidth: '80%',
  },
  msgText: {
      fontSize: 16,
      color: '#334155',
      lineHeight: 22,
  },
  sentMsgBubble: {
      backgroundColor: '#3b82f6', // Blue for sent
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 20,
      borderBottomRightRadius: 4,
      alignSelf: 'flex-end',
      marginBottom: 12,
      maxWidth: '80%',
      shadowColor: '#3b82f6',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 2,
  },
  sentMsgText: {
      fontSize: 16,
      color: '#fff',
      lineHeight: 22,
  },

  inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#000000',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 24,
      marginBottom: 16, // space for controls
      borderWidth: 1,
      borderColor: '#e2e8f0',
  },
  chatInput: {
      flex: 1,
      fontSize: 16,
      color: '#334155',
      padding: 0, 
      height: 24, // min-height
  },
  sendBtn: {
      marginLeft: 12,
  },

  // CONTROLS
  controlsRow: {
      flexDirection: 'row',
      gap: 12,
      height: 56,
  },
  controlBtn: {
      flex: 1,
  },
  btnBase: {
      flex: 1, 
      borderRadius: 28,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
  },
  controlText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
  },
});

export default GlobalChatScreen;
