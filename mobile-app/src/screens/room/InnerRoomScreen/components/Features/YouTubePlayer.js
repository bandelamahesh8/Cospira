import React, { memo, useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import Ionicons from 'react-native-vector-icons/Ionicons';

const YouTubePlayer = ({ videoId, youtubeState, onControl }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorCode, setErrorCode] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Track mute state for UI
  const webViewRef = useRef(null);

  // Extract video ID from various YouTube URL formats
  const extractVideoId = (input) => {
    if (!input) return null;

    // If already a video ID (11 characters)
    if (input.length === 11 && !input.includes('/') && !input.includes('=')) {
      return input;
    }

    // Match different YouTube URL patterns
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  };

  const actualVideoId = extractVideoId(videoId);

  // Generate HTML for YouTube iframe
  const generateHTML = () => {
    if (!actualVideoId) return '';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            background-color: #000;
            overflow: hidden;
            position: fixed;
            width: 100%;
            height: 100%;
        }
        #player-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #player {
            width: 100%;
            height: 100%;
        }
    </style>
</head>
<body>
    <div id="player-container">
        <div id="player"></div>
    </div>

    <script src="https://www.youtube.com/iframe_api"></script>
    <script>
        let player;
        let playerReady = false;

        function onYouTubeIframeAPIReady() {
            player = new YT.Player('player', {
                height: '100%',
                width: '100%',
                videoId: '${actualVideoId}',
                playerVars: {
                    autoplay: 1,
                    controls: 1,
                    modestbranding: 1,
                    rel: 0,
                    fs: 1,
                    playsinline: 1,
                    enablejsapi: 1
                    // origin removed to fix Android playback
                },
                events: {
                    onReady: onPlayerReady,
                    onStateChange: onPlayerStateChange,
                    onError: onPlayerError
                }
            });
        }

        function onPlayerReady(event) {
            playerReady = true;
            
            // FIX: Mute before playing to bypass autoplay restrictions
            event.target.mute();
            event.target.playVideo();
            
            window.ReactNativeWebView?.postMessage(JSON.stringify({
                type: 'ready',
                videoId: '${actualVideoId}'
            }));
        }

        function onPlayerStateChange(event) {
            const states = {
                '-1': 'unstarted',
                '0': 'ended',
                '1': 'playing',
                '2': 'paused',
                '3': 'buffering',
                '5': 'cued'
            };
            
            const state = states[event.data] || 'unknown';
            
            window.ReactNativeWebView?.postMessage(JSON.stringify({
                type: 'stateChange',
                state: state,
                stateCode: event.data
            }));
        }

        function onPlayerError(event) {
            const errorMessages = {
                2: 'Invalid video ID',
                5: 'HTML5 player error',
                100: 'Video not found or private',
                101: 'Embedding disabled by owner',
                150: 'Embedding disabled by owner'
            };
            
            const errorMsg = errorMessages[event.data] || 'Unknown error';
            
            window.ReactNativeWebView?.postMessage(JSON.stringify({
                type: 'error',
                errorCode: event.data,
                errorMessage: errorMsg
            }));
        }

        document.addEventListener('message', function(event) {
            handleCommand(event.data);
        });
        
        window.addEventListener('message', function(event) {
            handleCommand(event.data);
        });

        function handleCommand(data) {
            if (!playerReady || !player) return;
            
            try {
                const command = JSON.parse(data);
                
                switch(command.action) {
                    case 'play':
                        player.playVideo();
                        break;
                    case 'pause':
                        player.pauseVideo();
                        break;
                    case 'seekTo':
                        player.seekTo(command.time || 0, true);
                        break;
                    case 'setVolume':
                        player.setVolume(command.volume || 100);
                        break;
                    case 'mute':
                        player.mute();
                        break;
                    case 'unmute':
                        player.unMute();
                        break;
                }
            } catch (e) {
                // Ignore parsing errors
            }
        }
    </script>
</body>
</html>
    `;
  };

  // Handle messages from WebView
  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'ready':
          setIsLoading(false);
          setHasError(false);
          setErrorCode(null);
          // Initial mute state logic is handled in webview, we can assume it starts muted
          setIsMuted(true);
          break;
          
        case 'stateChange':
          setIsPlaying(data.state === 'playing');
          onControl?.({ action: 'stateChange', state: data.state });
          break;
          
        case 'error':
          console.error('❌ YouTube error:', data.errorCode, data.errorMessage);
          setHasError(true);
          setErrorCode(data.errorCode);
          setIsLoading(false);
          break;
      }
    } catch (e) {
      console.error('Message parse error:', e);
    }
  };

  // Send command to WebView
  const sendCommand = (action, params = {}) => {
    if (webViewRef.current) {
      const command = JSON.stringify({ action, ...params });
      webViewRef.current.postMessage(command);
    }
  };

  // Control functions
  const handleTogglePlay = () => {
    if (isPlaying) {
      sendCommand('pause');
    } else {
      sendCommand('play');
    }
  };

  const handleUnmute = () => {
    sendCommand('unmute');
    setIsMuted(false);
  };

  const openInApp = () => {
    if (actualVideoId) {
      Linking.openURL(`https://youtu.be/${actualVideoId}`).catch(err => 
        console.error('An error occurred', err)
      );
    }
  };

  if (!actualVideoId) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorTitle}>Invalid YouTube URL</Text>
      </View>
    );
  }

  // Improved Error UI for Embed Restrictions
  if (hasError) {
    const isEmbedError = errorCode === 101 || errorCode === 150;
    
    return (
      <View style={styles.errorContainer}>
        <Ionicons name={isEmbedError ? "lock-closed" : "alert-circle"} size={48} color="#ef4444" />
        <Text style={styles.errorTitle}>
          {isEmbedError ? 'Playback Restricted' : 'Failed to Load'}
        </Text>
        <Text style={styles.errorText}>
          {isEmbedError 
            ? 'This video cannot be played in the app.' 
            : 'The video is unavailable or private.'}
        </Text>
        
        {isEmbedError ? (
          <TouchableOpacity style={styles.primaryButton} onPress={openInApp}>
            <Ionicons name="logo-youtube" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Open in YouTube</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              setHasError(false);
              setErrorCode(null);
              setIsLoading(true);
            }}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: generateHTML() }}
        style={styles.webview}
        onMessage={handleMessage}
        onLoadStart={() => setIsLoading(true)}
        onError={() => {
            setHasError(true);
            setIsLoading(false);
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        allowsFullscreenVideo={true}
        scrollEnabled={false}
        bounces={false}
        scalesPageToFit={true}
        mixedContentMode="always"
        originWhitelist={['*']}
        androidLayerType="hardware"
        // FIX: Android specific props
        allowsProtectedMedia={true}
        javaScriptCanOpenWindowsAutomatically={true}
        setSupportMultipleWindows={false}
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      )}

      {/* Unmute Button overlay if muted and playing */}
      {!isLoading && isMuted && isPlaying && (
        <View style={styles.controlsOverlay}>
           <TouchableOpacity 
             style={styles.unmuteBadge}
             onPress={handleUnmute}
           >
             <Ionicons name="volume-mute" size={20} color="#fff" />
             <Text style={styles.unmuteText}>Tap to Unmute</Text>
           </TouchableOpacity>
        </View>
      )}

      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="logo-youtube" size={20} color="#FF0000" />
          <Text style={styles.headerTitle}>YouTube Sync</Text>
        </View>
        <TouchableOpacity onPress={openInApp}>
             <Ionicons name="open-outline" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  errorText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
  },
  controlsOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  unmuteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  unmuteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  }
});

export default memo(YouTubePlayer);
