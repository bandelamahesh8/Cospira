import { useNavigate } from 'react-router-dom';
import { useRoom } from '@/hooks/useRoom';
import { useWebSocket } from '@/hooks/useWebSocket';
import ChatPanel from '@/components/room/ChatPanel';
import { MessageSquare } from 'lucide-react';

const TextRoom = () => {
    const navigate = useNavigate();

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

    const {
        socket,
        messages,
        users,
        files,
        isConnected,
    } = useWebSocket();

    const handleLeave = () => {
        contextLeaveRoom();
        navigate('/dashboard');
    };

    return (
        <div className="flex h-screen w-full bg-[#0F0B14] overflow-hidden text-white font-sans selection:bg-fuchsia-500/30 items-center justify-center">
            
            <div className="w-full max-w-4xl h-[85vh] flex flex-col md:flex-row rounded-3xl overflow-hidden border border-white/10 bg-[#0A0A0A] shadow-2xl relative">
                
                {/* Left Side - Info / Controls */}
                <div className="md:w-64 bg-black/40 border-r border-white/5 p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="font-black text-lg tracking-tight uppercase">Text<span className="text-indigo-500">Mode</span></h1>
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] uppercase font-bold text-white/40 tracking-widest">{isConnected ? 'Live Secure' : 'Connecting...'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Connected Agents</span>
                                <div className="flex -space-x-2">
                                    {users.map((u, i) => (
                                        <div key={i} className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold ring-2 ring-[#0A0A0A]">
                                            {u.name?.[0] || 'A'}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleLeave}
                        className="w-full py-3 bg-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                    >
                        Disconnect
                    </button>
                </div>

                {/* Right Side - Chat */}
                <div className="flex-1 bg-black/20 flex flex-col relative">
                    <ChatPanel
                        showChat={true}
                        messages={messages}
                        files={files}
                        currentUser={users.find(u => u.id === socket?.id)}
                        isHost={false}
                        messagesEndRef={messagesEndRef}
                        handleSendMessage={handleSendMessage}
                        newMessage={newMessage}
                        setNewMessage={setNewMessage}
                        fileInputRef={fileInputRef}
                        handleFileUpload={handleFileUpload}
                        triggerFileUpload={triggerFileUpload}
                        isUploading={isUploading}
                        presentFile={() => {}} 
                        onClose={() => {}}
                        activePoll={null}
                        onVote={() => {}}
                        variant="embedded"
                        isSocialMode={true}
                    />
                </div>
            </div>
        </div>
    );
};

export default TextRoom;
