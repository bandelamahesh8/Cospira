import React, { useRef, memo, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Animated, StyleSheet, Image, Linking, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { pick, types, isCancel } from '@react-native-documents/picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import { styles, COLORS } from '../../styles/InnerRoomScreen.styles';

const ChatMessage = ({ msg, isMe, isDark, bubbleColor, textColor, subTextColor, currentUser }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(fadeAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const renderAvatar = () => {
    const name = isMe ? (currentUser?.name || currentUser?.username || 'Me') : (msg.userName || msg.senderName || 'M');
    const initial = name.charAt(0).toUpperCase();
    const avatarUrl = isMe ? (currentUser?.avatar || currentUser?.profile_picture || currentUser?.photo) : (msg.avatar || msg.profile_picture || msg.photo);
    
    return (
      <View style={[styles.msgAvatar, { marginBottom: 0, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)', marginLeft: isMe ? 12 : 0, marginRight: isMe ? 0 : 12, marginTop: 16 }]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={{ width: 32, height: 32, borderRadius: 16 }} />
        ) : (
          <Text style={[styles.avatarText, { color: textColor }]}>{initial}</Text>
        )}
      </View>
    );
  };

  const handleDownload = async () => {
    try {
      if (!msg.fileData || !msg.fileData.data) return;
      const { name, data } = msg.fileData;
      const base64Str = data.includes('base64,') ? data.split('base64,')[1] : null;
      if (!base64Str) {
          Alert.alert('Error', 'Invalid file data');
          return;
      }

      const dir = Platform.OS === 'ios' ? RNFS.DocumentDirectoryPath : RNFS.DownloadDirectoryPath;
      const filePath = `${dir}/${name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      await RNFS.writeFile(filePath, base64Str, 'base64');
      Alert.alert('Download Complete', `File saved successfully to downloads.\n\nPath: ${filePath}`);
    } catch (err) {
      console.error('Download error:', err);
      Alert.alert('Download Failed', 'Could not save the file.');
    }
  };

  const renderContent = () => {
    if (msg.isFile && msg.fileData) {
      const { name, type, data } = msg.fileData;
      const isImage = type && type.startsWith('image/');
      
      const fileContent = (
        <TouchableOpacity style={{ padding: 4 }} onPress={handleDownload} activeOpacity={0.8}>
          {isImage ? (
            <View>
              <Image 
                source={{ uri: data }} 
                style={{ width: 200, height: 150, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' }} 
                resizeMode="cover"
              />
              <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 15, padding: 6 }}>
                <Ionicons name="download-outline" size={16} color="#fff" />
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 12 }}>
              <Ionicons name="document-text" size={32} color={textColor} />
              <View style={{ marginLeft: 8, flexShrink: 1, marginRight: 8 }}>
                <Text style={{ color: textColor }} numberOfLines={2}>{name}</Text>
              </View>
              <Ionicons name="download-outline" size={20} color={textColor} />
            </View>
          )}
        </TouchableOpacity>
      );

      if (isMe) {
          return (
            <LinearGradient
              colors={['#007AFF', '#0056D6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.chatMsg, styles.myMsg, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.25)', elevation: 2 }]}
            >
              {fileContent}
            </LinearGradient>
          );
      }
      return (
        <View style={[styles.chatMsg, styles.theirMsg, { backgroundColor: bubbleColor }]}>
           {fileContent}
        </View>
      );
    }

    const text = msg.text || msg.content;
    if (isMe) {
      return (
        <LinearGradient
          colors={['#007AFF', '#0056D6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.chatMsg, styles.myMsg, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.25)', elevation: 2 }]}
        >
          <Text style={[styles.msgText, styles.myMsgText]}>{text}</Text>
        </LinearGradient>
      );
    }
    return (
      <View style={[styles.chatMsg, styles.theirMsg, { backgroundColor: bubbleColor }]}>
        <Text style={[styles.msgText, { color: textColor }]}>{text}</Text>
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.chatMsgContainer,
        isMe ? styles.myMsgContainer : styles.theirMsgContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
        {!isMe && renderAvatar()}
        <View style={{ alignItems: isMe ? 'flex-end' : 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
             <Text style={[styles.msgTime, { color: subTextColor, marginTop: 0, marginHorizontal: 0, marginRight: 8 }]}>
               {msg.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </Text>
             <Text style={[styles.senderName, { marginBottom: 0, marginLeft: 0 }]}>
               {isMe ? (currentUser?.name || currentUser?.username || 'You') : (msg.userName || msg.senderName || 'Member')}
             </Text>
          </View>
          {renderContent()}
        </View>
        {isMe && renderAvatar()}
      </View>
    </Animated.View>
  );
};

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '👏', '🎉', '😢', '💯', '🙌', '😍', '👀', '🤔'];

const ChatOverlay = ({ messages, onClose, onSendMessage, onUploadMedia, isDark, currentUser, roomName, activeUsersCount }) => {
  const [chatInput, setChatInput] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const scrollViewRef = useRef(null);

  const handleCamera = () => {
    launchCamera({ mediaType: 'mixed', quality: 1 }, async (res) => {
      if (res.assets && res.assets.length > 0) {
        if (onUploadMedia) await onUploadMedia(res.assets[0].uri, res.assets[0].type);
        setShowAttachMenu(false);
      }
    });
  };

  const handleLibrary = () => {
    launchImageLibrary({ mediaType: 'mixed', quality: 1 }, async (res) => {
      if (res.assets && res.assets.length > 0) {
        if (onUploadMedia) await onUploadMedia(res.assets[0].uri, res.assets[0].type);
        setShowAttachMenu(false);
      }
    });
  };

  const handleDocumentPick = async () => {
    try {
      const result = await pick({ type: [types.pdf, types.doc, types.docx, types.images, types.video] });
      if (onUploadMedia) await onUploadMedia(result[0].uri, result[0].type);
      setShowAttachMenu(false);
    } catch (err) {
      if (!isCancel(err)) console.error('DocumentPicker Error: ', err);
    }
  };

  const handleSend = () => {
    if (chatInput.trim()) {
      onSendMessage(chatInput.trim());
      setChatInput('');
    }
  };

  const blurType = isDark ? 'dark' : 'light';
  const bgColor = isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.7)';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  const textColor = isDark ? '#fff' : COLORS.gray[800];
  const subTextColor = isDark ? 'rgba(255, 255, 255, 0.5)' : COLORS.gray[500];
  const bubbleColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  const popupBgColor = isDark ? 'rgba(25, 25, 25, 0.96)' : 'rgba(255, 255, 255, 0.96)';
  const popupTextColor = isDark ? '#ffffff' : COLORS.gray[800];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      style={styles.chatOverlay}
    >
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType={blurType}
        blurAmount={isDark ? 30 : 20}
        reducedTransparencyFallbackColor="white"
      />
      <LinearGradient
        colors={isDark 
          ? ['rgba(15, 23, 42, 0.9)', 'rgba(2, 6, 23, 0.95)'] 
          : ['rgba(255, 255, 255, 0.85)', 'rgba(240, 244, 248, 0.95)']}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={[styles.chatHeader, { borderBottomColor: borderColor, paddingBottom: 12 }]}>
        <View>
          <Text style={[styles.chatTitle, { color: textColor }]}>{roomName || 'Room Discussion'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success.main, marginRight: 6 }} />
            <Text style={[styles.chatSubTitle, { color: subTextColor, marginTop: 0 }]}>
              {activeUsersCount || 1} active
            </Text>
          </View>
        </View>
        <TouchableOpacity 
           onPress={onClose} 

           style={styles.closeBtnCircle}
           accessible={true} 
           accessibilityLabel="Close chat"
        >
          <Ionicons name="close" size={24} color={textColor} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.chatList}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: 5, flexGrow: 1 }}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyChatState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={subTextColor} />
            </View>
            <Text style={[styles.emptyChatText, { color: textColor }]}>No messages yet</Text>
            <Text style={[styles.emptyChatSubText, { color: subTextColor }]}>
              Start the conversation in this room
            </Text>
          </View>
        ) : (
          messages.map((msg, i) => (
            <ChatMessage 
              key={msg.id || i} 
              msg={msg} 
              isMe={currentUser ? msg.userId === currentUser.id : false} 
              isDark={isDark}
              bubbleColor={bubbleColor}
              textColor={textColor}
              subTextColor={subTextColor}
              currentUser={currentUser}
            />
          ))
        )}
      </ScrollView>

      {showEmojis && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8, backgroundColor: 'transparent' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 4 }}>
            {QUICK_EMOJIS.map(emoji => (
              <TouchableOpacity 
                key={emoji} 
                onPress={() => setChatInput(prev => prev + emoji)}
                style={{ padding: 4 }}
              >
                <Text style={{ fontSize: 24 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {showAttachMenu && (
        <View style={[styles.chatAttachPopup, { backgroundColor: popupBgColor }]}>
          <TouchableOpacity style={styles.chatAttachOption} onPress={handleCamera}>
            <View style={styles.chatAttachIconContainer}>
              <Ionicons name="camera-outline" size={24} color={popupTextColor} />
            </View>
            <Text style={[styles.chatAttachOptionText, { color: popupTextColor }]}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.chatAttachOption} onPress={handleLibrary}>
            <View style={styles.chatAttachIconContainer}>
              <Ionicons name="image-outline" size={24} color={popupTextColor} />
            </View>
            <Text style={[styles.chatAttachOptionText, { color: popupTextColor }]}>Photos & Videos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.chatAttachOption} onPress={handleDocumentPick}>
            <View style={styles.chatAttachIconContainer}>
              <Ionicons name="document-text-outline" size={24} color={popupTextColor} />
            </View>
            <Text style={[styles.chatAttachOptionText, { color: popupTextColor }]}>Files & PDFs</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.chatInputContainer, { 
        backgroundColor: 'transparent',
        borderTopColor: borderColor 
      }]}>
        <TouchableOpacity 
          style={styles.attachmentBtn}
          onPress={() => setShowAttachMenu(!showAttachMenu)}
        >
          <Ionicons name={showAttachMenu ? "close" : "add"} size={24} color={textColor} />
        </TouchableOpacity>
        
        <View style={[styles.chatInputWrapper, { 
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.03)',
          borderColor: borderColor
        }]}>
          <TextInput
            style={[styles.chatInput, { color: textColor }]}
            value={chatInput}
            onChangeText={setChatInput}
            placeholder="Enter secure message..."
            placeholderTextColor={subTextColor}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            multiline={false}
          />
          <TouchableOpacity 
            style={styles.emojiBtn}
            onPress={() => setShowEmojis(!showEmojis)}
          >
            <Ionicons name={showEmojis ? "close-circle" : "happy-outline"} size={22} color={subTextColor} />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
            style={[styles.sendBtn, !chatInput.trim() && { opacity: 0.5 }]} 
            onPress={handleSend}
            disabled={!chatInput.trim()}
            accessible={true}
            accessibilityLabel="Send message"
            accessibilityRole="button"
        >
          <Ionicons name="paper-plane" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default memo(ChatOverlay);
