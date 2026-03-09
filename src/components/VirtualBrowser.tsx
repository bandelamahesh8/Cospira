import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  X,
  Lock,
  Globe,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Smartphone,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  Wifi,
  Send,
  MessageSquare,
  Search,
  Zap,
  Layout,
  Keyboard,
} from 'lucide-react';
import { toast } from 'sonner';

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

  const [inputUrl, setInputUrl] = useState(virtualBrowserUrl || '');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [startupPhase, setStartupPhase] = useState<0 | 1 | 2>(0); // 0=init, 1=launching, 2=connecting

  const [viewport, setViewport] = useState({ width: 1920, height: 1080, isMobile: false });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [imeText, setImeText] = useState('');

  // TABS SYSTEM
  const [tabs, setTabs] = useState([
    {
      id: '1',
      url: virtualBrowserUrl || 'https://www.google.com',
      title: 'New Tab',
      isLoading: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState('1');
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get the Virtual Browser Stream (Video + Audio)
  const browserStream = remoteStreams.get('virtual-browser');

  // WebRTC Stream Handling
  useEffect(() => {
    if (browserStream && videoRef.current) {
      videoRef.current.srcObject = browserStream;
      setIsLoading(false);
      setIsConnected(true);
      toast.success('High-Res WebRTC Stream Connected');
      setStartupPhase(2);
    }
  }, [browserStream]);

  // Mute/Unmute Logic
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

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

  const currentUser = users.find((u) => u.id === socket?.id);
  const canControl = isHost || currentUser?.isCoHost;

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
  }, [socket, roomId, browserStream, isMuted]);

  // -------------------------------------------------------------------------
  // LIFECYCLE
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Browser was already started externally (via startVirtualBrowser in context).
    // Just show the loading phases — do NOT re-emit start-virtual-browser or we'll
    // cause the server to abort the in-progress navigation and restart.
    if (!isConnected && !browserStream) {
      setIsLoading(true);
      setStartupPhase(0);
      const t1 = setTimeout(() => setStartupPhase(1), 1500);
      const t2 = setTimeout(() => setStartupPhase(2), 4000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only — browser already started by parent

  // Auto-detect Client Aspect Ratio & Optimize Viewport
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

      // 3. Apply Server-Side Limits (1080p / 720p caps) to prevent encoding overload
      const maxW = 1280;
      const maxH = 720;

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
        Math.abs(targetWidth - viewport.width) > 4 || // Small buffer for minor deviations
        Math.abs(targetHeight - viewport.height) > 4 ||
        isSmallDevice !== viewport.isMobile
      ) {
        // Debounce happens naturally via ResizeObserver frequency, but we can rate limit if needed.
        // For now, direct updates provide snappiest feel on rotation.
        socket.emit('browser-set-viewport', {
          roomId,
          width: targetWidth,
          height: targetHeight,
          isMobile: isSmallDevice,
        });
      }
    };

    // Use ResizeObserver for accurate, performant element tracking
    const resizeObserver = new ResizeObserver(() => {
      // Wrap in requestAnimationFrame to avoid "ResizeObserver loop limit exceeded"
      // and to batch visual updates
      requestAnimationFrame(() => {
        optimizeViewport();
      });
    });

    resizeObserver.observe(container);

    // Immediate initial call
    optimizeViewport();

    return () => {
      resizeObserver.disconnect();
    };
  }, [isConnected, socket, roomId, viewport.isMobile, viewport.width, viewport.height]);

  // -------------------------------------------------------------------------
  // INPUT HANDLING (Touch & Mouse)
  // -------------------------------------------------------------------------

  // Throttle ref for move events
  const lastEmitRef = useRef(0);

  const getCoordinates = useCallback(
    (clientX: number, clientY: number, element: HTMLElement) => {
      const rect = element.getBoundingClientRect();

      // Raw coordinates relative to container
      const rawX = clientX - rect.left;
      const rawY = clientY - rect.top;

      // Calculate the actual rendered dimensions of the video (object-contain logic)
      const containerRatio = rect.width / rect.height;

      // Use actual rendered resolution instead of fixed viewport to prevent input drift
      const actualWidth = videoRef.current ? videoRef.current.videoWidth : viewport.width;
      const actualHeight = videoRef.current ? videoRef.current.videoHeight : viewport.height;
      const browserRatio = (actualWidth || viewport.width) / (actualHeight || viewport.height);

      let renderWidth = rect.width;
      let renderHeight = rect.height;
      let offsetX = 0;
      let offsetY = 0;

      if (containerRatio > browserRatio) {
        // Container is wider -> Pillarboxing (black bars on L/R)
        renderWidth = rect.height * browserRatio;
        offsetX = (rect.width - renderWidth) / 2;
      } else {
        // Container is taller -> Letterboxing (black bars on T/B)
        renderHeight = rect.width / browserRatio;
        offsetY = (rect.height - renderHeight) / 2;
      }

      // Normalize coordinates relative to the VALID rendered video area
      const x = (rawX - offsetX) / renderWidth;
      const y = (rawY - offsetY) / renderHeight;

      return {
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
      };
    },
    [viewport.width, viewport.height]
  );

  const handleInput = useCallback(
    (e: React.MouseEvent | React.TouchEvent | React.WheelEvent) => {
      if (!socket || !roomId || !canControl) return;

      // Focus container for keyboard events
      if (e.type === 'mousedown' || e.type === 'touchstart') {
        containerRef.current?.focus();
      }

      let eventType = '';
      let clientX = 0;
      let clientY = 0;
      let pointerType = 'mouse';
      let deltaX = 0;
      let deltaY = 0;

      if ('touches' in e) {
        const touch = e.touches[0] || e.changedTouches[0];
        if (!touch) return;
        clientX = touch.clientX;
        clientY = touch.clientY;
        pointerType = 'touch';

        if (e.type === 'touchstart') eventType = 'mousedown';
        else if (e.type === 'touchend' || e.type === 'touchcancel') eventType = 'mouseup';
        else eventType = 'mousemove';
      } else if ('deltaX' in e) {
        eventType = 'wheel';
        deltaX = (e as React.WheelEvent).deltaX;
        deltaY = (e as React.WheelEvent).deltaY;
        clientX = (e as React.WheelEvent).clientX;
        clientY = (e as React.WheelEvent).clientY;
        pointerType = 'mouse';
      } else {
        // Mouse
        const me = e as React.MouseEvent;
        clientX = me.clientX;
        clientY = me.clientY;
        if (e.type === 'mousedown') eventType = 'mousedown';
        else if (e.type === 'mouseup' || e.type === 'mouseleave') eventType = 'mouseup';
        else if (e.type === 'mousemove') eventType = 'mousemove';
      }

      if (eventType === 'wheel') {
        const coords = getCoordinates(clientX, clientY, e.currentTarget as HTMLElement);
        socket.emit('browser-input', {
          roomId,
          input: { type: 'wheel', deltaX, deltaY, x: coords.x, y: coords.y },
        });
        return;
      }

      // Throttling for move events to prevent socket flooding (30fps cap)
      if (eventType === 'mousemove') {
        const now = Date.now();
        if (now - lastEmitRef.current < 33) return;
        lastEmitRef.current = now;
      }

      const coords = getCoordinates(clientX, clientY, e.currentTarget as HTMLElement);

      socket.emit('browser-input', {
        roomId,
        input: {
          type: eventType,
          x: coords.x,
          y: coords.y,
          pointerType,
        },
      });
    },
    [socket, roomId, canControl, getCoordinates]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!socket || !roomId || !canControl) return;
      const coords = getCoordinates(e.clientX, e.clientY, e.currentTarget as HTMLElement);
      socket.emit('browser-input', {
        roomId,
        input: {
          type: 'dblclick',
          x: coords.x,
          y: coords.y,
          pointerType: 'mouse',
        },
      });
    },
    [socket, roomId, canControl, getCoordinates]
  );

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
        url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
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
    const url = 'https://www.google.com';
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

  return (
    <div
      ref={containerRef}
      className={`flex flex-col w-full ${isMinimized ? 'h-auto' : 'h-full'} bg-[#0a0a0a] md:rounded-xl overflow-hidden md:shadow-2xl md:border border-white/5 transition-all duration-300 relative group/browser`}
      tabIndex={0}
    >
      {/* TABS BAR */}
      {!isMinimized && (
        <div className='flex items-center gap-1 px-3 pt-2 bg-[#0F1115] border-b border-white/5 overflow-x-auto no-scrollbar group/tabs'>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => {
                if (!canControl) return;
                setActiveTabId(tab.id);
                setInputUrl(tab.url);
                socket?.emit('browser-switch-tab', { roomId, tabId: tab.id });
              }}
              className={`flex items-center gap-2 px-3 py-2 min-w-[120px] max-w-[200px] rounded-t-lg text-[10px] font-medium transition-all cursor-pointer relative group/tab ${activeTabId === tab.id ? 'bg-[#0a0a0a] text-blue-400 shadow-[0_-2px_10px_rgba(59,130,246,0.1)]' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}
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
      <div className='flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-[#0a0a0a] border-b border-white/5 z-20'>
        <div className='flex gap-1.5 md:gap-2 px-0 md:px-1 shrink-0'>
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
            disabled={!canControl || !viewport.isMobile}
            className={`h-8 w-8 transition-all ${isKeyboardOpen ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
            onClick={() => canControl && setIsKeyboardOpen(!isKeyboardOpen)}
          >
            <Keyboard size={16} />
          </Button>
        </div>

        <form onSubmit={(e) => doNavigate(e)} className='flex-1 max-w-4xl mx-auto relative group'>
          <div className='absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2'>
            {inputUrl.startsWith('https') ? (
              <Lock size={12} className='text-emerald-500' />
            ) : (
              <Globe size={12} className='text-slate-500' />
            )}
          </div>
          <Input
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            disabled={!canControl}
            className='h-9 bg-[#1a1b1e] border-white/5 rounded-full pl-10 pr-4 text-xs font-medium text-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500/50 transition-all shadow-lg'
            placeholder='Search or enter URL'
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

          <Button
            variant='ghost'
            size='icon'
            className={`h-8 w-8 rounded-lg transition-all ${isMuted ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'}`}
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
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

      {/* BROWSER VIEWPORT */}
      {!isMinimized && (
        <div
          className='flex-1 bg-[#050608] relative flex items-center justify-center overflow-hidden cursor-default group touch-none'
          onMouseDown={handleInput}
          onMouseMove={handleInput}
          onMouseUp={handleInput}
          onMouseLeave={handleInput}
          onDoubleClick={handleDoubleClick}
          onTouchStart={handleInput}
          onTouchMove={handleInput}
          onTouchEnd={handleInput}
          onTouchCancel={handleInput}
          onWheel={handleInput}
        >
          {/* Loading / Startup overlay — shows while not connected */}
          {(!isConnected || isLoading) && (
            <div className='absolute inset-0 bg-[#050608] z-10 flex flex-col items-center justify-center gap-8'>
              {/* Animated globe icon */}
              <div className='relative w-24 h-24 flex items-center justify-center'>
                <div className='absolute inset-0 rounded-full bg-blue-500/10 animate-ping' />
                <div className='absolute inset-2 rounded-full bg-blue-500/5 border border-blue-500/20' />
                <Globe size={40} className='text-blue-400 relative z-10 animate-pulse' />
              </div>

              {/* Phase steps */}
              <div className='flex flex-col gap-3 min-w-[220px]'>
                {(
                  [
                    { label: 'Initialising Browser Engine', phase: 0 },
                    { label: 'Launching Virtual Browser', phase: 1 },
                    { label: 'Connecting Stream', phase: 2 },
                  ] as const
                ).map(({ label, phase: p }) => (
                  <div
                    key={p}
                    className={`flex items-center gap-3 transition-all duration-500 ${
                      startupPhase > p
                        ? 'opacity-100'
                        : startupPhase === p
                          ? 'opacity-100'
                          : 'opacity-30'
                    }`}
                  >
                    <div className='w-5 h-5 flex items-center justify-center shrink-0'>
                      {startupPhase > p ? (
                        <CheckCircle2 size={16} className='text-emerald-400' />
                      ) : startupPhase === p ? (
                        <Loader2 size={16} className='text-blue-400 animate-spin' />
                      ) : (
                        <div className='w-3 h-3 rounded-full border border-white/20' />
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-mono tracking-widest uppercase ${
                        startupPhase > p
                          ? 'text-emerald-400'
                          : startupPhase === p
                            ? 'text-blue-300'
                            : 'text-slate-600'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* WebRTC connecting sub-label */}
              {startupPhase === 2 && (
                <div className='flex items-center gap-2 text-slate-500 text-[10px] font-mono animate-pulse'>
                  <Wifi size={12} />
                  <span>ESTABLISHING WEBRTC UPLINK...</span>
                </div>
              )}
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
                className='max-w-full max-h-full object-contain shadow-2xl shadow-black/50 outline-none select-none'
                width={viewport.width}
                height={viewport.height}
                style={{ pointerEvents: 'none' }}
              />

              {/* OSK / VIRTUAL KEYBOARD OVERLAY */}
              {isKeyboardOpen && viewport.isMobile && canControl && (
                <div className='absolute bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-[400px] bg-[#1a1b1e]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl flex flex-col gap-3 animate-in slide-in-from-bottom-10 pointer-events-auto'>
                  <div className='flex items-center justify-between px-1'>
                    <span className='text-xs font-bold text-slate-300 uppercase tracking-wider'>
                      Virtual Keyboard
                    </span>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-6 w-6 text-slate-500 hover:text-white'
                      onClick={() => setIsKeyboardOpen(false)}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                  <div className='flex gap-2'>
                    <Input
                      value={imeText}
                      onChange={(e) => setImeText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          socket?.emit('browser-input', {
                            roomId,
                            input: { type: 'insertText', text: imeText },
                          });
                          socket?.emit('browser-input', {
                            roomId,
                            input: { type: 'keydown', key: 'Enter' },
                          });
                          socket?.emit('browser-input', {
                            roomId,
                            input: { type: 'keyup', key: 'Enter' },
                          });
                          setImeText('');
                        }
                      }}
                      placeholder='Type text to send...'
                      className='h-10 bg-[#0a0a0a] border-white/10 text-sm focus-visible:ring-1 focus-visible:ring-blue-500/50 flex-1'
                    />
                    <Button
                      variant='secondary'
                      className='h-10 px-4 bg-blue-600 hover:bg-blue-500 text-white shadow-lg font-bold'
                      onClick={() => {
                        if (imeText) {
                          socket?.emit('browser-input', {
                            roomId,
                            input: { type: 'insertText', text: imeText },
                          });
                          setImeText('');
                        }
                        // Always send enter to trigger search/submit in UI
                        socket?.emit('browser-input', {
                          roomId,
                          input: { type: 'keydown', key: 'Enter' },
                        });
                        socket?.emit('browser-input', {
                          roomId,
                          input: { type: 'keyup', key: 'Enter' },
                        });
                      }}
                    >
                      ENT
                    </Button>
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      variant='secondary'
                      className='h-8 flex-1 bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-medium'
                      onClick={() => {
                        if (imeText) {
                          socket?.emit('browser-input', {
                            roomId,
                            input: { type: 'insertText', text: imeText },
                          });
                          setImeText('');
                        }
                      }}
                    >
                      <Send size={12} className='mr-1 inline-block' /> Insert Only
                    </Button>
                    <Button
                      variant='secondary'
                      className='h-8 flex-1 bg-red-500/10 hover:bg-red-500/20 text-xs text-red-200 font-medium'
                      onClick={() => {
                        socket?.emit('browser-input', {
                          roomId,
                          input: { type: 'keydown', key: 'Backspace' },
                        });
                        socket?.emit('browser-input', {
                          roomId,
                          input: { type: 'keyup', key: 'Backspace' },
                        });
                      }}
                    >
                      <X size={12} className='mr-1 inline-block' /> BACKSPACE
                    </Button>
                  </div>
                </div>
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
  );
};
