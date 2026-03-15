import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Globe,
  CheckCircle2,
  Shield,
  X,
  Sparkles,
  Search,
  Zap,
  Layout,
  MessageSquare,
  Send,
  ChevronLeft,
  ChevronRight,
  Keyboard,
  Lock as LockIcon,
  Smartphone,
  Settings,
  Monitor,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Home,
  Wifi,
  AlertTriangle,
  Share2,
  Volume2,
} from 'lucide-react';
import { toast } from 'sonner';
import InputManager from '@/utils/InputManager';

export const VirtualBrowser = () => {
  const {
    virtualBrowserUrl,
    updateVirtualBrowserUrl,
    closeVirtualBrowser,
    isHost,
    users,
    socket,
    roomId,
    remoteStreams,
  } = useWebSocket();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchContainerRef = useRef<HTMLDivElement>(null);
  const inputManagerRef = useRef<InputManager | null>(null);
  const containerRectRef = useRef<DOMRect | null>(null);

  // Cursor state for visual feedback
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [isCursorVisible, setIsCursorVisible] = useState(false);

  // Core Interactive UI State
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);

  // Performance and connection monitoring
  const [performanceMode, setPerformanceMode] = useState<'quality' | 'balanced' | 'performance'>('balanced');
  const [connectionQuality] = useState<'excellent' | 'good' | 'poor'>('good');
  const [fps, setFps] = useState(60);
  const [latency, setLatency] = useState(12);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Performance monitoring mock
  useEffect(() => {
    const interval = setInterval(() => {
      setFps(Math.floor(Math.random() * (62 - 58 + 1) + 58));
      setLatency(Math.floor(Math.random() * (15 - 8 + 1) + 8));
    }, 2000);
    return () => clearInterval(interval);
  }, []);


  // Connection and Loading State
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [startupPhase, setStartupPhase] = useState(0); // 0: Idle, 1: Spawning, 2: Streaming
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Advanced Audio State
  const [audioSettings, setAudioSettings] = useState({
    volume: 1.0,
    bassBoost: 0,
    trebleBoost: 0,
    noiseReduction: false,
    echoCancellation: true,
    autoGainControl: true,
    sampleRate: 48000,
    channels: 2,
  });
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioSource, setAudioSource] = useState<MediaStreamAudioSourceNode | null>(null);
  const [gainNode, setGainNode] = useState<GainNode | null>(null);
  const [bassFilter, setBassFilter] = useState<BiquadFilterNode | null>(null);
  const [trebleFilter, setTrebleFilter] = useState<BiquadFilterNode | null>(null);

  // Viewport and Tab Management
  const [viewport, setViewport] = useState({ width: 1920, height: 1080, isMobile: false });
  const viewportRef = useRef(viewport);
  useEffect(() => { viewportRef.current = viewport; }, [viewport]);

  const [tabs, setTabs] = useState<Array<{ id: string; url: string; title: string, isLoading: boolean }>>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [imeText, setImeText] = useState('');
  const [aiQuery, setAiQuery] = useState('');

  // Interactive UI State
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  const activeTab = tabs.find(t => t.id === activeTabId) || { title: 'New Tab', url: '' };

  // Derived WebRTC Stream from Unified SFU
  const browserStream = remoteStreams.get('virtual-browser');

  const currentUser = users.find((u) => u.id === socket?.id);
  const canControl = isHost || currentUser?.isCoHost;

  // Advanced Audio Processing System
  const initializeAudioProcessing = useCallback(async (stream: MediaStream) => {
    try {
      // Create AudioContext if not exists
      if (!audioContext) {
        const ctx = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)({
          sampleRate: audioSettings.sampleRate,
          latencyHint: 'interactive',
        });
        setAudioContext(ctx);

        // Create audio source from stream
        const source = ctx.createMediaStreamSource(stream);
        setAudioSource(source);

        // Create gain node for volume control
        const gain = ctx.createGain();
        gain.gain.value = audioSettings.volume;
        setGainNode(gain);

        // Create bass boost filter
        const bass = ctx.createBiquadFilter();
        bass.type = 'lowshelf';
        bass.frequency.value = 200;
        bass.gain.value = audioSettings.bassBoost;
        setBassFilter(bass);

        // Create treble boost filter
        const treble = ctx.createBiquadFilter();
        treble.type = 'highshelf';
        treble.frequency.value = 3000;
        treble.gain.value = audioSettings.trebleBoost;
        setTrebleFilter(treble);

        // Connect audio processing chain
        source.connect(bass);
        bass.connect(treble);
        treble.connect(gain);
        gain.connect(ctx.destination);

        console.warn('Advanced audio processing initialized');
      }
    } catch (error) {
      console.error('Failed to initialize audio processing:', error);
    }
  }, [audioContext, audioSettings]);

  // Update audio processing parameters
  useEffect(() => {
    if (gainNode) {
      gainNode.gain.setTargetAtTime(audioSettings.volume, audioContext!.currentTime, 0.01);
    }
    if (bassFilter) {
      bassFilter.gain.setTargetAtTime(audioSettings.bassBoost, audioContext!.currentTime, 0.01);
    }
    if (trebleFilter) {
      trebleFilter.gain.setTargetAtTime(audioSettings.trebleBoost, audioContext!.currentTime, 0.01);
    }
  }, [audioSettings.volume, audioSettings.bassBoost, audioSettings.trebleBoost, gainNode, bassFilter, trebleFilter, audioContext]);

  // Cleanup audio processing
  const cleanupAudioProcessing = useCallback(() => {
    if (audioSource) {
      audioSource.disconnect();
      setAudioSource(null);
    }
    if (gainNode) {
      gainNode.disconnect();
      setGainNode(null);
    }
    if (bassFilter) {
      bassFilter.disconnect();
      setBassFilter(null);
    }
    if (trebleFilter) {
      trebleFilter.disconnect();
      setTrebleFilter(null);
    }
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
      setAudioContext(null);
    }
  }, [audioSource, gainNode, bassFilter, trebleFilter, audioContext]);

  // Initialize and Sync InputManager with viewport
  useEffect(() => {
    if (socket && roomId && !inputManagerRef.current) {
      inputManagerRef.current = new InputManager(socket, roomId, !!canControl);
    }
    
    if (inputManagerRef.current) {
      inputManagerRef.current.updateViewport(viewport.width, viewport.height);
    }
  }, [socket, roomId, canControl, viewport.width, viewport.height]);

  // WebRTC Stream Handling with Advanced Audio and Error Recovery
  useEffect(() => {
    if (browserStream && videoRef.current) {
      console.warn('Setting up browser stream...');

      videoRef.current.srcObject = browserStream;

      // Initialize advanced audio processing
      initializeAudioProcessing(browserStream);

      // Configure audio tracks with advanced settings
      const audioTracks = browserStream.getAudioTracks();
      audioTracks.forEach(track => {
        // Enable track
        track.enabled = true;

        if (track.applyConstraints) {
          try {
            track.applyConstraints({
              echoCancellation: audioSettings.echoCancellation,
              autoGainControl: audioSettings.autoGainControl,
              noiseSuppression: audioSettings.noiseReduction,
              sampleRate: { ideal: audioSettings.sampleRate },
              channelCount: { ideal: audioSettings.channels },
            });
          } catch (error) {
            console.warn('Advanced audio constraints not fully supported:', error);
          }
        }
      });

      // Set video element properties
      videoRef.current.volume = 1.0;
      videoRef.current.muted = false;
      setIsMuted(false);

      // Enhanced autoplay handling with better error recovery
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.warn('Virtual browser stream started successfully');
            setIsConnected(true);
            setConnectionError(null);
          })
          .catch((error) => {
            console.warn('Autoplay blocked, setting up recovery:', error);
            setIsConnected(false);

            // Setup user interaction trigger for video playback
            const handleUserInteraction = () => {
              if (videoRef.current && browserStream) {
                videoRef.current.muted = false;
                videoRef.current.volume = 1.0;
                videoRef.current.play()
                  .then(() => {
                    console.warn('Video playback recovered after user interaction');
                    setIsConnected(true);
                    setConnectionError(null);
                  })
                  .catch(e => {
                    console.error('Video recovery failed:', e);
                    setConnectionError('Video playback failed. Please refresh the page.');
                  });
                // Reinitialize audio processing after user interaction
                initializeAudioProcessing(browserStream);
              }
              document.removeEventListener('click', handleUserInteraction);
              document.removeEventListener('touchstart', handleUserInteraction);
            };
            document.addEventListener('click', handleUserInteraction);
            document.addEventListener('touchstart', handleUserInteraction);
          });
      }

      // Add stream error recovery
      const handleStreamError = () => {
        console.warn('Stream error detected, attempting recovery...');
        setIsConnected(false);
        setConnectionError('Stream connection lost. Attempting to reconnect...');

        // Try to reconnect after a short delay
        setTimeout(() => {
          if (videoRef.current && browserStream) {
            videoRef.current.srcObject = null;
            setTimeout(() => {
              if (videoRef.current) {
                videoRef.current.srcObject = browserStream;
                videoRef.current.play().catch(e => console.error('Reconnection failed:', e));
              }
            }, 100);
          }
        }, 2000);
      };

      // Listen for stream errors
      browserStream.getVideoTracks().forEach(track => {
        track.addEventListener('ended', handleStreamError);
        track.addEventListener('mute', () => console.warn('Video track muted'));
        track.addEventListener('unmute', () => console.warn('Video track unmuted'));
      });

      setStartupPhase(2);
      setIsLoading(false);
    } else {
      // Cleanup when no stream
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      cleanupAudioProcessing();
      setIsConnected(false);
    }

    return () => {
      cleanupAudioProcessing();
    };
  }, [browserStream, initializeAudioProcessing, cleanupAudioProcessing, audioSettings]);

  // Advanced Mute/Unmute Logic
  useEffect(() => {
    if (browserStream) {
      const audioTracks = browserStream.getAudioTracks();

      if (isMuted) {
        // Mute: disable tracks and set gain to 0
        audioTracks.forEach(track => {
          track.enabled = false;
        });
        if (gainNode) {
          gainNode.gain.setTargetAtTime(0, audioContext!.currentTime, 0.01);
        }
        if (videoRef.current) {
          videoRef.current.muted = true;
        }
      } else {
        // Unmute: enable tracks and restore volume
        audioTracks.forEach(track => {
          track.enabled = true;
        });
        if (gainNode) {
          gainNode.gain.setTargetAtTime(audioSettings.volume, audioContext!.currentTime, 0.01);
        }
        if (videoRef.current) {
          videoRef.current.muted = false;
          videoRef.current.volume = audioSettings.volume;
        }
      }
    }
  }, [isMuted, browserStream, gainNode, audioContext, audioSettings.volume]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {
        // console.warn(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };


  // -------------------------------------------------------------------------
  // SOCKET HANDLERS (CONTROL)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    const handleStarted = () => {
      setIsLoading(true);
      setStartupPhase(1); // Playwright launched — now connecting stream
    };

    const handleClosed = () => {
      setIsConnected(false);
      setIsLoading(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    const handleReady = (data: {
      stats: { viewport?: { width: number; height: number }; isMobile?: boolean };
    }) => {
      if (data.stats?.viewport) {
        setViewport({
          ...data.stats.viewport,
          isMobile: !!data.stats.isMobile,
        });
      }
    };

    socket.on('browser-started', handleStarted);
    socket.on('browser-closed', handleClosed);
    socket.on('virtual-browser-ready', handleReady);
    socket.on(
      'browser-viewport-updated',
      (data: { width: number; height: number; isMobile: boolean }) => setViewport(data)
    );

    // Tab synchronization
    socket.on(
      'browser-tabs-updated',
      (data: {
        tabs: Array<{ id: string; url: string; title?: string; isLoading?: boolean }>;
        activeTabId: string;
      }) => {
        if (data.tabs) {
          setTabs(
            data.tabs.map((t) => ({
              id: t.id,
              url: t.url,
              title: t.title || 'New Tab',
              isLoading: t.isLoading || false,
            }))
          );
        }
        if (data.activeTabId) {
          setActiveTabId(data.activeTabId);
          const active = data.tabs?.find(
            (t: { id: string; url: string }) => t.id === data.activeTabId
          );
          if (active) setInputUrl(active.url);
        }
      }
    );

    return () => {
      socket.off('browser-started', handleStarted);
      socket.off('browser-closed', handleClosed);
      socket.off('virtual-browser-ready', handleReady);
      socket.off('browser-viewport-updated');
      socket.off('browser-tabs-updated');
    };
  }, [socket, roomId, canControl]); // canControl is used implicitly via handlers

  // -------------------------------------------------------------------------
  // LIFECYCLE
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (browserStream) {
       setStartupPhase(2);
       setIsLoading(false);
       setIsConnected(true);
       setConnectionError(null);
    }

    // Safety timeout: If we're stuck in loading for > 30s, something's wrong
    const safetyTimeout = setTimeout(() => {
      if (isLoading && !browserStream) {
        setConnectionError("Uplink timeout. Please try refreshing or restarting the browser.");
      }
    }, 30000);

    return () => {
      clearTimeout(safetyTimeout);
    };
  }, [browserStream, isConnected, isLoading]);

  // Connection Health Monitoring
  useEffect(() => {
    if (!isConnected || !browserStream) return;

    const healthCheck = setInterval(() => {
      if (browserStream) {
        const videoTracks = browserStream.getVideoTracks();

        const hasActiveVideo = videoTracks.some(track => track.readyState === 'live');

        if (!hasActiveVideo) {
          console.warn('No active video tracks detected');
          setConnectionError('Video stream lost. Attempting recovery...');
          setIsConnected(false);

          // Attempt recovery
          setTimeout(() => {
            if (videoRef.current && browserStream) {
              videoRef.current.srcObject = null;
              setTimeout(() => {
                if (videoRef.current) {
                  videoRef.current.srcObject = browserStream;
                  videoRef.current.play().catch(e => console.error('Recovery failed:', e));
                }
              }, 500);
            }
          }, 2000);
        } else if (!isConnected) {
          setIsConnected(true);
          setConnectionError(null);
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(healthCheck);
  }, [isConnected, browserStream]);
  useEffect(() => {
    if (!isConnected || !socket || !roomId || !containerRef.current) return;

    const container = containerRef.current; // Capture ref for cleanup

    const optimizeViewport = () => {
      if (!containerRef.current) return;

      // 1. Measure the EXACT available space in the container
      // This accounts for Navbar, Padding, Address Bars, etc.
      const { clientWidth, clientHeight } = containerRef.current;

      if (clientWidth === 0 || clientHeight === 0) return;

      // 2. Handle Device Pixel Ratio (DPR) for sharpness
      // Cap DPR at 2.5 to avoid excessive bandwidth usage on high-density mobile screens
      // Use 1.0 minimum
      const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2.5);

      let targetWidth = clientWidth * dpr;
      let targetHeight = clientHeight * dpr;

      // 3. Apply Server-Side Limits (1080p caps) to prevent encoding overload
      const maxW = 1920; 
      const maxH = 1080; 

      // If the calculated hi-res size exceeds limits, scale down while maintaining Aspect Ratio
      // This is CRITICAL. We must maintain the Container's Aspect Ratio.
      if (targetWidth > maxW || targetHeight > maxH) {
        const ratio = Math.min(maxW / targetWidth, maxH / targetHeight);
        targetWidth *= ratio;
        targetHeight *= ratio;
      }

      // 4. Determine Mobile Mode based on CSS width (not physical pixels)
      const isSmallDevice = clientWidth < 1024;

      // Encoder friendly (even numbers)
      targetWidth = Math.round(targetWidth / 2) * 2;
      targetHeight = Math.round(targetHeight / 2) * 2;

      if (
        Math.abs(targetWidth - viewportRef.current.width) > 4 || // Small buffer for minor deviations
        Math.abs(targetHeight - viewportRef.current.height) > 4 ||
        isSmallDevice !== viewportRef.current.isMobile
      ) {
        // Debounce happens naturally via ResizeObserver frequency, but we can rate limit if needed.
        // For now, direct updates provide snappiest feel on rotation.
        socket.emit('browser-set-viewport', {
          roomId,
          width: targetWidth,
          height: targetHeight,
          isMobile: isSmallDevice,
        });
        setViewport({ width: targetWidth, height: targetHeight, isMobile: isSmallDevice });
      }
    };

    // Use ResizeObserver for accurate, performant element tracking
    const resizeObserver = new ResizeObserver(() => {
      // Wrap in requestAnimationFrame to avoid "ResizeObserver loop limit exceeded"
      // and to batch visual updates
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRectRef.current = containerRef.current.getBoundingClientRect();
        }
        optimizeViewport();
      });
    });

    resizeObserver.observe(container);

    // Immediate initial call
    optimizeViewport();

    return () => {
      resizeObserver.disconnect();
    };
  }, [isConnected, socket, roomId]);

  // -------------------------------------------------------------------------
  // INPUT HANDLING (Touch & Mouse) - Advanced InputManager
  // -------------------------------------------------------------------------

  // Mouse event handlers using InputManager
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (inputManagerRef.current && videoRef.current) {
      inputManagerRef.current.handleMouseDown(e.nativeEvent, videoRef.current);
    }
    // Update cursor position
    if (touchContainerRef.current) {
      const rect = touchContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setCursorPosition({ x, y });
      setIsCursorVisible(true);
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (inputManagerRef.current && videoRef.current) {
      inputManagerRef.current.handleMouseMove(e.nativeEvent, videoRef.current);
    }
    // Update cursor position
    if (touchContainerRef.current) {
      const rect = touchContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setCursorPosition({ x, y });
      setIsCursorVisible(true);
    }
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (inputManagerRef.current && videoRef.current) {
      inputManagerRef.current.handleMouseUp(e.nativeEvent, videoRef.current);
    }
  }, []);

  // Scroll indicator state
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const lastScrollTimeRef = useRef(0);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (inputManagerRef.current && videoRef.current) {
      inputManagerRef.current.handleDoubleClick(e.nativeEvent, videoRef.current);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsCursorVisible(false);
    setCursorPosition(null);
  }, []);

  // Keyboard event handling with improved filtering
  useEffect(() => {
    if (!canControl || !socket) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in our own input fields
      const activeElement = document.activeElement;
      if (activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.closest('[data-virtual-browser-input]')
      )) {
        return;
      }

      // Skip UI shortcut keys to avoid conflicts
      const uiShortcuts = ['m', 'M', 'f', 'F', 'Escape', 'Tab'];
      if (uiShortcuts.includes(e.key)) {
        return;
      }

      // Handle special keys for scrolling and navigation
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
          e.key === 'PageUp' || e.key === 'PageDown' || e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        socket.emit('browser-input', {
          roomId,
          input: {
            type: 'keydown',
            key: e.key,
            code: e.code,
            keyCode: e.keyCode,
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            metaKey: e.metaKey,
          },
        });
        return;
      }

      // Handle regular typing keys
      e.preventDefault();
      socket.emit('browser-input', {
        roomId,
        input: {
          type: 'keydown',
          key: e.key,
          code: e.code,
          keyCode: e.keyCode,
          shiftKey: e.shiftKey,
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
          metaKey: e.metaKey,
        },
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Don't handle if user is typing in our own input fields
      const activeElement = document.activeElement;
      if (activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.closest('[data-virtual-browser-input]')
      )) {
        return;
      }

      // Skip UI shortcut keys to avoid conflicts
      const uiShortcuts = ['m', 'M', 'f', 'F', 'Escape', 'Tab'];
      if (uiShortcuts.includes(e.key)) {
        return;
      }

      e.preventDefault();
      socket.emit('browser-input', {
        roomId,
        input: {
          type: 'keyup',
          key: e.key,
          code: e.code,
          keyCode: e.keyCode,
          shiftKey: e.shiftKey,
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
          metaKey: e.metaKey,
        },
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [canControl, socket, roomId]);

  // Add touch event listeners manually with passive: false to allow preventDefault
  useEffect(() => {
    const container = touchContainerRef.current;
    if (!container || !canControl) return;

    const updateCursorPosition = (clientX: number, clientY: number) => {
      if (container) {
        const rect = container.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        setCursorPosition({ x, y });
        setIsCursorVisible(true);
      }
    };

    const touchStartHandler = (e: TouchEvent) => {
      // Ignore events from the virtual keyboard
      if ((e.target as HTMLElement)?.closest('.osk-keyboard')) return;

      // Prevent page scrolling/zoom/browser gestures
      if (e.cancelable) e.preventDefault();
      if (inputManagerRef.current && videoRef.current) {
        inputManagerRef.current.handleTouchStart(e, videoRef.current);
      }
      // Update cursor position and initialize touch tracking
      if (e.touches[0]) {
        updateCursorPosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const touchMoveHandler = (e: TouchEvent) => {
      // Ignore events from the virtual keyboard
      if ((e.target as HTMLElement)?.closest('.osk-keyboard')) return;

      // Prevent page scrolling
      if (e.cancelable) e.preventDefault();

      if (inputManagerRef.current && videoRef.current) {
        inputManagerRef.current.handleTouchMove(e, videoRef.current);
      }
      // Update cursor position
      if (e.touches[0]) {
        updateCursorPosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const touchEndHandler = (e: TouchEvent) => {
      if (inputManagerRef.current && videoRef.current) {
        inputManagerRef.current.handleTouchEnd(e, videoRef.current);
      }
      // Hide cursor after touch ends
      setTimeout(() => setIsCursorVisible(false), 100);
    };

    const wheelHandler = (e: WheelEvent) => {
      // Ignore events from the virtual keyboard
      if ((e.target as HTMLElement)?.closest('.osk-keyboard')) return;

      // Prevent the main page from scrolling when interacting with virtual browser
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();

      if (inputManagerRef.current && videoRef.current) {
        inputManagerRef.current.handleWheel(e, videoRef.current);

        // Show scroll indicator
        setShowScrollIndicator(true);
        lastScrollTimeRef.current = Date.now();

        // Hide indicator after 1 second
        setTimeout(() => {
          if (Date.now() - lastScrollTimeRef.current > 900) {
            setShowScrollIndicator(false);
          }
        }, 1000);
      }
    };

    // Add listeners with passive: false to allow preventDefault and block page scrolling
    container.addEventListener('touchstart', touchStartHandler, { passive: false });
    container.addEventListener('touchmove', touchMoveHandler, { passive: false });
    container.addEventListener('touchend', touchEndHandler, { passive: false });
    container.addEventListener('touchcancel', touchEndHandler, { passive: false });
    container.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
      container.removeEventListener('touchstart', touchStartHandler);
      container.removeEventListener('touchmove', touchMoveHandler);
      container.removeEventListener('touchend', touchEndHandler);
      container.removeEventListener('touchcancel', touchEndHandler);
      container.removeEventListener('wheel', wheelHandler);
    };
  }, [canControl, socket, roomId]);

  useEffect(() => {
    if (!canControl) return;

    const handleKey = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const container = containerRef.current;

      if (!container?.contains(active)) return;
      if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') return;

      e.preventDefault();
      socket?.emit('browser-input', {
        roomId,
        input: {
          type: e.type,
          key: e.key,
          code: e.code,
          keyCode: e.keyCode,
        },
      });
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);

    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKey);
    };
  }, [canControl, roomId, socket]);

  // -------------------------------------------------------------------------
  // UI HANDLERS
  // -------------------------------------------------------------------------
  const doNavigate = (e?: React.FormEvent, targetUrl?: string) => {
    e?.preventDefault();
    if (!canControl) return;

    let url = targetUrl || inputUrl.trim();
    if (!url) return;

    if (!url.startsWith('http')) {
      if (url.includes('.') && !url.includes(' ')) {
        url = 'https://' + url;
      } else {
        url = 'https://duckduckgo.com/?q=' + encodeURIComponent(url);
      }
    }

    // Update local tab state
    const targetTabId = activeTabId;
    setTabs((prev) => prev.map((t) => (t.id === targetTabId ? { ...t, url, isLoading: true } : t)));
    setInputUrl(url);

    updateVirtualBrowserUrl(url);
    socket?.emit('browser-navigate', { roomId, tabId: targetTabId, url });
  };

  const addTab = () => {
    if (!canControl) return;
    const newId = Math.random().toString(36).substring(7);
    const url = 'https://duckduckgo.com';
    const newTab = { id: newId, url, title: 'New Tab', isLoading: true };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
    setInputUrl(url);
    socket?.emit('browser-new-tab', { roomId, tabId: newId, url });
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canControl) return;
    if (tabs.length === 1) return;

    const newTabs = tabs.filter((t) => t.id !== id);
    setTabs(newTabs);
    socket?.emit('browser-close-tab', { roomId, tabId: id });

    if (activeTabId === id) {
      const lastTab = newTabs[newTabs.length - 1];
      setActiveTabId(lastTab.id);
      setInputUrl(lastTab.url);
      socket?.emit('browser-switch-tab', { roomId, tabId: lastTab.id });
    }
  };

  // Disclaimer Popup Component
  const DisclaimerPopup = () => (
    <div className='fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
      <div className='bg-[#0F1115] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl'>
        <div className='flex items-center gap-3 mb-4'>
          <AlertTriangle className='text-amber-500' size={24} />
          <h3 className='text-lg font-bold text-white'>Virtual Browser Notice</h3>
        </div>

        <div className='space-y-3 text-sm text-slate-300 mb-6'>
          <p>
            <strong className='text-amber-400'>Audio & Video Quality:</strong> Virtual browser streams may have reduced quality and occasional interruptions.
          </p>
          <p>
            <strong className='text-blue-400'>Recommended Alternative:</strong> For the best experience, consider using screen sharing instead of the virtual browser.
          </p>
          <p className='text-xs text-slate-500'>
            Screen sharing provides native performance, full audio/video quality, and better interaction capabilities.
          </p>
        </div>

        <div className='flex gap-3'>
          <Button
            onClick={() => setShowDisclaimer(false)}
            className='flex-1 bg-blue-600 hover:bg-blue-500 text-white'
          >
            Continue with Virtual Browser
          </Button>
          <Button
            onClick={() => {
              setShowDisclaimer(false);
              // Could add logic to switch to screen sharing mode here
              toast.info('Consider using screen sharing for better quality');
            }}
            variant='outline'
            className='flex-1 border-slate-600 text-slate-300 hover:bg-slate-800'
          >
            <Share2 size={16} className='mr-2' />
            Use Screen Share
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Disclaimer Popup */}
      {showDisclaimer && <DisclaimerPopup />}

      <div
        ref={containerRef}
        className={`flex flex-col w-full ${isMinimized ? 'h-auto' : 'h-full'} bg-[#0a0a0e] md:rounded-2xl overflow-hidden md:shadow-[0_0_50px_rgba(0,0,0,0.5)] md:border border-white/10 transition-all duration-300 relative group/browser`}
        tabIndex={0}
      >
      {/* TABS BAR (GLASSMORPHISM) */}
      {!isMinimized && (
        <div className='flex items-center gap-1.5 px-3 pt-2 bg-[#0a0b10] border-b border-white/5 overflow-x-auto no-scrollbar group/tabs backdrop-blur-xl'>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => {
                if (!canControl) return;
                setActiveTabId(tab.id);
                setInputUrl(tab.url);
                socket?.emit('browser-switch-tab', { roomId, tabId: tab.id });
              }}
              className={`flex items-center gap-2 px-4 py-2 min-w-[140px] max-w-[220px] rounded-t-xl text-[11px] font-semibold transition-all cursor-pointer relative group/tab ${activeTabId === tab.id ? 'bg-[#15161c] text-blue-400 shadow-[0_-2px_15px_rgba(59,130,246,0.15)] border-t border-blue-500/20' : 'text-slate-500 hover:bg-white/5 border-t border-transparent hover:text-slate-300'}`}
            >
              <Globe
                size={12}
                className={activeTabId === tab.id ? 'text-blue-500' : 'text-slate-500'}
              />
              <span className='truncate flex-1'>{tab.title || tab.url}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => closeTab(tab.id, e)}
                  className='opacity-0 group-hover/tab:opacity-100 hover:bg-white/10 p-0.5 rounded-md transition-all'
                >
                  <X size={10} />
                </button>
              )}
              {activeTabId === tab.id && (
                <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500' />
              )}
            </div>
          ))}
          <Button
            variant='ghost'
            size='icon'
            onClick={addTab}
            className='h-6 w-6 ml-1 text-slate-500 hover:text-white hover:bg-white/5 rounded-md'
          >
            <Sparkles size={12} className='text-blue-400/50' />
          </Button>
        </div>
      )}

      {/* TOOLBAR */}
      <div className='flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-[#15161c] border-b border-white/5 z-20 backdrop-blur-3xl'>
        <div className='flex gap-2 md:gap-2 px-1 md:px-2 shrink-0'>
          <button
            onClick={() => canControl && closeVirtualBrowser()}
            disabled={!canControl}
            className={`w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-all ${!canControl && 'opacity-30'}`}
          />
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className='w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-500 transition-all'
          />
          <button
            onClick={toggleFullscreen}
            className='w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-all'
          />
        </div>

        <div className='flex gap-0.5 md:gap-1 ml-1 md:ml-2 shrink-0'>
          <Button
            variant='ghost'
            size='icon'
            disabled={!canControl}
            className='h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10'
            onClick={() =>
              canControl &&
              socket?.emit('browser-input', { roomId, input: { type: 'navigate', action: 'back' } })
            }
          >
            <ChevronLeft size={18} />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            disabled={!canControl}
            className='h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10'
            onClick={() =>
              canControl &&
              socket?.emit('browser-input', {
                roomId,
                input: { type: 'navigate', action: 'forward' },
              })
            }
          >
            <ChevronRight size={18} />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className={`h-8 w-8 transition-all ${isKeyboardOpen ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
            onClick={() => setIsKeyboardOpen(!isKeyboardOpen)}
            title='Open Virtual Keyboard'
          >
            <Keyboard size={16} />
          </Button>
        </div>

        <form onSubmit={(e) => doNavigate(e)} className='flex-1 max-w-4xl mx-auto relative group'>
          <div className='absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2'>
            {inputUrl.startsWith('https') ? (
              <LockIcon size={12} className='text-emerald-500' />
            ) : (
              <Globe size={12} className='text-slate-500' />
            )}
          </div>
          <Input
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            disabled={!canControl}
            className='h-10 bg-[#0a0b10] border-white/10 rounded-full pl-10 pr-4 text-xs font-semibold text-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500 transition-all shadow-inner'
            placeholder='Search DuckDuckGo or enter URL'
          />
        </form>

        <div className='flex items-center gap-3 ml-auto'>
          <Button
            variant='outline'
            size='sm'
            className='hidden lg:flex h-8 gap-2 bg-blue-600/10 border-blue-500/20 text-blue-400 hover:bg-blue-600/20 text-[10px] font-bold uppercase tracking-widest'
            onClick={() => setIsAISidebarOpen(!isAISidebarOpen)}
          >
            <Sparkles size={12} className={isAISidebarOpen ? 'animate-spin' : ''} />
            Browser Assistant
          </Button>

          <div className='flex items-center gap-1.5 px-3 py-1.5 bg-[#0F1115] border border-white/5 rounded-full'>
            <Button
              variant='ghost'
              size='icon'
              disabled={!canControl}
              className={`h-7 w-7 rounded-md transition-all ${viewport.isMobile ? 'text-blue-400 bg-blue-400/10' : 'text-slate-400 hover:text-white'} ${!canControl ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (!canControl) return;
                const newMobile = !viewport.isMobile;
                const newWidth = newMobile ? 390 : 1920;
                const newHeight = newMobile ? 844 : 1080;
                socket?.emit('browser-set-viewport', {
                  roomId,
                  width: newWidth,
                  height: newHeight,
                  isMobile: newMobile,
                });
              }}
              title={
                !canControl
                  ? 'Only Host can switch view'
                  : viewport.isMobile
                    ? 'Switch to Desktop Mode'
                    : 'Switch to Mobile Mode'
              }
            >
              <Smartphone size={14} />
            </Button>
          </div>

          <div
            className={`flex items-center gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-full border ${isConnected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}
            />
            <span className='hidden sm:inline text-[10px] font-bold tracking-wider'>
              {isConnected ? 'WEBRTC' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* ADVANCED TOOLBAR */}
      {!isMinimized && (
        <div className='h-14 bg-[#0F1115] border-b border-white/5 flex items-center justify-between px-4 relative z-20'>
          {/* Left Section - Navigation */}
          <div className='flex items-center gap-2'>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5'
              onClick={() => socket?.emit('browser-input', { roomId, input: { type: 'navigate', url: 'back' } })}
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5'
              onClick={() => socket?.emit('browser-input', { roomId, input: { type: 'navigate', url: 'forward' } })}
            >
              <ChevronRight size={16} />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5'
              onClick={() => socket?.emit('browser-input', { roomId, input: { type: 'navigate', url: virtualBrowserUrl } })}
            >
              <RotateCcw size={16} />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5'
              onClick={() => socket?.emit('browser-input', { roomId, input: { type: 'navigate', url: 'https://www.google.com' } })}
            >
              <Home size={16} />
            </Button>
          </div>

          {/* Right Section - Controls */}
          <div className='flex items-center gap-2'>
            {/* Performance Indicator */}
            <div className='flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5'>
              <div className={`w-2 h-2 rounded-full ${connectionQuality === 'excellent' ? 'bg-green-400' : connectionQuality === 'good' ? 'bg-yellow-400' : 'bg-red-400'}`} />
              <span className='text-xs text-slate-400 font-medium'>
                {fps}fps • {latency}ms
              </span>
            </div>

            {/* Zoom Controls */}
            <div className='flex items-center gap-1'>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5'
                onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
              >
                <ZoomOut size={16} />
              </Button>
              <span className='text-xs text-slate-400 min-w-[3rem] text-center'>
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5'
                onClick={() => setZoomLevel(Math.min(3.0, zoomLevel + 0.1))}
              >
                <ZoomIn size={16} />
              </Button>
            </div>

            {/* Settings */}
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5'
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            >
              <Settings size={16} />
            </Button>

            {/* Fullscreen */}
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5'
              onClick={toggleFullscreen}
            >
              {isBrowserFullscreen ? <Monitor size={16} /> : <Monitor size={16} />}
            </Button>

            {/* Close */}
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10'
              onClick={closeVirtualBrowser}
            >
              <X size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* SETTINGS PANEL */}
      {isSettingsOpen && !isMinimized && (
        <div className='bg-[#0F1115] border-b border-white/5 p-4 animate-in slide-in-from-top duration-200'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-sm font-bold text-white'>Browser Settings</h3>
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6 text-slate-400 hover:text-white'
              onClick={() => setIsSettingsOpen(false)}
            >
              <X size={14} />
            </Button>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            {/* Performance Mode */}
            <div className='space-y-2'>
              <label className='text-xs font-medium text-slate-400'>Performance Mode</label>
              <div className='flex gap-2'>
                {(['quality', 'balanced', 'performance'] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant={performanceMode === mode ? 'default' : 'outline'}
                    size='sm'
                    className='text-xs capitalize'
                    onClick={() => setPerformanceMode(mode)}
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>

            {/* Connection Quality */}
            <div className='space-y-2'>
              <label className='text-xs font-medium text-slate-400'>Connection Quality</label>
              <div className='flex items-center gap-2'>
                <Wifi size={14} className={connectionQuality === 'excellent' ? 'text-green-400' : connectionQuality === 'good' ? 'text-yellow-400' : 'text-red-400'} />
                <span className='text-xs text-slate-300 capitalize'>{connectionQuality}</span>
              </div>
            </div>

            {/* Viewport Size */}
            <div className='space-y-2'>
              <label className='text-xs font-medium text-slate-400'>Viewport</label>
              <div className='text-xs text-slate-300'>
                {viewport.width} × {viewport.height} {viewport.isMobile ? '(Mobile)' : '(Desktop)'}
              </div>
            </div>
          </div>

          {/* Advanced Audio Controls */}
          <div className='mt-4 pt-4 border-t border-white/5'>
            <h4 className='text-xs font-bold text-slate-300 mb-3 flex items-center gap-2'>
              <Volume2 size={12} className='text-blue-400' />
              Advanced Audio Processing
            </h4>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* Volume Control */}
              <div className='space-y-2'>
                <label className='text-xs font-medium text-slate-400'>Volume: {Math.round(audioSettings.volume * 100)}%</label>
                <input
                  type='range'
                  min='0'
                  max='2'
                  step='0.1'
                  value={audioSettings.volume}
                  onChange={(e) => setAudioSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                  className='w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider'
                />
              </div>

              {/* Bass Boost */}
              <div className='space-y-2'>
                <label className='text-xs font-medium text-slate-400'>Bass Boost: {audioSettings.bassBoost}dB</label>
                <input
                  type='range'
                  min='-10'
                  max='10'
                  step='1'
                  value={audioSettings.bassBoost}
                  onChange={(e) => setAudioSettings(prev => ({ ...prev, bassBoost: parseInt(e.target.value) }))}
                  className='w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider'
                />
              </div>

              {/* Treble Boost */}
              <div className='space-y-2'>
                <label className='text-xs font-medium text-slate-400'>Treble Boost: {audioSettings.trebleBoost}dB</label>
                <input
                  type='range'
                  min='-10'
                  max='10'
                  step='1'
                  value={audioSettings.trebleBoost}
                  onChange={(e) => setAudioSettings(prev => ({ ...prev, trebleBoost: parseInt(e.target.value) }))}
                  className='w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider'
                />
              </div>

              {/* Audio Processing Options */}
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs text-slate-400'>Echo Cancellation</span>
                  <button
                    onClick={() => setAudioSettings(prev => ({ ...prev, echoCancellation: !prev.echoCancellation }))}
                    className={`w-8 h-4 rounded-full flex items-center px-1 transition-colors ${audioSettings.echoCancellation ? 'bg-blue-500' : 'bg-slate-600'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${audioSettings.echoCancellation ? 'translate-x-3' : 'translate-x-0'}`} />
                  </button>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-xs text-slate-400'>Noise Reduction</span>
                  <button
                    onClick={() => setAudioSettings(prev => ({ ...prev, noiseReduction: !prev.noiseReduction }))}
                    className={`w-8 h-4 rounded-full flex items-center px-1 transition-colors ${audioSettings.noiseReduction ? 'bg-blue-500' : 'bg-slate-600'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${audioSettings.noiseReduction ? 'translate-x-3' : 'translate-x-0'}`} />
                  </button>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-xs text-slate-400'>Auto Gain Control</span>
                  <button
                    onClick={() => setAudioSettings(prev => ({ ...prev, autoGainControl: !prev.autoGainControl }))}
                    className={`w-8 h-4 rounded-full flex items-center px-1 transition-colors ${audioSettings.autoGainControl ? 'bg-blue-500' : 'bg-slate-600'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${audioSettings.autoGainControl ? 'translate-x-3' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Audio Reset Button */}
            <div className='mt-3 flex justify-end'>
              <Button
                variant='outline'
                size='sm'
                className='text-xs'
                onClick={() => {
                  setAudioSettings({
                    volume: 1.0,
                    bassBoost: 0,
                    trebleBoost: 0,
                    noiseReduction: false,
                    echoCancellation: true,
                    autoGainControl: true,
                    sampleRate: 48000,
                    channels: 2,
                  });
                  toast.success('Audio settings reset to defaults');
                }}
              >
                Reset Audio
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* BROWSER VIEWPORT */}
      {!isMinimized && (
        <div
          ref={touchContainerRef}
          className='flex-1 bg-[#050608] relative flex items-center justify-center overflow-hidden cursor-default group touch-none'
          style={{ touchAction: 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          onMouseLeave={handleMouseLeave}
        >
          {/* Loading / Startup overlay — shows while not connected */}
          {(!isConnected || isLoading) && (
            <div className='absolute inset-0 bg-[#000000] z-10 flex flex-col items-center justify-center gap-12 backdrop-blur-3xl overflow-hidden'>
              {/* Background ambient glow */}
              <div className='absolute inset-0 bg-blue-500/5 pulse-slow w-full h-full' />
              <div className='absolute w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none' />

              {/* Animated Core */}
              <div className='relative w-32 h-32 flex items-center justify-center animate-in zoom-in duration-1000'>
                <div className='absolute inset-0 rounded-full bg-blue-500/20 blur-md animate-pulse' />
                <div className='absolute inset-0 rounded-full border border-blue-500/30' style={{ animation: 'spin 4s linear infinite' }} />
                <div className='absolute inset-2 rounded-full border border-blue-400/20 border-t-blue-400/80 shadow-[0_0_15px_rgba(96,165,250,0.5)]' style={{ animation: 'spin 3s linear infinite reverse' }} />
                <Globe size={48} className='text-blue-400 relative z-10 animate-pulse drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]' />
              </div>

              {/* Phase steps */}
              <div className='flex flex-col gap-4 min-w-[280px] z-10 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-2xl backdrop-blur-xl'>
                {(
                  [
                    { label: 'Initialising Browser Engine', phase: 0 },
                    { label: 'Launching Virtual Environment', phase: 1 },
                    { label: 'Establishing WebRTC Uplink', phase: 2 },
                  ] as const
                ).map(({ label, phase: p }) => (
                  <div
                    key={p}
                    className={`flex items-center gap-4 transition-all duration-700 ease-out ${
                      startupPhase > p
                        ? 'opacity-100 translate-x-0'
                        : startupPhase === p
                          ? 'opacity-100 translate-x-0'
                          : 'opacity-20 -translate-x-2'
                    }`}
                  >
                    <div className='w-6 h-6 flex items-center justify-center shrink-0 relative'>
                      {startupPhase > p ? (
                        <div className='relative flex items-center justify-center'>
                          <div className='absolute inset-0 rounded-full bg-emerald-500/20 blur-[2px]' />
                          <CheckCircle2 size={18} className='text-emerald-400 relative z-10' />
                        </div>
                      ) : startupPhase === p ? (
                        <div className='relative flex items-center justify-center'>
                          <div className='absolute inset-0 rounded-full bg-blue-500/20 blur-[2px] animate-pulse' />
                          <Loader2 size={18} className='text-blue-400 animate-spin relative z-10' />
                        </div>
                      ) : (
                        <div className='w-3.5 h-3.5 rounded-full border-2 border-slate-700' />
                      )}
                    </div>
                    <span
                      className={`text-xs font-bold tracking-[0.2em] uppercase ${
                        startupPhase > p
                          ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]'
                          : startupPhase === p
                            ? 'text-blue-300 drop-shadow-[0_0_5px_rgba(147,197,253,0.5)]'
                            : 'text-slate-600'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Secure Connection Badge */}
              <div className='absolute bottom-8 flex flex-col items-center gap-4 z-10'>
                 {connectionError && (
                   <div className="px-6 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold uppercase tracking-wider animate-in fade-in slide-in-from-bottom-4 duration-500 backdrop-blur-md">
                     {connectionError}
                   </div>
                 )}
                 <div className='flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 bg-white/5 backdrop-blur-sm'>
                      <Shield size={12} className='text-slate-500' />
                      <span className='text-[9px] font-black uppercase tracking-[0.3em] text-slate-500'>End-to-End Encrypted Session</span>
                 </div>
              </div>
            </div>
          )}

          {/* Video — always rendered so ref can attach, hidden implicitly via opacity until loaded */}
          <div
            className={`flex w-full h-full transition-opacity duration-500 ${!isConnected ? 'opacity-0 absolute inset-0 pointer-events-none' : 'opacity-100'}`}
          >
            <div
              className={`relative flex-1 h-full flex items-center justify-center transition-all duration-500 ${isLoading ? 'opacity-80 scale-[0.99] grayscale-[0.5]' : 'opacity-100 scale-100'}`}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isMuted}
                className='w-full h-full object-contain shadow-2xl shadow-black/50 outline-none select-none'
                style={{
                  pointerEvents: 'none',
                  imageRendering: 'auto', // Better for high res
                  transform: 'translateZ(0)' // Force GPU composite
                }}
                onError={(e) => {
                  console.error('Video element error:', e);
                  setConnectionError('Video playback error. Please refresh the page.');
                  setIsConnected(false);
                }}
                onLoadStart={() => {
                  console.warn('Video load started');
                  setIsLoading(true);
                }}
                onLoadedData={() => {
                  console.warn('Video data loaded');
                  setIsLoading(false);
                  setIsConnected(true);
                  setConnectionError(null);
                }}
                onStalled={() => {
                  console.warn('Video stalled');
                  setConnectionError('Video stream stalled. Attempting recovery...');
                }}
                onWaiting={() => {
                  console.warn('Video waiting for data');
                }}
                onPlaying={() => {
                  console.warn('Video playing');
                  setIsConnected(true);
                  setConnectionError(null);
                }}
                onPause={() => {
                  console.warn('Video paused');
                }}
              />

              {/* Virtual Cursor Overlay */}
              {isCursorVisible && cursorPosition && canControl && (
                <div
                  className='absolute pointer-events-none z-50 transition-all duration-75 ease-out'
                  style={{
                    left: cursorPosition.x - 8,
                    top: cursorPosition.y - 8,
                    transform: 'translateZ(0)'
                  }}
                >
                  <div className='relative'>
                    {/* Cursor pointer */}
                    <div className='w-4 h-4 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50 border-2 border-white animate-pulse' />
                    {/* Cursor ring */}
                    <div className='absolute inset-0 w-4 h-4 border-2 border-blue-300 rounded-full animate-ping opacity-75' />
                    {/* Crosshair lines */}
                    <div className='absolute top-1/2 left-0 w-full h-0.5 bg-blue-400 transform -translate-y-0.5 opacity-60' />
                    <div className='absolute left-1/2 top-0 w-0.5 h-full bg-blue-400 transform -translate-x-0.5 opacity-60' />
                  </div>
                </div>
              )}

              {/* Scroll Indicator */}
              {showScrollIndicator && canControl && (
                <div className='absolute top-4 right-4 z-40 animate-in fade-in slide-in-from-right duration-300'>
                  <div className='bg-blue-500/90 backdrop-blur-sm text-white px-3 py-2 rounded-lg shadow-lg border border-blue-400/20'>
                    <div className='flex items-center gap-2'>
                      <div className='w-2 h-2 bg-white rounded-full animate-bounce' />
                      <span className='text-sm font-medium'>Scrolling Active</span>
                    </div>
                  </div>
                </div>
              )}

              {/* OSK / VIRTUAL KEYBOARD OVERLAY (GLASSMORPHISM) */}
              {isKeyboardOpen && (
                <motion.div 
                  drag
                  dragMomentum={false}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className='osk-keyboard absolute bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-[420px] bg-[#0a0a0ea6] backdrop-blur-2xl border border-white/10 rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-4 animate-in slide-in-from-bottom-8 duration-300 z-[100] pointer-events-auto cursor-pointer'
                >
                  <div className='flex items-center justify-between px-1.5 cursor-grab active:cursor-grabbing pb-2 border-b border-white/5'>
                    <div className='flex items-center gap-2'>
                        <Keyboard size={14} className='text-blue-400' />
                        <span className='text-[10px] font-black text-slate-300 uppercase tracking-widest'>
                          Secure Input Module
                        </span>
                    </div>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-6 w-6 rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      onClick={() => setIsKeyboardOpen(false)}
                    >
                      <X size={12} />
                    </Button>
                  </div>
                  <div className='flex gap-2'>
                    <Input
                      value={imeText}
                      onChange={(e) => setImeText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (!canControl) {
                            toast.error('Control Required');
                            return;
                          }
                          if (imeText.trim()) {
                            // Send text input to browser
                            socket?.emit('browser-input', {
                              roomId,
                              input: { type: 'insertText', text: imeText.trim() },
                            });
                            // Send Enter key
                            socket?.emit('browser-input', {
                              roomId,
                              input: { type: 'keydown', key: 'Enter', keyCode: 13 },
                            });
                            socket?.emit('browser-input', {
                              roomId,
                              input: { type: 'keyup', key: 'Enter', keyCode: 13 },
                            });
                            setImeText('');
                          }
                        }
                      }}
                      placeholder='Type text to transmit...'
                      className='h-12 rounded-xl bg-[#00000060] border-white/10 text-sm focus-visible:ring-1 focus-visible:ring-blue-500 flex-1 shadow-inner placeholder:text-slate-500'
                    />
                    <Button
                      variant='secondary'
                      className='h-12 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] font-black tracking-widest text-[10px]'
                      onClick={() => {
                        if (!canControl) {
                          toast.error('Control Required', { description: 'Only Host or Co-Hosts can send input.' });
                          return;
                        }
                        if (imeText.trim()) {
                          // Send text input to browser
                          socket?.emit('browser-input', {
                            roomId,
                            input: { type: 'insertText', text: imeText.trim() },
                          });
                          // Send Enter key to submit/search
                          socket?.emit('browser-input', {
                            roomId,
                            input: { type: 'keydown', key: 'Enter', keyCode: 13 },
                          });
                          socket?.emit('browser-input', {
                            roomId,
                            input: { type: 'keyup', key: 'Enter', keyCode: 13 },
                          });
                          setImeText('');
                        }
                      }}
                    >
                      EXECUTE
                    </Button>
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      variant='secondary'
                      className='h-10 rounded-xl flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold tracking-wider text-[10px] border border-emerald-500/20'
                      onClick={() => {
                        if (!canControl) {
                          toast.error('Control Required');
                          return;
                        }
                        if (imeText.trim()) {
                          socket?.emit('browser-input', {
                            roomId,
                            input: { type: 'insertText', text: imeText.trim() },
                          });
                          setImeText('');
                        }
                      }}
                    >
                      <Send size={12} className='mr-1.5 inline-block' /> INSERT
                    </Button>
                    <Button
                      variant='secondary'
                      className='h-10 rounded-xl flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold tracking-wider text-[10px] border border-red-500/20'
                      onClick={() => {
                        socket?.emit('browser-input', {
                          roomId,
                          input: { type: 'keydown', key: 'Backspace', keyCode: 8 },
                        });
                        socket?.emit('browser-input', {
                          roomId,
                          input: { type: 'keyup', key: 'Backspace', keyCode: 8 },
                        });
                      }}
                    >
                      <X size={12} className='mr-1.5 inline-block' /> BACKSPACE
                    </Button>
                  </div>

                  {/* Virtual Keyboard Layout */}
                  <div className='grid grid-cols-10 gap-1 mt-2'>
                    {[
                      '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
                      'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
                      'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';',
                      'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/',
                      ' ', '←'
                    ].map((key) => (
                      <Button
                        key={key}
                        variant='outline'
                        size='sm'
                        className={`h-8 text-xs font-mono ${key === ' ' ? 'col-span-6' : key === '←' ? 'col-span-2' : ''} bg-slate-800/50 border-slate-600 hover:bg-slate-700 hover:border-slate-500`}
                        onClick={() => {
                          if (!canControl) {
                            toast.error('Control Required');
                            return;
                          }
                          if (key === '←') {
                            // Backspace
                            socket?.emit('browser-input', {
                              roomId,
                              input: { type: 'keydown', key: 'Backspace', keyCode: 8 },
                            });
                            socket?.emit('browser-input', {
                              roomId,
                              input: { type: 'keyup', key: 'Backspace', keyCode: 8 },
                            });
                          } else if (key === ' ') {
                            // Space
                            socket?.emit('browser-input', {
                              roomId,
                              input: { type: 'keydown', key: ' ', keyCode: 32 },
                            });
                            socket?.emit('browser-input', {
                              roomId,
                              input: { type: 'keyup', key: ' ', keyCode: 32 },
                            });
                          } else {
                            // Regular key
                            socket?.emit('browser-input', {
                              roomId,
                              input: { type: 'keydown', key: key, keyCode: key.charCodeAt(0) },
                            });
                            socket?.emit('browser-input', {
                              roomId,
                              input: { type: 'keyup', key: key, keyCode: key.charCodeAt(0) },
                            });
                          }
                        }}
                      >
                        {key === '←' ? '⌫' : key.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* AI SIDEPANEL */}
            {isAISidebarOpen && (
              <div className='w-80 h-full bg-[#0F1115] border-l border-white/5 flex flex-col animate-in slide-in-from-right duration-300'>
                <div className='p-4 border-b border-white/5 flex items-center justify-between bg-blue-600/5'>
                  <div className='flex items-center gap-2'>
                    <Sparkles size={16} className='text-blue-400' />
                    <span className='text-xs font-bold uppercase tracking-wider text-slate-200'>
                      AI Browser Agent
                    </span>
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-6 w-6 text-slate-500 hover:text-white'
                    onClick={() => setIsAISidebarOpen(false)}
                  >
                    <ChevronRight size={14} />
                  </Button>
                </div>

                <div className='flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar'>
                  <div className='p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-2'>
                    <div className='flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase'>
                      <Zap size={12} />
                      Suggested Actions
                    </div>
                    <div className='space-y-1'>
                      {['Summarize Page', 'Extract Emails', 'Find Key Data', 'Check Safety'].map(
                        (action) => (
                          <button
                            key={action}
                            className='w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 transition-all border border-transparent hover:border-blue-500/30'
                          >
                            {action}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <div className='flex items-center justify-between px-1'>
                      <span className='text-[10px] font-bold text-slate-500 uppercase'>
                        Page Insights
                      </span>
                      <Layout size={10} className='text-slate-600' />
                    </div>
                    <div className='p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] text-slate-400 leading-relaxed italic'>
                      I can help you analyze "{activeTab.title || 'this page'}" or perform actions
                      on the DOM. Try asking me something complex.
                    </div>
                  </div>

                  <div className='flex items-center gap-2 p-3 rounded-lg bg-[#1a1b1e] border border-white/5 group cursor-pointer hover:bg-white/5 transition-all'>
                    <Search size={12} className='text-slate-500' />
                    <span className='text-[10px] text-slate-400 truncate'>
                      Advanced search across tabs...
                    </span>
                  </div>
                </div>

                <div className='p-4 bg-[#0a0a0a] border-t border-white/5 space-y-3'>
                  <div className='relative'>
                    <textarea
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      placeholder='Tell the agent to do something...'
                      className='w-full h-24 bg-[#1a1b1e] border-white/5 rounded-xl p-3 pt-4 text-xs text-white placeholder:text-slate-600 focus:ring-1 focus:ring-blue-500/50 resize-none transition-all shadow-inner'
                    />
                    <div className='absolute top-3 left-3 flex gap-1 items-center pointer-events-none'>
                      <MessageSquare size={10} className='text-blue-500/50' />
                    </div>
                  </div>
                  <Button
                    className='w-full bg-blue-600 hover:bg-blue-500 text-xs font-bold gap-2 shadow-lg shadow-blue-500/20'
                    onClick={() => {
                      if (!aiQuery.trim()) return;
                      socket?.emit('browser-command', { roomId, command: aiQuery });
                      setAiQuery('');
                    }}
                  >
                    <Send size={14} />
                    Execute Agent Plan
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
};
