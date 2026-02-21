import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { WebView } from 'react-native-webview';
import Video from 'react-native-video';
import { styles as globalStyles, COLORS } from '../../styles/InnerRoomScreen.styles';

const MediaViewer = ({ media, onClose }) => {
  const isImage = media.mediaType === 'image' || media.fileType?.startsWith('image/');
  const isVideo = media.mediaType === 'video' || media.fileType?.startsWith('video/');
  const isPdf = media.fileType === 'application/pdf';

  return (
    <View style={localStyles.projectorContainer}>
      <View style={globalStyles.browserHeader}>
        <View style={localStyles.headerInfo}>
          <Ionicons 
            name={isImage ? 'image-outline' : isVideo ? 'videocam-outline' : 'document-text-outline'} 
            size={20} 
            color={COLORS.info.main} 
          />
          <Text style={globalStyles.browserUrl} numberOfLines={1}>
            {media.fileName || (isImage ? 'Shared Image' : isVideo ? 'Shared Video' : 'Shared Document')}
          </Text>
        </View>
        
        {media.senderName && (
          <View style={localStyles.senderBadge}>
            <Text style={localStyles.senderText}>From: {media.senderName}</Text>
          </View>
        )}

        <TouchableOpacity 
            onPress={onClose} 
            style={globalStyles.browserCloseBtn}
            accessible={true}
            accessibilityLabel="Close projector"
        >
          <Ionicons name="close-circle" size={28} color={COLORS.error.main} />
        </TouchableOpacity>
      </View>

      <View style={localStyles.contentArea}>
        {isImage && (
          <Image
            source={{ uri: media.mediaUri }}
            style={localStyles.fullMedia}
            resizeMode="contain"
          />
        )}
        
        {isVideo && (
          <Video
            source={{ uri: media.mediaUri }}
            style={localStyles.fullMedia}
            controls={true}
            resizeMode="contain"
            paused={false}
          />
        )}

        {isPdf && (
          <WebView
            source={{ uri: media.mediaUri }}
            style={localStyles.fullMedia}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={localStyles.loading}>
                <ActivityIndicator size="large" color={COLORS.primary.main} />
              </View>
            )}
          />
        )}

        {!isImage && !isVideo && !isPdf && (
          <View style={localStyles.unsupported}>
            <Ionicons name="help-circle-outline" size={64} color={COLORS.gray[400]} />
            <Text style={localStyles.unsupportedText}>Unsupported File Type</Text>
            <Text style={localStyles.fileNameText}>{media.fileName}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  projectorContainer: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  senderBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  senderText: {
    color: '#a5b4fc',
    fontSize: 12,
    fontWeight: '600',
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
  },
  fullMedia: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  unsupported: {
    alignItems: 'center',
    padding: 20,
  },
  unsupportedText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 10,
  },
  fileNameText: {
    color: COLORS.gray[500],
    fontSize: 14,
    marginTop: 5,
  }
});

export default memo(MediaViewer);
