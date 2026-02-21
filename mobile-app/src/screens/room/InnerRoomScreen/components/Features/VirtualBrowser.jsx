import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Keyboard,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { styles } from '../../styles/InnerRoomScreen.styles';

const DEFAULT_URL = 'https://www.google.com';

// Find ALL video/audio in doc, including inside Shadow DOM and same-origin iframes (YouTube uses shadow roots)
function buildGetAllMediaScript() {
  return `
  function getAllMedia(doc, out) {
    if (!doc || out === undefined) out = [];
    try {
      if (doc.querySelectorAll) {
        doc.querySelectorAll('video, audio').forEach(function(el) { out.push(el); });
        doc.querySelectorAll('*').forEach(function(el) {
          if (el.shadowRoot) getAllMedia(el.shadowRoot, out);
        });
      }
      doc.querySelectorAll && doc.querySelectorAll('iframe').forEach(function(f) {
        try {
          var d = f.contentDocument || (f.contentWindow && f.contentWindow.document);
          if (d) getAllMedia(d, out);
        } catch(e) {}
      });
    } catch(e) {}
    return out;
  }
  function unmuteAllMedia(doc) {
    var list = getAllMedia(doc || document);
    list.forEach(function(el) {
      try {
        el.muted = false;
        el.volume = 1;
        el.play().catch(function() {});
      } catch(e) {}
    });
  }
  `;
}

const UNMUTE_SCRIPT = `
(function() {
  ${buildGetAllMediaScript()}
  unmuteAllMedia(document);
  var list = getAllMedia(document);
  if (list.length) {
    list[0].muted = false;
    list[0].volume = 1;
    list[0].play().catch(function() {});
    list[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  }
})();
true;
`;

const MUTE_SCRIPT = `
(function() {
  ${buildGetAllMediaScript()}
  getAllMedia(document).forEach(function(el) { try { el.muted = true; } catch(e) {} });
})();
true;
`;

// MutationObserver: also watch for new nodes and walk shadow roots
const OBSERVER_SCRIPT = `
(function() {
  ${buildGetAllMediaScript()}
  function unmuteEl(el) {
    try { el.muted = false; el.volume = 1; el.play().catch(function(){}); } catch(e) {}
  }
  function observeDoc(doc) {
    if (!doc || doc.__unmuteObserved) return;
    doc.__unmuteObserved = true;
    var obs = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        m.addedNodes.forEach(function(n) {
          if (n.nodeType !== 1) return;
          if (n.tagName === 'VIDEO' || n.tagName === 'AUDIO') unmuteEl(n);
          if (n.querySelectorAll) n.querySelectorAll('video, audio').forEach(unmuteEl);
          if (n.shadowRoot) { n.shadowRoot.querySelectorAll('video, audio').forEach(unmuteEl); }
        });
      });
    });
    obs.observe(doc.body || doc.documentElement, { childList: true, subtree: true });
    getAllMedia(doc).forEach(unmuteEl);
  }
  observeDoc(document);
  setTimeout(function() { observeDoc(document); getAllMedia(document).forEach(unmuteEl); }, 1500);
  setTimeout(function() { getAllMedia(document).forEach(unmuteEl); }, 3000);
})();
true;
`;

// One-time tap: unmute + play in user gesture context; run again on next tick so Android picks it up
const FIRST_TAP_UNMUTE_SCRIPT = `
(function() {
  if (window.__cospiraUnmuteOnTapDone) return;
  ${buildGetAllMediaScript()}
  function doUnmute() {
    window.__cospiraUnmuteOnTapDone = true;
    unmuteAllMedia(document);
    var list = getAllMedia(document);
    list.forEach(function(el) {
      try { el.muted = false; el.volume = 1; el.play().catch(function() {}); } catch(e) {}
    });
    setTimeout(function() { unmuteAllMedia(document); }, 0);
    setTimeout(function() { unmuteAllMedia(document); }, 100);
    setTimeout(function() { unmuteAllMedia(document); }, 300);
  }
  function once() {
    doUnmute();
    document.removeEventListener('touchstart', once, true);
    document.removeEventListener('touchend', once, true);
    document.removeEventListener('click', once, true);
  }
  document.addEventListener('touchstart', once, true);
  document.addEventListener('touchend', once, true);
  document.addEventListener('click', once, true);
})();
true;
`;

