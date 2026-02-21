import { Alert, Platform, ToastAndroid } from 'react-native';

export const showToast = (type, message, duration = 3000) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    // For iOS, use Alert as fallback
    const titles = {
      success: '✓ Success',
      error: '✗ Error',
      warning: '⚠ Warning',
      info: 'ℹ Info',
    };

    Alert.alert(titles[type], message, [{ text: 'OK' }]);
  }
};

export const showSuccessToast = (message) => {
  showToast('success', message);
};

export const showErrorToast = (message) => {
  showToast('error', message);
};

export const showWarningToast = (message) => {
  showToast('warning', message);
};

export const showInfoToast = (message) => {
  showToast('info', message);
};
