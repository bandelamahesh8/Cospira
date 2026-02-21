import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    PhoneOff,
    MonitorOff, 
    MonitorUp,
    MessageSquare,
    Globe,
    Search,
    ArrowRight,
    Upload,
    Trash2,
    Youtube,
    FileText,
    MoreHorizontal,
    Gamepad2,
    X,
    UserPlus,
    Disc,
    Square,
} from 'lucide-react';
import { TERMINOLOGY } from '@/utils/terminology';
import { trackFeatureUsage, Features } from '@/utils/featureHygiene';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
// GameSelector removed, handled via props

import { motion, AnimatePresence } from 'framer-motion';
import { NeuralInformer } from '@/components/intelligence';

interface RoomControlsProps {
    roomId: string;
    roomName: string | null;
    participantCount: number;
    isAudioEnabled: boolean;
    toggleAudio: () => void;
    isVideoEnabled: boolean;
    toggleVideo: () => void;
    isScreenSharing: boolean;
    handleToggleScreenShare: () => void;
    canShareScreen: boolean;
    youtubeVideoId: string | null;
    setShowOTTModal: (show: boolean) => void;
    isRecording: boolean;
    startRecording: () => void;
    stopRecording: () => void;
    isHost: boolean;
    isCoHost?: boolean;
    setShowDisbandConfirm: (show: boolean) => void;
    handleLeaveRoom: () => void;

    showChat: boolean;
    setShowChat: (show: boolean) => void;
    showStopShareConfirm: boolean;
    setShowStopShareConfirm: (show: boolean) => void;
    confirmStopShare: () => void;
    showDisbandConfirm: boolean;
    disbandRoom: () => void;

    stopYoutubeVideo: () => void;
    unreadCount: number;
    isVisible: boolean;
    setIsVisible: (visible: boolean) => void;
    onStartBrowserWithUrl: (url: string) => void;
    onFileSelected?: (file: File) => void;
    isGuest?: boolean;
    waitingUserCount?: number;
    onGenerateSummary?: () => void;
    onInvite?: () => void;
    endSession?: () => void;
    onStartYouTube?: (videoId: string) => void;
    isGameActive?: boolean;
    onOpenGameHub?: () => void;
    onOpenAbandonModal?: () => void;

    // Mode Capabilities
    gamesEnabled?: boolean;
    aiEnabled?: boolean;
    securityLevel?: 'low' | 'medium' | 'high';
    virtualBrowserEnabled?: boolean;
    screenShareEnabled?: boolean;
    youtubeEnabled?: boolean;
    fileUploadEnabled?: boolean;
    recordingEnabled?: boolean;
    inviteEnabled?: boolean;
}

interface ControlButtonProps {
    active?: boolean;
    activeColor?: string;
    defaultColor?: string;
    icon: React.ElementType;
    onClick?: () => void;
    tooltip: string;
    badge?: React.ReactNode;
    danger?: boolean;
    size?: 'normal' | 'large';
    className?: string;
}

