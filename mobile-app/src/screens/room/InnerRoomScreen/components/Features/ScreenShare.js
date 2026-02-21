import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { styles, COLORS } from '../../styles/InnerRoomScreen.styles';

const ScreenShare = ({ screenShareStream, onStop }) => {
  return (
    <View style={styles.browserContainer}>
      <View style={styles.browserHeader}>
        <Text style={styles.browserUrl}>
          {screenShareStream.userName || 'User'}'s Screen Share
        </Text>
        <TouchableOpacity 
            onPress={onStop} 
            style={styles.browserCloseBtn}
            accessible={true}
            accessibilityLabel="Stop sharing"
            accessibilityRole="button"
        >
          <Ionicons name="close-circle" size={24} color={COLORS.error.main} />
        </TouchableOpacity>
      </View>
      <View style={styles.screenSharePlaceholder}>
        <Ionicons name="desktop-outline" size={64} color={COLORS.gray[500]} />
        <Text style={styles.screenShareText}>Screen Share Active</Text>
      </View>
    </View>
  );
};

export default memo(ScreenShare);
