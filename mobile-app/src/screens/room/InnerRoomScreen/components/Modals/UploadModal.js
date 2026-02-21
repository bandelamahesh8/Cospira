import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { pick, types, isCancel } from '@react-native-documents/picker';
import { modalStyles as styles, COLORS } from '../../styles/InnerRoomScreen.styles';

const UploadModal = ({
  visible,
  sfuIsScreenSharing,
  onClose,
  onFeatureSelect,
  onUploadMedia,
}) => {

  const handleUpload = () => {
    // Media picker logic for Photos/Videos
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

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Share Content</Text>
                <TouchableOpacity onPress={onClose} accessible={true} accessibilityLabel="Close upload menu">
                  <Ionicons name="close" size={24} color={COLORS.gray[500]} />
                </TouchableOpacity>
              </View>

              <View style={styles.gridOptions}>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => onFeatureSelect('screenshare')}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      {
                        backgroundColor: sfuIsScreenSharing
                          ? COLORS.error.surface
                          : COLORS.info.surface,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        sfuIsScreenSharing
                          ? 'close-circle-outline'
                          : 'desktop-outline'
                      }
                      size={24}
                      color={
                        sfuIsScreenSharing
                          ? COLORS.error.main
                          : COLORS.info.main
                      }
                    />
                  </View>
                  <Text style={styles.optionLabel}>
                    {sfuIsScreenSharing ? 'Stop Sharing' : 'Screen Share'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={handleUpload}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: COLORS.success.surface },
                    ]}
                  >
                    <Ionicons
                      name="image-outline"
                      size={24}
                      color={COLORS.success.main}
                    />
                  </View>
                  <Text style={styles.optionLabel}>Photos & Videos</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={handleDocumentPick}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: '#dcfce7' }, // Light green
                    ]}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={24}
                      color="#16a34a" // Green
                    />
                  </View>
                  <Text style={styles.optionLabel}>Files & PDFs</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => onFeatureSelect('youtube')}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: COLORS.error.surface },
                    ]}
                  >
                    <Ionicons
                      name="logo-youtube"
                      size={24}
                      color={COLORS.error.main}
                    />
                  </View>
                  <Text style={styles.optionLabel}>Sync YouTube</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => onFeatureSelect('browser')}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: '#f3e8ff' }, // Custom purple surface
                    ]}
                  >
                    <Ionicons
                      name="globe-outline"
                      size={24}
                      color="#9333ea" // Custom purple
                    />
                  </View>
                  <Text style={styles.optionLabel}>Virtual Browser</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default memo(UploadModal);
