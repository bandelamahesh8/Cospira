import { NativeModules } from 'react-native';

// Polyfill WebRTC for Expo Go
let WebRTC = {};
let NativeRTCView = null; // Explicit reference for RTCView from react-native-webrtc
const hasWebRTC = !!NativeModules.WebRTCModule;

if (hasWebRTC) {
  try {
    WebRTC = require('react-native-webrtc');
    WebRTC.registerGlobals();
    // Capture RTCView explicitly from the native module
    NativeRTCView = WebRTC.RTCView || null;
    console.log('[Polyfill] WebRTC native module registered. RTCView available:', !!NativeRTCView);
  } catch (e) {
    console.warn('[Polyfill] Failed to require react-native-webrtc:', e.message);
  }
}

if (!hasWebRTC || !global.RTCPeerConnection) {
  console.warn('[Polyfill] Applying mocks for Expo Go environment.');
  
  // Mock globals
    global.RTCPeerConnection = class {
        createOffer() { return Promise.resolve({}); }
        createAnswer() { return Promise.resolve({}); }
        setLocalDescription() { return Promise.resolve(); }
        setRemoteDescription() { return Promise.resolve(); }
        addTrack() {}
        addTransceiver() { return { receiver: { track: {} }, sender: { replaceTrack: () => Promise.resolve() }, setDirection: () => {} }; }
        createDataChannel() { return {}; }
        close() {}
    };
    global.RTCIceCandidate = class {
        static Type = { Host: 'host', Relay: 'relay', Srflx: 'srflx', Prflx: 'prflx' };
        constructor(init = {}) {
            this.candidate = init.candidate || '';
            this.sdpMLineIndex = init.sdpMLineIndex || 0;
            this.sdpMid = init.sdpMid || '';
        }
    };
    global.RTCSessionDescription = class {
        constructor(init) { 
            this.type = init?.type || '';
            this.sdp = init?.sdp || 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n';
        }
    };
    global.RTCRtpTransceiver = class {};
    global.RTCRtpReceiver = class {
        constructor() { this.track = { stop: () => {} }; }
    };
    global.RTCRtpSender = class {
        constructor() { this.replaceTrack = () => Promise.resolve(); }
    };
    global.RTCRtpCapabilities = class {};
    global.RTCRtpParameters = class {};
    
    global.MediaStream = class {
        constructor() { 
            this.id = 'dummy-' + Math.random().toString(36).substr(2, 9); 
            this.active = true;
        }
        getTracks() { return []; }
        getVideoTracks() { return []; }
        getAudioTracks() { return []; }
        addTrack() {}
        removeTrack() {}
        toURL() { return ''; }
        release() {}
    };
    global.mediaDevices = {
        getUserMedia: () => Promise.reject(new Error('WebRTC not available in Expo Go')),
        getDisplayMedia: () => Promise.reject(new Error('Screen sharing not available in Expo Go')),
        enumerateDevices: () => Promise.resolve([]),
        getSupportedConstraints: () => ({
            width: true, height: true, frameRate: true,
            facingMode: true, aspectRatio: true, deviceId: true,
        }),
        ondevicechange: null
    };
    
    // Mediasoup-client specific mocks
    const iceCandidateType = {
      Host: 'host',
      Relay: 'relay',
      Srflx: 'srflx',
      Prflx: 'prflx',
      host: 'host',
      relay: 'relay',
      srflx: 'srflx',
      prflx: 'prflx'
    };
    global.RTCIceCandidateType = iceCandidateType; 
    global.RTCIceTransportPolicy = { All: 'all', Relay: 'relay' };
    global.RTCRLTPriorityType = { VeryLow: 'very-low', Low: 'low', Medium: 'medium', High: 'high' };
    
    // Also attach to the class if expected there
    global.RTCIceCandidate.Type = iceCandidateType;
    
    // navigator mocks
    if (!global.navigator) global.navigator = {};
    if (!global.navigator.mediaDevices) global.navigator.mediaDevices = global.mediaDevices;
    if (!global.navigator.userAgent) global.navigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/000.1';
    global.navigator.appVersion = global.navigator.userAgent;
    global.navigator.platform = 'iPhone';
    
    // location mocks
    if (!global.location) global.location = {
        href: 'http://localhost/',
        protocol: 'http:',
        host: 'localhost',
        hostname: 'localhost',
        pathname: '/',
        search: '',
        hash: ''
    };
    
    // document mocks
    if (!global.document) global.document = {
        createElement: () => ({}),
        getElementById: () => null,
    };
    
    global.RTCView = ({ children }) => children || null;
}

// Ensure mediaDevices is always on global for easy access in hooks
if (!global.mediaDevices) {
  if (global.navigator && global.navigator.mediaDevices) {
    global.mediaDevices = global.navigator.mediaDevices;
  } else {
    // Final fallback mock if everything else failed
    global.mediaDevices = {
      getUserMedia: () => Promise.reject(new Error('WebRTC getUserMedia not initialized')),
      getDisplayMedia: () => Promise.reject(new Error('WebRTC getDisplayMedia not initialized')),
      enumerateDevices: () => Promise.resolve([]),
    };
  }
}

// Ensure navigator.mediaDevices points to the same thing
if (global.navigator && !global.navigator.mediaDevices) {
  global.navigator.mediaDevices = global.mediaDevices;
}

const MockRTCView = ({ children }) => children || null;
// Priority: Native RTCView (captured at import) > global.RTCView (set by registerGlobals or mock) > Mock
export const RTCView = NativeRTCView || global.RTCView || MockRTCView;
export { hasWebRTC };
export default WebRTC;
