import React, { useEffect } from 'react';
import AIPoll from '@/components/room/AIPoll';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import UserAvatar from '@/components/UserAvatar';
import {
    FastForward,
    Paperclip,
    File as FileIcon,
    Download,
    Monitor,
    Sparkles,
    Bot,
    ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { User, Message, FileData } from '@/types/websocket';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatPanelProps {
    showChat: boolean;
    messages: Message[];
    files: FileData[];
    currentUser: User | undefined;
    isHost: boolean;
    messagesEndRef: React.RefObject<HTMLDivElement>;
    handleSendMessage: (e: React.FormEvent) => void;
    newMessage: string;
    setNewMessage: (message: string) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    triggerFileUpload: () => void;
    isUploading: boolean;
    presentFile: (file: FileData) => void;
    onClose: () => void;
    activePoll: import('@/types/websocket').PollData | null;
    onVote: (index: number) => void;
    onNextMatch?: () => void;
    isSocialMode?: boolean;
    variant?: 'overlay' | 'embedded';
}

const ChatPanel: React.FC<ChatPanelProps> = ({
    showChat,
    messages,
    files,
    currentUser,
    isHost,
    messagesEndRef,
    handleSendMessage,
    newMessage,
    setNewMessage,
    fileInputRef,
    handleFileUpload,
    triggerFileUpload,
    isUploading,
    presentFile,
    onClose,
    activePoll,
    onVote,
    onNextMatch,
    isSocialMode = false,
    variant = 'overlay',
}) => {
    const isEmbedded = variant === 'embedded';
    // Removed unused containerRef since we use messagesEndRef for scrolling

    useEffect(() => {
        if (showChat && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [showChat, messages.length, files.length, messagesEndRef]);

    // Combine messages and files for rendering
    const allItems = [
        ...messages,
        ...files.map((f) => ({
            ...f,
            id: `file-${f.id}`,
            isFile: true,
            content: f.name,
            timestamp: f.timestamp || new Date().toISOString(),
            userId: f.userId || 'system',
            userName: f.userName || 'System',
        })),
    ]
        .filter(item => {
            if (isSocialMode && item.userId === 'system') {
                const content = String(item.content).toLowerCase();
                return !content.includes('joined') && !content.includes('left');
            }
            return true;
        })
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return (
        <AnimatePresence>
            {(showChat || isEmbedded) && (
                <motion.div
                    initial={isEmbedded
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.9, y: 20, transformOrigin: "bottom left" }
                    }
                    animate={isEmbedded
                        ? { opacity: 1 }
                        : { opacity: 1, scale: 1, y: 0 }
                    }
                    exit={isEmbedded
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.9, y: 20 }
                    }
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    style={!isEmbedded ? { transformOrigin: 'bottom left' } : undefined}
                    className={isEmbedded
                        ? "flex-1 w-full h-full border-l border-white/5 bg-[#050505]/95 backdrop-blur-3xl flex flex-col overflow-hidden"
                        : "fixed inset-0 z-[150] w-full md:fixed md:right-4 md:top-24 md:bottom-24 md:h-auto md:max-h-[calc(100vh-180px)] md:w-[400px] md:rounded-2xl md:z-50 bg-[#0A0A0A]/95 backdrop-blur-[50px] border border-white/10 shadow-2xl flex flex-col overflow-hidden origin-bottom-left"
                    }
                >
                    {/* Header */}
                    <div className="flex-none h-16 md:h-20 border-b border-white/5 flex items-center justify-between px-6 bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/10 flex items-center justify-center">
                                <Bot className="w-4 h-4 md:w-5 md:h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-white">
                                    Comm Link
                                </h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-[10px] font-bold text-white/30 tracking-wider">SECURE CHANNEL</span>
                                </div>
                            </div>
                        </div>

                        {!isEmbedded && (
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-white/50 hover:text-white"
                                title="Minimize"
                            >
                                <span className="w-3 h-0.5 bg-current rounded-full" />
                            </button>
                        )}
                    </div>

                    {/* Messages Area */}
                    <ScrollArea className="flex-1 px-0 relative">
                        <div className="px-4 py-6 space-y-6">
                            {/* Poll Section */}
                            <AnimatePresence>
                                {activePoll && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="mb-6 p-1"
                                    >
                                        <AIPoll
                                            id={activePoll.id}
                                            question={activePoll.question}
                                            options={activePoll.options}
                                            expiresAt={activePoll.expiresAt}
                                            onVote={onVote}
                                            results={activePoll.results}
                                            totalVotes={activePoll.totalVotes}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Message Feed */}
                            {allItems.map((item, index) => {
                                const isSystem = item.userId === 'system';
                                const isAssistant = item.userId === 'assistant';
                                const isMe = item.userId === (currentUser?.id || '') || item.userId === 'me';
                                const isFileItem = 'isFile' in item && item.isFile;
                                const showAvatar = index === 0 || allItems[index - 1].userId !== item.userId;

                                if (isSystem) {
                                    return (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex justify-center my-4"
                                        >
                                            <div className="px-3 py-1 bg-white/5 border border-white/5 rounded-full backdrop-blur-sm">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                                    {item.content}
                                                </span>
                                            </div>
                                        </motion.div>
                                    );
                                }

                                if (isAssistant) {
                                    return (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex gap-4 group"
                                        >
                                            <div className="shrink-0 pt-0.5">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                                                    <Sparkles className="w-4 h-4 text-white" />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1 max-w-[85%]">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                                                        Cospira Intelligence
                                                    </span>
                                                    <span className="text-[9px] text-white/20 font-mono">{format(new Date(item.timestamp), 'HH:mm')}</span>
                                                </div>
                                                <div className="p-3 rounded-2xl rounded-tl-none bg-gradient-to-br from-white/10 to-white/5 border border-white/10 text-xs md:text-sm text-slate-200 leading-relaxed shadow-sm">
                                                    {item.content}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                }

                                return (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={`flex gap-3 md:gap-4 group ${isMe ? 'flex-row-reverse' : ''}`}
                                    >
                                        <div className={`shrink-0 pt-0.5 ${!showAvatar ? 'opacity-0' : ''}`}>
                                            <UserAvatar
                                                name={isSocialMode && !isMe ? '?' : item.userName}
                                                seed={isMe ? item.userName : (isSocialMode ? 'stranger' : item.userId)}
                                                avatarUrl={isMe ? (currentUser?.photoUrl || undefined) : (isSocialMode ? undefined : undefined)}
                                                className="w-8 h-8 rounded-lg border border-white/10 shadow-lg"
                                            />
                                        </div>

                                        <div className={`flex flex-col gap-1 max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                            {showAvatar && (
                                                <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                                                        {isSocialMode && !isMe ? 'Stranger' : item.userName}
                                                    </span>
                                                    <span className="text-[9px] text-white/20 font-mono">{format(new Date(item.timestamp), 'HH:mm')}</span>
                                                </div>
                                            )}

                                            {isFileItem ? (
                                                (() => {
                                                    const fileItem = item as unknown as FileData;
                                                    return (
                                                        <div className={`p-1 rounded-2xl border transition-all ${isMe ? 'bg-indigo-500/10 border-indigo-500/20 rounded-tr-sm' : 'bg-white/5 border-white/10 rounded-tl-sm'}`}>
                                                            <div className="flex items-center gap-3 p-2 bg-black/20 rounded-xl">
                                                                <div className="w-10 h-10 bg-black/40 rounded-lg flex items-center justify-center border border-white/5">
                                                                    <FileIcon className="w-5 h-5 text-indigo-400" />
                                                                </div>
                                                                <div className="min-w-[100px] pr-2">
                                                                    <p className="text-xs font-bold text-white truncate max-w-[140px]">{fileItem.name}</p>
                                                                    <p className="text-[10px] text-white/40 font-mono">{(fileItem.size / 1024).toFixed(1)} KB</p>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 hover:bg-white/10 rounded-lg"
                                                                    onClick={() => {
                                                                        const url = fileItem.url?.startsWith('http') ? fileItem.url : `${import.meta.env.VITE_WS_URL || 'http://localhost:3001'}${fileItem.url}`;
                                                                        window.open(url, '_blank');
                                                                    }}
                                                                >
                                                                    <Download className="w-4 h-4 text-white/70" />
                                                                </Button>
                                                            </div>
                                                            {(isHost || currentUser?.isCoHost) && fileItem.name && /\.(mp4|webm|ogg)$/i.test(fileItem.name) && (
                                                                <button
                                                                    onClick={() => presentFile(fileItem)}
                                                                    className="w-full mt-1 h-8 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-indigo-500/10"
                                                                >
                                                                    <Monitor className="w-3 h-3" /> Project to Stage
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isMe
                                                        ? 'bg-indigo-600 text-white rounded-tr-sm shadow-[0_4px_15px_rgba(79,70,229,0.3)]'
                                                        : 'bg-white/10 border border-white/5 text-slate-200 rounded-tl-sm'
                                                    } ${'pending' in item && item.pending ? 'opacity-70 animate-pulse bg-indigo-500/50' : ''}`}>
                                                    {item.content}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                            <div ref={messagesEndRef} className="h-4" />
                        </div>
                    </ScrollArea>

                    {/* Input Area */}
                    <div className="p-4 bg-black/40 backdrop-blur-xl border-t border-white/10">
                        <form onSubmit={handleSendMessage} className="relative flex flex-col gap-3">
                            {/* Toolbar */}
                            <div className="flex items-center gap-2">
                                {onNextMatch && (
                                    <button
                                        type="button"
                                        onClick={onNextMatch}
                                        className="group relative h-10 px-6 bg-black border border-emerald-500/20 text-emerald-500 overflow-hidden transition-all hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 ml-auto"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative flex items-center gap-2">
                                            <FastForward className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Initiate Skip</span>
                                        </div>
                                        <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-emerald-500 group-hover:w-full transition-all duration-500" />
                                    </button>
                                )}
                            </div>

                            {/* Input Field */}
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />

                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                                <button
                                    type="button"
                                    onClick={triggerFileUpload}
                                    disabled={isUploading}
                                    className="absolute left-2 top-2 h-8 w-8 rounded-xl flex items-center justify-center text-white/40 hover:text-indigo-400 hover:bg-white/5 transition-colors z-10"
                                >
                                    <Paperclip className="w-4 h-4" />
                                </button>

                                <input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Enter secure message..."
                                    className="relative w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-12 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-medium"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="absolute right-2 top-2 h-8 w-8 bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-0 disabled:scale-90 shadow-lg hover:shadow-indigo-500/25"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ChatPanel;
