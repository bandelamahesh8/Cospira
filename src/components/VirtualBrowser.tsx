import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, RefreshCw, Lock, ExternalLink, ChevronLeft, ChevronRight, Loader2, Smartphone, Volume2, VolumeX, Sparkles } from 'lucide-react';
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
        remoteStreams
    } = useWebSocket();

    const [inputUrl, setInputUrl] = useState(virtualBrowserUrl || '');
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [mode, setMode] = useState<'webrtc' | 'cdp'>('webrtc');
    
    const [viewport, setViewport] = useState({ width: 1920, height: 1080, isMobile: false });
    const [isMinimized, setIsMinimized] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Get the Virtual Browser Stream (Video + Audio)
    const browserStream = remoteStreams.get('virtual-browser');

    // WebRTC Stream Handling
    useEffect(() => {
        if (browserStream && videoRef.current) {
            // Prefer WebRTC if available
            setMode('webrtc');
            videoRef.current.srcObject = browserStream;
            setIsLoading(false);
            setIsConnected(true);
            toast.success('High-Res Browser Stream Connected');
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
    
    const currentUser = users.find(u => u.id === socket?.id);
    const canControl = isHost || currentUser?.isCoHost;


    // -------------------------------------------------------------------------
    // SOCKET HANDLERS (CDP FALLBACK & CONTROL)
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (!socket) return;
        
        const handleStarted = () => {
            setIsLoading(true);
        };

        const handleClosed = () => {
             setIsConnected(false);
             setIsLoading(false);
             if (videoRef.current) {
                 videoRef.current.srcObject = null;
             }
             // Clear canvas
             if (canvasRef.current) {
                 const ctx = canvasRef.current.getContext('2d');
                 ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
             }
        };

        const handleReady = (data: { stats: { viewport?: { width: number, height: number }, isMobile?: boolean } }) => {
            if (data.stats?.viewport) {
                setViewport({
                    ...data.stats.viewport,
                    isMobile: !!data.stats.isMobile
                });
            }
        };
        
        // CDP Frame Handling (Fallback)
        const handleFrame = (data: { data: string, timestamp: number }) => {
            // Switch to CDP mode if we receive frames and no WebRTC stream is active yet
            if (mode !== 'cdp' && !browserStream) {
                setMode('cdp');
                setIsConnected(true);
                setIsLoading(false);
            }

            if (canvasRef.current && data.data) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                    const img = new Image();
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
                    };
                    img.src = data.data;
                }
            }
        };

        socket.on('browser-started', handleStarted);
        socket.on('browser-closed', handleClosed);
        socket.on('virtual-browser-ready', handleReady);
        socket.on('browser-viewport-updated', (data: { width: number, height: number, isMobile: boolean }) => setViewport(data));
        socket.on('browser-frame', handleFrame);

        return () => {
            socket.off('browser-started', handleStarted);
            socket.off('browser-closed', handleClosed);
            socket.off('virtual-browser-ready', handleReady);
            socket.off('browser-viewport-updated');
            socket.off('browser-frame', handleFrame);
        };
    }, [socket, roomId, mode, browserStream]);

    // -------------------------------------------------------------------------
    // LIFECYCLE
    // -------------------------------------------------------------------------
    useEffect(() => {
        // Init browser if not connected
        if (socket && roomId && !isConnected && !browserStream) {
             socket.emit('start-virtual-browser', { roomId });
             setIsLoading(true);
        }
    }, [socket, roomId, isConnected, browserStream]);

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
            const maxW = mode === 'cdp' ? 1280 : 1920;
            const maxH = mode === 'cdp' ? 720 : 1080;
            
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
                    isMobile: isSmallDevice 
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

    }, [isConnected, socket, roomId, viewport.isMobile, viewport.width, viewport.height, mode]); 

    // -------------------------------------------------------------------------
    // INPUT HANDLING (Touch & Mouse)
    // -------------------------------------------------------------------------
    
    // Throttle ref for move events
    const lastEmitRef = useRef(0);

    const getCoordinates = useCallback((clientX: number, clientY: number, element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        
        // Raw coordinates relative to container
        const rawX = clientX - rect.left;
        const rawY = clientY - rect.top;

        // Calculate the actual rendered dimensions of the video (object-contain logic)
        const containerRatio = rect.width / rect.height;
        const browserRatio = viewport.width / viewport.height;
        
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
            y: Math.max(0, Math.min(1, y))
        };
    }, [viewport.width, viewport.height]);

    const handleInput = useCallback((e: React.MouseEvent | React.TouchEvent | React.WheelEvent) => {
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
            pointerType = 'mouse';
        } else {
             // Mouse
             const me = e as React.MouseEvent;
             clientX = me.clientX;
             clientY = me.clientY;
             if (e.type === 'mousedown') eventType = 'mousedown';
             else if (e.type === 'mouseup') eventType = 'mouseup';
             else if (e.type === 'mousemove') eventType = 'mousemove';
        }

        if (eventType === 'wheel') {
             socket.emit('browser-input', { roomId, input: { type: 'wheel', deltaX, deltaY } });
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
                pointerType
            }
        });

    }, [socket, roomId, canControl, getCoordinates]);
    
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
                    keyCode: e.keyCode 
                } 
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
    const doNavigate = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!canControl) return;
        if (!inputUrl.trim()) return;
        
        let url = inputUrl.trim();
        if (!url.startsWith('http')) {
             if (url.includes('.') && !url.includes(' ')) {
                 url = 'https://' + url;
             } else {
                 url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
             }
        }
        
        updateVirtualBrowserUrl(url); 
        socket?.emit('browser-navigate', { roomId, url });
        setIsLoading(true);
    };

    return (
        <div ref={containerRef} className={`flex flex-col w-full ${isMinimized ? 'h-auto' : 'h-full'} bg-[#0a0a0a] md:rounded-xl overflow-hidden md:shadow-2xl md:border border-white/5 transition-all duration-300 relative group/browser`} tabIndex={0}>
             {/* TOOLBAR */}
             <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-[#0F1115]/90 backdrop-blur-md border-b border-white/5 z-20">
                <div className="flex gap-1.5 md:gap-2 px-0 md:px-2 group/traffic shrink-0">
                    <button 
                        onClick={() => canControl && closeVirtualBrowser()}
                        disabled={!canControl}
                        className={`w-3.5 h-3.5 rounded-full bg-red-500/80 border border-red-600/50 flex items-center justify-center transition-all ${canControl ? 'hover:bg-red-500 cursor-pointer hover:scale-110 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'opacity-30 cursor-not-allowed grayscale'}`}
                        title="Close Browser"
                    >
                        <X size={8} className="text-black/80 opacity-0 group-hover/traffic:opacity-100 transition-opacity" />
                    </button>
                    <button 
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="w-3.5 h-3.5 rounded-full bg-amber-500/80 border border-amber-600/50 flex items-center justify-center hover:bg-amber-500 transition-all cursor-pointer hover:scale-110 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                        title={isMinimized ? "Expand" : "Minimize"}
                    >
                        <div className="w-1.5 h-0.5 bg-black/80 opacity-0 group-hover/traffic:opacity-100 transition-opacity" />
                    </button>
                    <button 
                        onClick={toggleFullscreen}
                        className="hidden md:flex w-3.5 h-3.5 rounded-full bg-emerald-500/80 border border-emerald-600/50 items-center justify-center hover:bg-emerald-500 transition-all cursor-pointer hover:scale-110 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                        title="Toggle Fullscreen"
                    >
                         <ExternalLink size={8} className="text-black/80 opacity-0 group-hover/traffic:opacity-100 transition-opacity" />
                    </button>
                </div>

                <div className="flex gap-0.5 md:gap-1 ml-1 md:ml-2 shrink-0">
                     <Button variant="ghost" size="icon" disabled={!canControl} className={`h-7 w-7 md:h-8 md:w-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all ${!canControl ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => canControl && socket?.emit('browser-input', { roomId, input: { type: 'navigate', url: 'back' }})}>
                         <ChevronLeft size={16} />
                     </Button>
                     <Button variant="ghost" size="icon" disabled={!canControl} className={`h-7 w-7 md:h-8 md:w-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all ${!canControl ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => canControl && socket?.emit('browser-input', { roomId, input: { type: 'navigate', url: 'forward' }})}>
                         <ChevronRight size={16} />
                     </Button>
                     <Button variant="ghost" size="icon" disabled={!canControl} className={`h-7 w-7 md:h-8 md:w-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all ${!canControl ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => canControl && doNavigate()}>
                         {isLoading ? <Loader2 size={14} className="animate-spin text-blue-400" /> : <RefreshCw size={14} />}
                     </Button>
                </div>

                <form onSubmit={doNavigate} className="flex-1 max-w-3xl mx-auto relative group">
                    <div className={`absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-md transition-opacity duration-500 pointer-events-none ${isLoading ? 'opacity-100' : 'opacity-0'}`} />
                    <Lock size={12} className={`hidden md:block absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${inputUrl.startsWith('https') ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <Input 
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        disabled={!canControl}
                        className={`h-8 md:h-9 bg-[#050608]/80 border-white/5 rounded-full pl-3 md:pl-10 pr-4 text-[10px] md:text-xs font-mono text-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 transition-all shadow-inner placeholder:text-slate-600 ${!canControl ? 'opacity-50 cursor-not-allowed' : ''}`}
                        placeholder={canControl ? "Search..." : "Host Only"}
                    />
                </form>

                <div className="flex items-center gap-2 ml-auto">
                    {/* Assistant Command Bar */}
                    <div className="hidden lg:flex items-center gap-2 mr-2">
                        <div className="relative group/assistant">
                            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-400 animate-pulse" />
                            <Input 
                                placeholder="Tell Assistant to..." 
                                className="h-8 w-48 bg-blue-500/5 border-blue-500/20 rounded-lg pl-8 p-3 text-[10px] font-bold uppercase tracking-wider focus:w-64 transition-all"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                                        socket?.emit('browser-command', { 
                                            roomId, 
                                            command: (e.target as HTMLInputElement).value 
                                        }, (res: { success: boolean; error?: string }) => {
                                            if (res.success) {
                                                (e.target as HTMLInputElement).value = '';
                                            }
                                        });
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`h-8 w-8 rounded-lg transition-all ${isMuted ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'}`}
                        onClick={() => setIsMuted(!isMuted)}
                        title={isMuted ? "Unmute Audio" : "Mute Audio"}
                    >
                        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </Button>
                    
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F1115] border border-white/5 rounded-full">
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            disabled={!canControl}
                            className={`h-7 w-7 rounded-md transition-all ${viewport.isMobile ? 'text-blue-400 bg-blue-400/10' : 'text-slate-400 hover:text-white'} ${!canControl ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={() => {
                                if (!canControl) return;
                                const newMobile = !viewport.isMobile;
                                const newWidth = newMobile ? 390 : 1920; 
                                const newHeight = newMobile ? 844 : 1080;
                                socket?.emit('browser-set-viewport', { roomId, width: newWidth, height: newHeight, isMobile: newMobile });
                            }}
                            title={!canControl ? "Only Host can switch view" : (viewport.isMobile ? "Switch to Desktop Mode" : "Switch to Mobile Mode")}
                        >
                             <Smartphone size={14} />
                         </Button>
                     </div>

                        <div className={`flex items-center gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-full border ${isConnected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className="hidden sm:inline text-[10px] font-bold tracking-wider">{mode === 'cdp' ? 'CLOUD' : (isConnected ? 'WEBRTC' : 'OFFLINE')}</span>
                        </div>
                </div>
             </div>

             {/* BROWSER VIEWPORT */}
             {!isMinimized && (
                 <div className="flex-1 bg-[#050608] relative flex items-center justify-center overflow-hidden cursor-default group touch-none"
                    onMouseDown={handleInput}
                    onMouseMove={handleInput}
                    onMouseUp={handleInput}
                    onMouseLeave={handleInput}
                    onTouchStart={handleInput}
                    onTouchMove={handleInput}
                    onTouchEnd={handleInput}
                    onTouchCancel={handleInput}
                    onWheel={handleInput}
                 >
                    <div className={`absolute inset-0 bg-[#050608] z-10 flex flex-col items-center justify-center transition-opacity duration-700 ${isConnected ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
                            <Loader2 size={48} className="animate-spin text-blue-500 relative z-10" />
                        </div>
                        <p className="mt-6 text-xs font-mono text-slate-500 tracking-[0.2em] animate-pulse">ESTABLISHING UPLINK...</p>
                    </div>
                    
                    <div className={`relative w-full h-full flex items-center justify-center transition-opacity duration-500 ${isLoading ? 'opacity-80 scale-[0.99] grayscale-[0.5]' : 'opacity-100 scale-100'}`}>
                        {mode === 'webrtc' ? (
                             <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted={isMuted}
                                className="max-w-full max-h-full object-contain shadow-2xl shadow-black/50 outline-none select-none" 
                                width={viewport.width}
                                height={viewport.height}
                                style={{ pointerEvents: 'none' }} 
                            />
                        ) : (
                             <canvas
                                ref={canvasRef}
                                className="max-w-full max-h-full object-contain shadow-2xl shadow-black/50 outline-none select-none"
                                width={viewport.width}
                                height={viewport.height}
                                style={{ pointerEvents: 'none' }}
                             />
                        )}
                    </div>
                 </div>
             )}
        </div>
    );
};
