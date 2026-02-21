import React, { useState } from 'react';
import { Mail, Send, X, Copy, Check, Share2, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWebSocket } from '@/hooks/useWebSocket';
import { toast } from 'sonner';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose, roomId }) => {
  const { socket } = useWebSocket();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSendInvite = () => {
    if (!email || !socket) return;
    setIsSending(true);

    socket.emit('room:invite-email', { roomId, email }, (res: { success: boolean, error?: string }) => {
      setIsSending(false);
      if (res.success) {
        toast.success('Transmission Sent', { description: `Secure link dispatched to ${email}` });
        setEmail('');
        onClose();
      } else {
        toast.error('Transmission Failed', { description: res.error || 'Signal lost' });
      }
    });
  };

  const copyLink = () => {
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link Secured', { description: 'Access coordinates copied to clipboard' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative bg-[#0A0A0A] border border-white/10 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
                {/* Header with decorative elements */}
                <div className="relative p-8 pb-6 overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-primary mb-1">
                                <Share2 className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Secure Uplink</span>
                            </div>
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                                Invite Agents
                            </h2>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-white/50 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="px-8 pb-8 space-y-8">
                    {/* Method 1: Email */}
                    <div className="space-y-4">
                        <label className="text-xs font-bold uppercase tracking-wider text-white/40 flex items-center gap-2">
                            <Mail className="w-3 h-3" /> Direct Transmission
                        </label>
                        <div className="flex gap-2 p-1 bg-white/5 border border-white/5 rounded-xl transition-colors focus-within:border-primary/50 focus-within:bg-white/10">
                            <Input 
                                type="email" 
                                placeholder="agent@cospira.com" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="border-none bg-transparent h-12 text-white placeholder:text-white/20 focus-visible:ring-0 text-base"
                                onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                            />
                            <Button 
                                onClick={handleSendInvite} 
                                disabled={!email || isSending} 
                                className="h-12 w-12 rounded-lg bg-primary hover:bg-primary/90 text-black shrink-0 p-0"
                            >
                                {isSending ? (
                                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="relative flex items-center">
                        <div className="flex-1 border-t border-white/5"></div>
                        <span className="px-4 text-[10px] font-bold uppercase tracking-widest text-white/20">or</span>
                        <div className="flex-1 border-t border-white/5"></div>
                    </div>

                    {/* Method 2: Link */}
                    <div className="space-y-4">
                        <label className="text-xs font-bold uppercase tracking-wider text-white/40 flex items-center gap-2">
                             <Globe className="w-3 h-3" /> Spatial Coordinates
                        </label>
                        <div 
                            onClick={copyLink}
                            className="group cursor-pointer relative p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/10 transition-all active:scale-[0.99]"
                        >
                            <code className="block text-sm font-mono text-primary/80 truncate pr-8">
                                {window.location.host}/dashboard/room/<span className="text-white font-bold">{roomId}</span>
                            </code>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 group-hover:text-white transition-colors">
                                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-4 bg-white/5 border-t border-white/5">
                    <p className="text-[10px] text-white/30 text-center font-mono">
                        Links expire when the session is terminated.
                    </p>
                </div>
            </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default InviteModal;
