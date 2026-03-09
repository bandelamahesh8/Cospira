import React, { memo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, StyleSheet, Animated, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { launchImageLibrary } from 'react-native-image-picker';
import { pick, types, isCancel } from '@react-native-documents/picker';

const UploadModal = ({
  visible,
  isDark,
  sfuIsScreenSharing,
  onClose,
  onFeatureSelect,
  onUploadMedia,
}) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleUpload = () => {
    const options = {
        mediaType: 'mixed',
        quality: 1,
    };
    
    launchImageLibrary(options, async (response) => {
         if (response.didCancel) {
             console.log('User cancelled image picker');
         } else if (response.errorCode) {
             console.log('ImagePicker Error: ', response.errorMessage);
         } else if (response.assets && response.assets.length > 0) {
             const asset = response.assets[0];
             await onUploadMedia(asset.uri, asset.type); 
             onClose();
         }
    });
  };

  const handleDocumentPick = async () => {
    try {
      const result = await pick({
        type: [types.pdf, types.doc, types.docx, types.images, types.video],
      });
      
      const file = result[0];
      console.log('[Projector] Document picked:', file.name, file.type);
      await onUploadMedia(file.uri, file.type);
      onClose();
    } catch (err) {
      if (isCancel(err)) {
        console.log('User cancelled document picker');
      } else {
        console.error('DocumentPicker Error: ', err);
      }
    }
  };

  const blurType = isDark ? 'dark' : 'light';
  const overlayBg = isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.4)';
  const textColor = isDark ? '#ffffff' : '#1e293b';
  const subTextColor = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  const itemBgColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)';
  const itemBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.modalOverlay, { backgroundColor: overlayBg, opacity: fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View 
              style={[
                 styles.modalContainer, 
                 { transform: [{ translateY: slideAnim }] }
              ]}
            >
              <BlurView
                 style={styles.blurBackground}
                 blurType={blurType}
                 blurAmount={20}
                 reducedTransparencyFallbackColor={isDark ? '#0f172a' : '#ffffff'}
              />
              <LinearGradient
                  colors={isDark 
                    ? ['rgba(15, 23, 42, 0.8)', 'rgba(15, 23, 42, 0.95)'] 
                    : ['rgba(255, 255, 255, 0.9)', 'rgba(240, 244, 248, 0.98)']}
                  style={styles.blurBackground}
              />
              
              <View style={styles.contentWrapper}>
                <View style={styles.dragPillWrapper}>
                    <View style={[styles.dragPill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)' }]} />
                </View>
                
                <View style={styles.header}>
                  <View>
                     <Text style={[styles.title, { color: textColor }]}>Share Content</Text>
                     <Text style={[styles.subtitle, { color: subTextColor }]}>Present media or sync tools with the room</Text>
                  </View>
                  <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: itemBgColor }]}>
                    <Ionicons name="close" size={24} color={subTextColor} />
                  </TouchableOpacity>
                </View>

                <View style={styles.grid}>
                  <OptionItem 
                    icon={sfuIsScreenSharing ? "close-circle-outline" : "desktop-outline"}
                    label={sfuIsScreenSharing ? "Stop Sharing" : "Screen Share"}
                    color={sfuIsScreenSharing ? "#ef4444" : "#3b82f6"}
                    bg={sfuIsScreenSharing ? "rgba(239, 68, 68, 0.15)" : "rgba(59, 130, 246, 0.15)"}
                    itemBg={itemBgColor}
                    borderColor={itemBorder}
                    textColor={textColor}
                    onPress={() => onFeatureSelect('screenshare')}
                  />
                  <OptionItem 
                    icon="images-outline"
                    label="Photos & Videos"
                    color="#10b981"
                    bg="rgba(16, 185, 129, 0.15)"
                    itemBg={itemBgColor}
                    borderColor={itemBorder}
                    textColor={textColor}
                    onPress={handleUpload}
                  />
                  <OptionItem 
                    icon="document-text-outline"
                    label="Files & PDFs"
                    color="#f59e0b"
                    bg="rgba(245, 158, 11, 0.15)"
                    itemBg={itemBgColor}
                    borderColor={itemBorder}
                    textColor={textColor}
                    onPress={handleDocumentPick}
                  />
                  <OptionItem 
                    icon="logo-youtube"
                    label="Sync YouTube"
                    color="#ef4444"
                    bg="rgba(239, 68, 68, 0.15)"
                    itemBg={itemBgColor}
                    borderColor={itemBorder}
                    textColor={textColor}
                    onPress={() => onFeatureSelect('youtube')}
                  />
                  <OptionItem 
                    icon="globe-outline"
                    label="Virtual Browser"
                    color="#8b5cf6"
                    bg="rgba(139, 92, 246, 0.15)"
                    itemBg={itemBgColor}
                    borderColor={itemBorder}
                    textColor={textColor}
                    onPress={() => onFeatureSelect('browser')}
                  />
                </View>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const OptionItem = ({ icon, label, color, bg, onPress, itemBg, borderColor, textColor }) => (
  <TouchableOpacity style={[styles.optionItem, { backgroundColor: itemBg, borderColor: borderColor }]} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.iconWrapper, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={28} color={color} />
    </View>
    <Text style={[styles.optionLabel, { color: textColor }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  contentWrapper: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  dragPillWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dragPill: {
    width: 48,
    height: 5,
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionItem: {
    width: '48%',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 4,
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default memo(UploadModal);
