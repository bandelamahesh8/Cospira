import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { theme } from '../../core/theme';
import GlassCard from '../cards/GlassCard';

// Ideally use icons here (e.g. Ionicons)
// For now using text placeholders for Mic, Cam, End

const ControlButton = ({ label, onPress, variant = 'default', active }) => {
  let bgColor = '#1e293b'; // Default dark grey
  let textColor = '#ffffff';

  if (variant === 'danger') {
    bgColor = '#ff0044';
  } else if (active || variant === 'primary') {
    bgColor = '#00ffff';
    textColor = '#000000';
  }

  return (
    <TouchableOpacity 
      style={[styles.button, { backgroundColor: bgColor }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
       <Text style={[styles.btnText, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const RoomControls = ({ onMute, onCamera, onLeave, isMuted, isCameraOff }) => {
  return (
    <View style={styles.container}>
      <ControlButton 
        label="MUTE" 
        onPress={onMute} 
        variant="primary"
      />
      <ControlButton 
        label="VIDEO OFF" 
        onPress={onCamera} 
        variant="primary"
      />
      <ControlButton 
        label="AI TOOLS" 
        onPress={() => console.log('AI Tools')} 
      />
      <ControlButton 
        label="LEAVE" 
        variant="danger" 
        onPress={onLeave} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 40,
    backgroundColor: 'transparent',
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  btnText: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  }
});

export default RoomControls;
