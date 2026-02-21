const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    unstable_enablePackageExports: true,
    unstable_conditionNames: ['react-native', 'browser', 'require', 'import', 'default'],
    extraNodeModules: {
      'react-native': path.resolve(__dirname, 'node_modules/react-native'),
      'react-native-webrtc': path.resolve(__dirname, 'node_modules/react-native-webrtc'),
      'mediasoup-client': path.resolve(__dirname, 'node_modules/mediasoup-client'),
    },
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
