import React, { useEffect, useRef, memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * AudioPlayer component that uses a hidden WebView to play streaming audio chunks.
 * This approach is used to:
 * 1. Support Opus/WebM chunks without needing extra native modules.
 * 2. Leverage Web Audio API for low-latency scheduling.
 * 3. Avoid complex native decoding bridges for raw base64 data.
 */
const AudioPlayer = ({ audioChunks, enabled = true }) => {
  const webViewRef = useRef(null);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Send chunks to WebView when they arrive (payload: { data, timestamp } or { type: 'audio', data, ... })
  useEffect(() => {
    if (!enabled || !webViewRef.current || !isLoaded) return;
    const raw = audioChunks;
    if (!raw || typeof raw !== 'object') return;
    const base64 = raw.data || raw.payload;
    if (!base64 || typeof base64 !== 'string' || base64.length < 100) return;
    const command = JSON.stringify({
      type: 'audio-chunk',
      data: base64,
      timestamp: raw.timestamp || Date.now()
    });
    webViewRef.current.postMessage(command);
  }, [audioChunks, enabled, isLoaded]);

  const generatePlayerHTML = () => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>body { background-color: transparent; margin: 0; padding: 0; }</style>
    </head>
    <body>
      <h1 id="status" style="color: white; font-size: 8px;">Audio Worker</h1>
      <audio id="player" autoplay playsinline></audio>
      <script>
        const player = document.getElementById('player');
        const status = document.getElementById('status');
        let mediaSource;
        let sourceBuffer;
        let queue = [];
        let isAppending = false;

        function initMediaSource() {
          if (mediaSource) return;
          
          mediaSource = new MediaSource();
          player.src = URL.createObjectURL(mediaSource);
          
          mediaSource.addEventListener('sourceopen', () => {
            console.log('MediaSource open');
            try {
              // We expect opus/webm chunks from the browser capture
              sourceBuffer = mediaSource.addSourceBuffer('audio/webm; codecs="opus"');
              sourceBuffer.mode = 'sequence';
              
              sourceBuffer.addEventListener('updateend', () => {
                isAppending = false;
                processQueue();
              });

              sourceBuffer.addEventListener('error', (e) => {
                console.error('SourceBuffer error:', e);
                status.innerText = 'Buf Err';
              });
            } catch (e) {
              console.error('AddSourceBuffer failed:', e);
              status.innerText = 'Init failed';
            }
          });
        }

        function processQueue() {
          if (queue.length > 0 && !isAppending && sourceBuffer && !sourceBuffer.updating) {
            isAppending = true;
            const chunk = queue.shift();
            try {
              sourceBuffer.appendBuffer(chunk);
              status.innerText = 'Playing...';
            } catch (e) {
              console.error('AppendBuffer failed:', e);
              isAppending = false;
              // If it's a "full" or "invalid state" error, we might need to reset
              if (e.name === 'QuotaExceededError') {
                 // Simple eviction: clear some buffer
                 if (sourceBuffer.buffered.length > 0) {
                   sourceBuffer.remove(0, sourceBuffer.buffered.end(0) - 5);
                 }
              }
            }
          }
        }

        async function handleChunk(base64Data) {
          initMediaSource();
          
          // Convert base64 to ArrayBuffer
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          queue.push(bytes.buffer);
          processQueue();

          // Ensure player is playing
          if (player.paused) {
            player.play().catch(e => console.log('Auto-play blocked, waiting for interaction'));
          }
        }

        window.addEventListener('message', (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'audio-chunk') {
              handleChunk(msg.data);
            }
          } catch (e) {
            console.error('Message error:', e);
          }
        });

        // Intercept logs for debugging
        const log = console.log;
        console.log = function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', data: Array.from(arguments) }));
          log.apply(console, arguments);
        };

        // User interaction to unlock audio
        document.addEventListener('touchstart', () => {
          player.play();
          status.innerText = 'unlocked';
        }, { once: true });

        // Notify ready
        window.onload = () => {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
        };
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') {
        setIsLoaded(true);
        console.log('AudioPlayer (MediaSource) Ready');
      } else if (msg.type === 'log') {
        console.log('AudioPlayer WebView:', ...msg.data);
      }
    } catch (e) {}
  };

  if (!enabled) return null;

  return (
    <View style={styles.hidden}>
      <WebView
        ref={webViewRef}
        source={{ html: generatePlayerHTML() }}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        originWhitelist={['*']}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    left: -1,
    top: -1,
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  }
});

export default memo(AudioPlayer);