const VirtualBrowser = ({
  browserUrl,
  onClose,
  onNavigate,
  urlInputVisible = false,
  setUrlInputVisible = () => {},
  canControl = true,
}) => {
  const webViewRef = useRef(null);
  const [urlInputValue, setUrlInputValue] = useState(browserUrl || DEFAULT_URL);
  const [currentUrl, setCurrentUrl] = useState(browserUrl || DEFAULT_URL);
  const [loading, setLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [muted, setMuted] = useState(false);
  const [soundOverlayVisible, setSoundOverlayVisible] = useState(true);

  useEffect(() => {
    const url = browserUrl && browserUrl.trim() ? browserUrl.trim() : DEFAULT_URL;
    setCurrentUrl(url);
    if (!urlInputVisible) setUrlInputValue(url);
  }, [browserUrl, urlInputVisible]);

  const loadUrl = useCallback(
    (url) => {
      let u = url.trim();
      if (!u) return;
      if (!u.startsWith('http://') && !u.startsWith('https://')) {
        if (u.includes('.') && !u.includes(' ')) u = 'https://' + u;
        else u = 'https://www.google.com/search?q=' + encodeURIComponent(u);
      }
      setCurrentUrl(u);
      setUrlInputValue(u);
      setLoading(true);
      if (canControl && typeof onNavigate === 'function') onNavigate('goto', u);
    },
    [canControl, onNavigate]
  );

  const handleBack = useCallback(() => {
    if (webViewRef.current && canGoBack) webViewRef.current.goBack();
    else if (canControl) onNavigate?.('back');
  }, [canGoBack, canControl, onNavigate]);

  const handleForward = useCallback(() => {
    if (webViewRef.current && canGoForward) webViewRef.current.goForward();
    else if (canControl) onNavigate?.('forward');
  }, [canGoForward, canControl, onNavigate]);

  const handleRefresh = useCallback(() => {
    if (webViewRef.current) webViewRef.current.reload();
    else if (canControl) onNavigate?.('reload');
  }, [canControl, onNavigate]);

  const handleUrlSubmit = useCallback(() => {
    loadUrl(urlInputValue);
    setUrlInputVisible(false);
    Keyboard.dismiss();
  }, [urlInputValue, loadUrl, setUrlInputVisible]);

  const handleNavigationStateChange = useCallback((navState) => {
    const url = navState?.url || '';
    if (url) {
      setCurrentUrl(url);
      setUrlInputValue(url);
    }
    setCanGoBack(!!navState?.canGoBack);
    setCanGoForward(!!navState?.canGoForward);
    setLoading(!!navState?.loading);
  }, []);

  const toggleMute = useCallback(() => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (nextMuted) setSoundOverlayVisible(false);
    else setSoundOverlayVisible(true);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(nextMuted ? MUTE_SCRIPT : UNMUTE_SCRIPT);
    }
  }, [muted]);

  const handleTapToEnableSound = useCallback(() => {
    if (muted) return;
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(UNMUTE_SCRIPT);
      setTimeout(() => webViewRef.current?.injectJavaScript(UNMUTE_SCRIPT), 300);
    }
    setSoundOverlayVisible(false);
  }, [muted]);

  const applyMuteState = useCallback(() => {
    if (!muted) return;
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(MUTE_SCRIPT);
      setTimeout(() => webViewRef.current?.injectJavaScript(MUTE_SCRIPT), 800);
    }
  }, [muted]);

  return (
    <View style={styles.browserWrapper}>
      <View style={styles.browserHeader}>
        {!urlInputVisible && (
          <View style={styles.browserNavControls}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={handleBack}
              disabled={!canGoBack && !canControl}
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={canGoBack || canControl ? '#fff' : '#555'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navButton}
              onPress={handleForward}
              disabled={!canGoForward && !canControl}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={canGoForward || canControl ? '#fff' : '#555'}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton} onPress={handleRefresh}>
              <Ionicons name="refresh" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {urlInputVisible ? (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={styles.urlInput}
              value={urlInputValue}
              onChangeText={setUrlInputValue}
              placeholder="Search or enter URL"
              placeholderTextColor="rgba(255,255,255,0.5)"
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={handleUrlSubmit}
            />
            <TouchableOpacity style={styles.urlSubmitButton} onPress={handleUrlSubmit}>
              <Ionicons name="arrow-forward-circle" size={28} color="#10b981" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.urlCancelButton} onPress={() => setUrlInputVisible(false)}>
              <Ionicons name="close-circle" size={28} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.browserUrlContainer}
            onPress={() => canControl && setUrlInputVisible(true)}
            disabled={!canControl}
          >
            <Ionicons name="lock-closed" size={12} color="#10b981" style={{ marginRight: 6 }} />
            <Text style={styles.browserUrl} numberOfLines={1}>
              {currentUrl || 'Search or enter address'}
            </Text>
            {canControl && <Ionicons name="search" size={14} color="rgba(255,255,255,0.5)" />}
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={toggleMute} style={styles.navButton}>
          <Ionicons
            name={muted ? 'volume-mute' : 'volume-high'}
            size={20}
            color={muted ? '#ef4444' : '#fff'}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={styles.browserCloseBtn}>
          <Ionicons name="close" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.browserContent}>
        <WebView
          ref={webViewRef}
          source={{ uri: currentUrl || DEFAULT_URL }}
          style={{ flex: 1, backgroundColor: '#fff' }}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => {
            setLoading(false);
            applyMuteState();
            if (!muted && webViewRef.current) {
              webViewRef.current.injectJavaScript(FIRST_TAP_UNMUTE_SCRIPT);
              webViewRef.current.injectJavaScript(OBSERVER_SCRIPT);
              setTimeout(() => webViewRef.current?.injectJavaScript(UNMUTE_SCRIPT), 600);
              setTimeout(() => webViewRef.current?.injectJavaScript(UNMUTE_SCRIPT), 1500);
            }
          }}
          javaScriptEnabled
          domStorageEnabled
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          mixedContentMode="compatibility"
          originWhitelist={['*']}
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          incognito={false}
          cacheEnabled
          cacheMode="LOAD_DEFAULT"
          scrollEnabled
          bounces={false}
          {...(Platform.OS === 'android' && { androidLayerType: 'hardware' })}
        />
        {loading && (
          <View style={[styles.browserLoadingOverlay, { pointerEvents: 'none' }]}>
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        )}
        {!muted && soundOverlayVisible && (
          <TouchableOpacity
            style={[styles.audioNotice, { bottom: 16 }]}
            onPress={handleTapToEnableSound}
            activeOpacity={0.9}
          >
            <Ionicons name="volume-high" size={18} color="#fff" />
            <Text style={styles.audioNoticeText}>Tap the video to enable sound</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default memo(VirtualBrowser);