const RoomControls: React.FC<RoomControlsProps> = ({
    isAudioEnabled,
    toggleAudio,
    isVideoEnabled,
    toggleVideo,
    isScreenSharing,
    handleToggleScreenShare,
    showChat,
    setShowChat,
    showStopShareConfirm,
    setShowStopShareConfirm,
    confirmStopShare,
    showDisbandConfirm,
    setShowDisbandConfirm,
    disbandRoom,
    unreadCount,
    isVisible,
    setIsVisible,
    onStartBrowserWithUrl,
    isHost,
    handleLeaveRoom,
    isGameActive,
    onOpenGameHub,
    onOpenAbandonModal,
    isCoHost = false,
    isRecording,
    startRecording,
    stopRecording,
    gamesEnabled = true,
    aiEnabled = true,
    securityLevel = 'medium',
    virtualBrowserEnabled = true,
    screenShareEnabled = true,
    youtubeEnabled = true,
    fileUploadEnabled = true,
    recordingEnabled = true,
    inviteEnabled = true,
    ...props
}) => {
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlInputValue, setUrlInputValue] = useState('');
    const [showYoutubeInput, setShowYoutubeInput] = useState(false);
    const [youtubeInputValue, setYoutubeInputValue] = useState('');
    
    // Disband Flow State
    const [isDisbandConfirming, setIsDisbandConfirming] = useState(false);
    const [disbandInput, setDisbandInput] = useState('');
    const [isTerminating, setIsTerminating] = useState(false);

    // Reset disband state when modal closes
    useEffect(() => {
        if (!showDisbandConfirm) {
            setIsDisbandConfirming(false);
            setDisbandInput('');
            setIsTerminating(false);
        }
    }, [showDisbandConfirm]);

    const handleDisbandRequest = () => {
        setIsDisbandConfirming(true);
    };

    const handleFinalDisband = () => {
        if (disbandInput !== 'DISBAND') return;
        setIsTerminating(true);
        // Artificial delay for "Terminating..." feel
        setTimeout(() => {
            disbandRoom();
        }, 1500); 
    };

    const handleUrlSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        let target = urlInputValue.trim();
        const hasProtocol = /^https?:\/\//i.test(target);
        const hasDomain = /\.[a-z]{2,}$/i.test(target);
        if (!hasProtocol && !hasDomain) {
            target = `https://duckduckgo.com/?q=${encodeURIComponent(target)}`;
        } else if (!hasProtocol) {
            target = `https://${target}`;
        }
        onStartBrowserWithUrl(target);
        setShowUrlInput(false);
        setUrlInputValue('');
    };

    const handleYoutubeSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const rawInput = youtubeInputValue.trim();
        // pre-clean: split by '?' and '#' to discard all query/hash data immediately
        const input = rawInput.split(/[?#]/)[0]; 

        let videoId: string | null = null;
        
        // Strategy 1: Check if input is just the ID (11 chars, alphanumeric)
        if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
            videoId = input;
        } else {
             // Strategy 2: URL parsing
             try {
                const urlStr = input.startsWith('http') ? input : `https://${input}`;
                const urlObj = new URL(urlStr);
                const path = urlObj.pathname;
                
                if (urlObj.hostname.includes('youtu.be')) {
                    videoId = path.slice(1);
                } else if (urlObj.hostname.includes('youtube.com')) {
                    if (path.startsWith('/shorts/')) videoId = path.split('/shorts/')[1];
                    else if (path.startsWith('/live/')) videoId = path.split('/live/')[1];
                    else if (path.startsWith('/embed/')) videoId = path.split('/embed/')[1];
                    else if (path.startsWith('/v/')) videoId = path.split('/v/')[1];
                    else {
                         // For standard watch urls, the ID is in the 'v' search param of the ORIGINAL raw input
                         // But since we stripped it in 'input', we need to check rawInput for this specific case
                         // OR just use URL on rawInput for this case.
                         // Let's use URL on rawInput for standard links logic:
                         try {
                             const rawUrl = new URL(rawInput.startsWith('http') ? rawInput : `https://${rawInput}`);
                             videoId = rawUrl.searchParams.get('v');
                         } catch {
                             // ignore
                         }
                    }
                }
             } catch {
                 // Fallback to simpler regex
                 const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]*).*/;
                 const match = rawInput.match(regExp);
                 if (match && match[2]) {
                     videoId = match[2];
                 }
             }
        }
        
        // Final Sanitize: Ensure strictly 11 chars, alphanumeric
        if (videoId) {
            const cleanId = videoId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 11);
            if (cleanId.length === 11) {
                props.onStartYouTube?.(cleanId);
                setShowYoutubeInput(false);
                setYoutubeInputValue('');
                return;
            }
        }
    };

    useEffect(() => {
        const resetHideTimeout = () => {
            setIsVisible(true);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = setTimeout(() => {
                setIsVisible(false);
            }, 5000);
        };
        const handleMouseMove = (e: MouseEvent) => {
             if (e.clientY > window.innerHeight * 0.85) resetHideTimeout();
        };
        const handleTouch = () => resetHideTimeout();
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchstart', handleTouch);
        resetHideTimeout();
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchstart', handleTouch);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        };
    }, [setIsVisible]);

    // Button Helper for Consistency
    const ControlButton = ({ 
        active, 
        activeColor = 'bg-white/10 text-white', 
        defaultColor = 'bg-white/5 text-slate-400 hover:text-white', 
        icon: Icon, 
        onClick, 
        tooltip, 
        badge,
        danger = false,
        size = 'normal',
        className = ''
    }: ControlButtonProps) => {
        const baseClass = "rounded-xl md:rounded-full flex items-center justify-center relative transition-all duration-200 active:scale-95";
        const sizeClass = size === 'large' ? "w-11 h-11 md:w-14 md:h-14" : "w-10 h-10 md:w-12 md:h-12";
        const colorClass = active 
            ? activeColor 
            : (danger ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : defaultColor);
            
        // Desktop uses hover scale, mobile assumes no hover
        const hoverClass = "md:hover:scale-105 md:hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]";

        return (
            <NeuralInformer 
                title={tooltip} 
                description={`Access the ${tooltip.toLowerCase()} protocol. This sector command allows for real-time interaction with the room mesh and its neural sub-systems.`}
            >
                <button onClick={onClick} className={`${baseClass} ${sizeClass} ${colorClass} ${hoverClass} ${className}`}>
                    <Icon strokeWidth={2.5} size={size === 'large' ? 24 : 20} className={size === 'large' ? 'md:w-6 md:h-6' : 'md:w-5 md:h-5'} />
                    {badge}
                    {active && !danger && <div className="absolute top-0 right-0 w-2 h-2 md:w-3 md:h-3 bg-emerald-500 rounded-full border border-black animate-pulse" />}
                </button>
            </NeuralInformer>
        );
    };

    return (
        <>
            <AnimatePresence>
                {isVisible && (
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                        className="fixed bottom-4 md:bottom-8 left-0 right-0 z-[100] px-4 pointer-events-none safe-bottom flex justify-center"
                    >
                        <div className={`luxury-glass bg-black/80 backdrop-blur-3xl rounded-2xl md:rounded-full p-2 md:px-6 md:py-3 flex items-center gap-2 md:gap-6 pointer-events-auto shadow-2xl transition-colors duration-500 ${
                            securityLevel === 'high' ? 'border border-red-500/30 shadow-red-900/20' : 'border border-white/5 shadow-black/80'
                        }`}>
                            
                            <TooltipProvider delayDuration={0}>
                                {/* GROUP 1: COMM (Critical) */}
                                <div className="flex items-center gap-2 md:gap-3">
                                    <ControlButton 
                                        icon={isAudioEnabled ? Mic : MicOff} 
                                        active={isAudioEnabled} 
                                        danger={!isAudioEnabled}
                                        onClick={toggleAudio}
                                        tooltip={isAudioEnabled ? "Mute Mic" : "Unmute"}
                                        size="large"
                                    />
                                    <ControlButton 
                                        icon={isVideoEnabled ? Video : VideoOff} 
                                        active={isVideoEnabled}
                                        danger={!isVideoEnabled}
                                        onClick={toggleVideo}
                                        tooltip={isVideoEnabled ? "Stop Video" : "Start Video"}
                                        size="large"
                                    />
                                </div>

                                {/* GROUP 2: CONTEXT (Chat) - Mobile Visible */}
                                <div className="flex items-center gap-2 md:gap-3 md:border-l md:border-white/10 md:pl-4">
                                     <ControlButton 
                                        icon={MessageSquare}
                                        active={showChat}
                                        activeColor="bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                                        onClick={() => setShowChat(!showChat)}
                                        tooltip="Chat"
                                        badge={(unreadCount > 0 || (props.waitingUserCount || 0) > 0) && (
                                            <div className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center border border-black">
                                                {unreadCount + (props.waitingUserCount || 0)}
                                            </div>
                                        )}
                                    />
                                </div>

                                {/* GROUP 3: SHARE & TOOLS (Desktop Visible / Mobile Hidden) */}
                                <div className="hidden md:flex items-center gap-3 border-l border-white/10 pl-4">
                                    {inviteEnabled && props.onInvite && (
                                        <ControlButton 
                                            icon={UserPlus}
                                            onClick={props.onInvite}
                                            tooltip="Invite"
                                        />
                                    )}
                                    {isHost && (
                                        <>
                                            {screenShareEnabled && (
                                                <ControlButton 
                                                    icon={isScreenSharing ? MonitorOff : MonitorUp}
                                                    active={isScreenSharing}
                                                    activeColor="bg-purple-500/20 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                                                    onClick={isScreenSharing ? confirmStopShare : () => { trackFeatureUsage(Features.SCREEN_SHARE); handleToggleScreenShare(); }}
                                                    tooltip={isScreenSharing ? "Stop Share" : "Share Screen"}
                                                />
                                            )}
                                            {fileUploadEnabled && (
                                                <ControlButton 
                                                    icon={Upload}
                                                    onClick={() => document.getElementById('room-file-upload')?.click()}
                                                    tooltip="Upload File"
                                                />
                                            )}
                                            {recordingEnabled && (
                                                <ControlButton 
                                                    icon={isRecording ? Square : Disc}
                                                    active={isRecording}
                                                    activeColor="bg-red-500/20 text-red-500 animate-pulse"
                                                    onClick={isRecording ? stopRecording : startRecording}
                                                    tooltip={isRecording ? "Stop Rec" : "Record"}
                                                />
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="hidden md:flex items-center gap-3 border-l border-white/10 pl-4">
                                     {isHost && (
                                         <>
                                            {virtualBrowserEnabled && (
                                                <ControlButton 
                                                    icon={Globe}
                                                    onClick={() => { trackFeatureUsage(Features.VIRTUAL_BROWSER); setShowUrlInput(true); }}
                                                    tooltip="Browser"
                                                />
                                            )}
                                             {youtubeEnabled && (
                                                <ControlButton 
                                                    icon={Youtube}
                                                    onClick={() => { trackFeatureUsage(Features.YOUTUBE_SYNC); setShowYoutubeInput(true); }}
                                                    tooltip="Sync YouTube"
                                                    active={!!props.youtubeVideoId}
                                                    activeColor="bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                                                />
                                             )}
                                             {(isHost || isCoHost) && gamesEnabled && (
                                                <div className="shrink-0 scale-90 opacity-80 hover:opacity-100 transition-opacity">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button 
                                                                onClick={() => isGameActive ? onOpenAbandonModal?.() : onOpenGameHub?.()}
                                                                disabled={isGameActive && !isHost}
                                                                className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-full flex items-center justify-center transition-all active:scale-95 group relative overflow-hidden ${isGameActive ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5 border border-white/10 hover:bg-white/10'} ${isGameActive && !isHost ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-500/20'}`}
                                                            >
                                                                <div className={`absolute inset-0 bg-gradient-to-r ${isGameActive ? 'from-red-500/0 via-red-500/5 to-red-500/0' : 'from-primary/0 via-primary/5 to-primary/0'} translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000`} />
                                                                {isGameActive ? (
                                                                    isHost ? (
                                                                        <X className="w-4 h-4 md:w-5 md:h-5 text-red-500 animate-pulse relative z-10" />
                                                                    ) : (
                                                                        <Gamepad2 className="w-4 h-4 md:w-5 md:h-5 text-red-400 relative z-10" />
                                                                    )
                                                                ) : (
                                                                    <Gamepad2 className="w-4 h-4 md:w-5 md:h-5 text-purple-400 relative z-10 group-hover:scale-110 transition-transform" />
                                                                )}
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="luxury-glass text-[8px] md:text-[10px] font-black uppercase tracking-widest px-4 py-2 border-white/10">
                                                            {isGameActive ? (isHost ? 'Terminate Arena' : 'Battle In Progress') : 'Gaming Hub'}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                             )}
                                         </>
                                     )}
                                     {aiEnabled && (
                                         <ControlButton 
                                            icon={FileText}
                                            onClick={() => { trackFeatureUsage(Features.AI_SUMMARY); props.onGenerateSummary?.(); }}
                                            tooltip="AI Summary"
                                        />
                                     )}
                                </div>

                                {/* GROUP 4: TERMINATE (End) */}
                                <div className="hidden md:flex items-center gap-3 border-l border-white/10 pl-4 ml-2">
                                     <ControlButton 
                                        icon={isHost ? Trash2 : PhoneOff}
                                        danger
                                        onClick={() => isHost ? setShowDisbandConfirm(true) : handleLeaveRoom()}
                                        tooltip={isHost ? "Disband Room" : "Leave"}
                                    />
                                </div>


                                {/* MOBILE MENU (The 'More' Button) */}
                                <div className="md:hidden flex items-center border-l border-white/10 pl-2 ml-1">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="w-10 h-10 rounded-xl bg-white/5 text-slate-400 flex items-center justify-center active:scale-95 transition-all">
                                                <MoreHorizontal size={20} />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent side="top" align="center" className="w-64 bg-[#0B0F14] border-white/10 text-slate-200 p-2 mb-2 rounded-2xl shadow-xl backdrop-blur-xl">
                                            <DropdownMenuLabel className="text-xs uppercase text-slate-500 font-bold tracking-widest px-2 py-1">Sharing</DropdownMenuLabel>
                                            
                                            {screenShareEnabled && (
                                                <DropdownMenuItem onSelect={() => isScreenSharing ? confirmStopShare() : handleToggleScreenShare()} className="flex items-center gap-3 p-3 rounded-xl focus:bg-white/10 cursor-pointer">
                                                    <MonitorUp size={18} className="text-purple-400" />
                                                    <span className="font-medium text-sm">{isScreenSharing ? "Stop Sharing" : "Share Screen"}</span>
                                                </DropdownMenuItem>
                                            )}
                                            
                                            {fileUploadEnabled && (
                                                <DropdownMenuItem onSelect={() => document.getElementById('room-file-upload')?.click()} className="flex items-center gap-3 p-3 rounded-xl focus:bg-white/10 cursor-pointer">
                                                    <Upload size={18} className="text-blue-400" />
                                                    <span className="font-medium text-sm">Upload File</span>
                                                </DropdownMenuItem>
                                            )}

                                            <DropdownMenuSeparator className="bg-white/10 my-1" />
                                            <DropdownMenuLabel className="text-xs uppercase text-slate-500 font-bold tracking-widest px-2 py-1">Tools</DropdownMenuLabel>
                                            
                                            {virtualBrowserEnabled && (
                                                <DropdownMenuItem onSelect={() => setShowUrlInput(true)} className="flex items-center gap-3 p-3 rounded-xl focus:bg-white/10 cursor-pointer">
                                                    <Globe size={18} className="text-emerald-400" />
                                                    <span className="font-medium text-sm">Virtual Browser</span>
                                                </DropdownMenuItem>
                                            )}
                                            
                                            {aiEnabled && (
                                                <DropdownMenuItem onSelect={() => props.onGenerateSummary?.()} className="flex items-center gap-3 p-3 rounded-xl focus:bg-white/10 cursor-pointer">
                                                    <FileText size={18} className="text-yellow-400" />
                                                    <span className="font-medium text-sm">AI Summary</span>
                                                </DropdownMenuItem>
                                            )}

                                            <DropdownMenuSeparator className="bg-white/10 my-1" />
                                            
                                            <DropdownMenuItem 
                                                onSelect={() => isHost ? setShowDisbandConfirm(true) : handleLeaveRoom()} 
                                                className="flex items-center gap-3 p-3 rounded-xl focus:bg-red-500/10 text-red-500 focus:text-red-500 cursor-pointer"
                                            >
                                                {isHost ? <Trash2 size={18} /> : <PhoneOff size={18} />}
                                                <span className="font-bold text-sm">{isHost ? "End Session" : "Leave Room"}</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </TooltipProvider>

                            {/* Hidden File Input */}
                             <input 
                                type="file" 
                                id="room-file-upload" 
                                className="hidden" 
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) props.onFileSelected?.(file);
                                }}
                            />

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Dialogs */}
            <AlertDialog open={showStopShareConfirm} onOpenChange={setShowStopShareConfirm}>
                <AlertDialogContent className="luxury-glass border-white/5 p-12 rounded-[3.5rem] bg-black/80 backdrop-blur-3xl">
                    <AlertDialogHeader className="mb-8">
                        <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-3xl flex items-center justify-center mb-8">
                           <MonitorOff className="w-10 h-10 text-primary" />
                        </div>
                        <AlertDialogTitle className="text-4xl font-black uppercase italic tracking-tighter text-white">Stop Share Protocol?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400 font-medium pt-4">
                            Terminate current subspace projection? This will disconnect vision for all members.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-4">
                        <AlertDialogCancel className="h-16 rounded-3xl border-white/10 bg-white/5 text-white/50 uppercase font-black text-[10px] tracking-widest hover:bg-white/10">Abort</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmStopShare} className="h-16 rounded-3xl btn-luxury uppercase font-black text-[10px] tracking-widest shadow-[0_10px_30px_rgba(0,200,255,0.3)]">Establish Terminate</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showDisbandConfirm} onOpenChange={setShowDisbandConfirm}>
                <AlertDialogContent className="luxury-glass border-white/5 p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] bg-black/90 backdrop-blur-3xl max-w-lg">
                    <AnimatePresence mode="wait">
                        {!isDisbandConfirming ? (
                            <motion.div
                                key="stage1"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                <AlertDialogHeader className="mb-8 text-center sm:text-left">
                                    <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mb-6 mx-auto sm:mx-0">
                                       <Trash2 className="w-10 h-10 text-red-500" />
                                    </div>
                                    <AlertDialogTitle className="text-3xl font-black uppercase tracking-tighter text-red-500 mb-2 italic">Critical Zone</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-400 text-sm font-medium leading-relaxed">
                                        This will permanently destroy the room for all participants. Existing links will be severed immediately.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-col sm:flex-row gap-3 sm:gap-4 sm:space-x-0 w-full">
                                    <AlertDialogCancel className="w-full sm:w-auto h-14 sm:h-16 px-8 rounded-2xl md:rounded-3xl bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white uppercase font-black text-[10px] tracking-widest soft-transition order-2 sm:order-1">
                                        Cancel
                                    </AlertDialogCancel>
                                    
                                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto order-1 sm:order-2">
                                        <button 
                                            onClick={handleDisbandRequest}
                                            className="w-full sm:w-auto h-14 sm:h-16 px-6 rounded-2xl md:rounded-3xl bg-red-500 text-white shadow-[0_10px_30px_rgba(239,68,68,0.3)] uppercase font-black text-[10px] tracking-widest hover:bg-red-600 soft-transition"
                                        >
                                            {TERMINOLOGY.DISBAND_ROOM}
                                        </button>
                                    </div>
                                </AlertDialogFooter>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="stage2"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="space-y-6"
                            >
                                <div className="text-center sm:text-left">
                                    <h3 className="text-2xl font-black uppercase tracking-tighter text-red-500 italic mb-2">Final Confirmation</h3>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                                        Type <span className="text-white bg-white/10 px-1 rounded">DISBAND</span> to confirm destruction.
                                    </p>
                                </div>

                                <Input
                                    value={disbandInput}
                                    onChange={(e) => setDisbandInput(e.target.value.toUpperCase())}
                                    placeholder="DISBAND"
                                    className="h-14 bg-red-500/10 border-red-500/30 text-red-500 placeholder:text-red-500/30 text-center text-lg font-bold tracking-[0.2em] rounded-2xl focus:border-red-500 focus:ring-red-500/20 uppercase"
                                    autoComplete="off"
                                />

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Button 
                                        onClick={() => setIsDisbandConfirming(false)}
                                        className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 uppercase font-black text-[10px] tracking-widest"
                                        disabled={isTerminating}
                                    >
                                        Back
                                    </Button>
                                    <Button 
                                        onClick={handleFinalDisband}
                                        disabled={disbandInput !== 'DISBAND' || isTerminating}
                                        className={`flex-[2] h-14 rounded-2xl uppercase font-black text-[10px] tracking-widest transition-all ${
                                            disbandInput === 'DISBAND' 
                                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_30px_rgba(220,38,38,0.5)]' 
                                            : 'bg-white/5 text-white/20 cursor-not-allowed'
                                        }`}
                                    >
                                        {isTerminating ? (
                                            <span className="flex items-center gap-2 animate-pulse">
                                                <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}/>
                                                <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}/>
                                                <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}/>
                                                Terminating...
                                            </span>
                                        ) : (
                                            "Confirm Disband"
                                        )}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </AlertDialogContent>
            </AlertDialog>

            {/* Quick Browse Dialog */}
            <Dialog open={showUrlInput} onOpenChange={setShowUrlInput}>
                <DialogContent className="luxury-glass border-white/5 p-8 rounded-[2rem] bg-black/90 backdrop-blur-3xl max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2">Initialize Browse Protocol</DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs font-medium uppercase tracking-widest">
                            Enter Target URL or Search Query
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUrlSubmit} className="mt-6 space-y-6">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-white/30 group-focus-within:text-primary transition-colors" />
                            </div>
                            <Input
                                value={urlInputValue}
                                onChange={(e) => setUrlInputValue(e.target.value)}
                                placeholder="google.com or 'search query'"
                                className="h-14 pl-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-primary/20 text-lg font-medium"
                                autoFocus
                            />
                        </div>
                        <DialogFooter>
                            <Button 
                                type="submit" 
                                className="w-full h-14 rounded-xl bg-primary text-background font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-[0_0_30px_rgba(0,200,255,0.3)]"
                            >
                                <span className="mr-2">Execute Launch</span>
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* YouTube Input Dialog */}
            <Dialog open={showYoutubeInput} onOpenChange={setShowYoutubeInput}>
                <DialogContent className="luxury-glass border-white/5 p-8 rounded-[2rem] bg-black/90 backdrop-blur-3xl max-w-lg">
                     <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-red-500 mb-2">Sync YouTube Node</DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs font-medium uppercase tracking-widest">
                            Enter YouTube URL to synchronize playback
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleYoutubeSubmit} className="mt-6 space-y-6">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Youtube className="h-5 w-5 text-red-500/50 group-focus-within:text-red-500 transition-colors" />
                            </div>
                            <Input
                                value={youtubeInputValue}
                                onChange={(e) => setYoutubeInputValue(e.target.value)}
                                placeholder="Paste YouTube Link..."
                                className="h-14 pl-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-red-500/50 focus:ring-red-500/20 text-lg font-medium"
                                autoFocus
                            />
                        </div>
                        <DialogFooter>
                            <Button 
                                type="submit" 
                                className="w-full h-14 rounded-xl bg-red-600 text-white font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-[0_0_30px_rgba(220,38,38,0.3)]"
                            >
                                <span className="mr-2">Instant Sync</span>
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default RoomControls;
