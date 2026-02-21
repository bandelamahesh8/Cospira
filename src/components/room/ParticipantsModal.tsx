import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, UserX, Shield, ShieldOff, Crown } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import UserAvatar from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ParticipantsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ParticipantsModal: React.FC<ParticipantsModalProps> = ({ isOpen, onClose }) => {
    const { 
        users, 
        isHost, 
        kickUser, 
        muteUser, 
        promoteToCoHost,
        demoteFromCoHost,
    } = useWebSocket();
    const { user: authUser } = useAuth();

    // Sort: Host first, then Co-hosts, then others
    const sortedUsers = [...users].sort((a, b) => {
        if (a.isHost) return -1;
        if (b.isHost) return 1;
        if (a.isCoHost) return -1;
        if (b.isCoHost) return 1;
        return 0;
    });

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                            <div>
                                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                                    Participants
                                    <span className="bg-white/10 text-white/60 text-xs px-2 py-0.5 rounded-full font-mono">
                                        {users.length}
                                    </span>
                                </h2>
                                <p className="text-xs text-white/40 font-medium tracking-wider uppercase mt-1">
                                    Manage secure connection
                                </p>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={onClose}
                                className="hover:bg-white/10 rounded-full"
                            >
                                <X className="w-5 h-5 text-white/70" />
                            </Button>
                        </div>

                        {/* List */}
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-2">
                                {sortedUsers.map((user) => (
                                    <motion.div
                                        key={user.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group border border-transparent hover:border-white/5"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <UserAvatar 
                                                    name={user.name} 
                                                    src={user.photoUrl} 
                                                    className="w-10 h-10 ring-2 ring-white/5" 
                                                />
                                                {user.isHost && (
                                                    <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black p-0.5 rounded-full border-2 border-[#0A0A0A]">
                                                        <Crown className="w-3 h-3" />
                                                    </div>
                                                )}
                                                {user.isCoHost && !user.isHost && (
                                                    <div className="absolute -bottom-1 -right-1 bg-indigo-500 text-white p-0.5 rounded-full border-2 border-[#0A0A0A]">
                                                        <Shield className="w-3 h-3" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-white flex items-center gap-2">
                                                    {user.name}
                                                    {user.id === authUser?.id && (
                                                        <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/50">YOU</span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-white/30 truncate max-w-[150px]">
                                                    {user.isHost ? 'Host' : user.isCoHost ? 'Co-Host' : 'Participant'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1">
                                            {isHost && !user.isHost && (
                                                <>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10"
                                                                    onClick={() => muteUser && muteUser(user.id)}
                                                                >
                                                                    {user.isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-red-500" />}
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Mute</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>

                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10"
                                                                    onClick={() => {
                                                                        if (user.isCoHost) {
                                                                            demoteFromCoHost?.(user.id);
                                                                        } else {
                                                                            promoteToCoHost?.(user.id);
                                                                        }
                                                                    }}
                                                                >
                                                                    {user.isCoHost ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>{user.isCoHost ? 'Remove Co-Host' : 'Make Co-Host'}</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>

                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                                                                    onClick={() => kickUser && kickUser(user.id)}
                                                                >
                                                                    <UserX className="w-4 h-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Kick User</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </ScrollArea>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ParticipantsModal;
