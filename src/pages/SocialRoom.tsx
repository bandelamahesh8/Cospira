import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useRoom } from '@/hooks/useRoom';
import { useWebSocket } from '@/hooks/useWebSocket';
import VideoGrid from '@/components/room/VideoGrid';
import ChatPanel from '@/components/room/ChatPanel';
import SocialRoomControls from '@/components/room/SocialRoomControls';
import { toast } from 'sonner';

const SocialRoom = () => {
    const navigate = useNavigate();

    // 1. Connection & Room State (Reused from generic room logic)
    const {
        newMessage,
        setNewMessage,
        isUploading,
        messagesEndRef,
        fileInputRef,
        handleSendMessage,
        handleFileUpload,
        handleLeaveRoom: contextLeaveRoom,
        triggerFileUpload,
    } = useRoom();

    // 2. Real-time Data (Streams, Users, Messages)
    const {
        socket,
        messages,
        users,
        files,
        localStream,
        remoteStreams,
        isAudioEnabled,
        isVideoEnabled,
        isConnected,
        toggleVideo // Implied existence
    } = useWebSocket();

    const [isInitialLoading, setIsInitialLoading] = useState(true);

    // --- Social Mode Camera Enforcement ---
    const [cameraWarningState, setCameraWarningState] = useState<'safe' | 'warning' | 'critical'>('safe');
    useEffect(() => {
        if (!isConnected) return;

        let warningTimeout: NodeJS.Timeout;
        let kickTimeout: NodeJS.Timeout;

        if (!isVideoEnabled) {
            // Camera turned off! Start timers.
            setCameraWarningState('warning');
            
            warningTimeout = setTimeout(() => {
                setCameraWarningState('critical');
            }, 5000); // Critical warning after 5s

            kickTimeout = setTimeout(() => {
                contextLeaveRoom();
                navigate('/dashboard');
                toast.error("Removed: Camera rule violation.");
            }, 10000); // Kick after 10s
        } else {
            setCameraWarningState('safe');
        }

        return () => {
            clearTimeout(warningTimeout);
            clearTimeout(kickTimeout);
        };
    }, [isVideoEnabled, isConnected, contextLeaveRoom, navigate]);

    // Safety check for socket connection
    useEffect(() => {
       if (socket?.connected && isConnected) {
           setIsInitialLoading(false);
       }
    }, [socket, isConnected]);

    const handleLeaveRoomWithNav = () => {
        contextLeaveRoom();
        navigate('/dashboard');
    };

    const handleSkip = () => {
        contextLeaveRoom();
        // Return to dashboard with auto-start intent
        navigate('/dashboard', { 
            state: { 
                autoStart: true,
                matchMode: 'video'
            } 
        });
    };

    const handleReport = () => {
        toast.info("Report filed via Safety Protocol.");
        // Future: Open actual report modal
    };

    return (
        <div className="flex h-screen w-full bg-[#0F0B14] overflow-hidden text-white font-sans selection:bg-fuchsia-500/30">
            
            {/* LEFT: Video Area */}
            <div className="flex-1 flex flex-col relative p-4 pl-6 overflow-hidden">
                {/* Header / Info (Optional - keep it minimal) */}
                <div className="absolute top-6 left-6 z-10 opacity-50 hover:opacity-100 transition-opacity">
                    <h1 className="text-xl font-black tracking-tight text-white/20 uppercase">
                        Social <span className="text-fuchsia-500">Link</span>
                    </h1>
                </div>

                {/* Video Grid */}
                <div className="flex-1 w-full h-full relative rounded-3xl overflow-hidden border border-white/5 bg-black/20 shadow-2xl">
                    <VideoGrid
                        localStream={localStream}
                        localUserName={"You"} // TODO: Get actual name if available, else 'You'
                        isAudioEnabled={isAudioEnabled}
                        isMediaLoading={isInitialLoading}
                        remoteStreams={remoteStreams}
                        users={users}
                        localUserId={socket?.id}
                        layout="grid"
                        isSocialMode={true} // Forces the simplified 2-up view
                        isVideoEnabled={isVideoEnabled}
                    />
                </div>

                {/* Floating Controls */}
                <SocialRoomControls 
                    onDisconnect={handleLeaveRoomWithNav}
                    onReport={handleReport}
                    onSkip={handleSkip}
                />
            </div>

            {/* Camera Warning Overlay */}
            {cameraWarningState !== 'safe' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
                    <div className="flex flex-col items-center gap-6 max-w-md text-center p-8">
                        <ShieldAlert className={`w-20 h-20 ${cameraWarningState === 'critical' ? 'text-red-500 animate-pulse' : 'text-amber-500'}`} />
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Camera Required</h2>
                            <p className="text-white/50 font-mono text-sm uppercase tracking-widest">
                                {cameraWarningState === 'critical' 
                                    ? 'Non-compliance detected. Session termination imminent.' 
                                    : 'Visual signal lost. Re-engage video feed to continue.'}
                            </p>
                        </div>
                        
                        <button 
                            onClick={toggleVideo} // Assuming toggleVideo handles the re-enable
                            className="px-8 py-3 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform shadow-xl"
                        >
                            Enable Camera
                        </button>

                        <p className="text-[10px] text-white/30 font-mono">
                            {cameraWarningState === 'critical' ? 'Code 99: Forced Disconnect in < 5s' : 'Code 01: Maintenance Mode'}
                        </p>
                    </div>
                </div>
            )}

            {/* RIGHT: Chat Area */}
            <div className="w-[400px] h-full bg-black/40 border-l border-white/5 backdrop-blur-sm flex flex-col">
                 <ChatPanel
                    showChat={true} // Always show in this layout
                    messages={messages}
                    files={files}
                    currentUser={users.find(u => u.id === socket?.id)}
                    isHost={false} // Social rooms are peer-to-peer-ish, no host powers usually
                    messagesEndRef={messagesEndRef}
                    handleSendMessage={handleSendMessage}
                    newMessage={newMessage}
                    setNewMessage={setNewMessage}
                    fileInputRef={fileInputRef}
                    handleFileUpload={handleFileUpload}
                    triggerFileUpload={triggerFileUpload}
                    isUploading={isUploading}
                    presentFile={() => {}} // No presentation in social mode
                    onClose={() => {}} // Cannot close chat here
                    activePoll={null}
                    onVote={() => {}}
                    variant="embedded"
                    isSocialMode={true}
                 />
            </div>
        </div>
    );
};

export default SocialRoom;
