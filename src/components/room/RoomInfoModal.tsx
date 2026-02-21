import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Shield, Lock, Crown, MicOff, AlertTriangle, Fingerprint, Server, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWebSocket } from '@/hooks/useWebSocket';
import { motion } from 'framer-motion';

interface RoomInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomId: string;
    isHost: boolean;
    roomName?: string;
}

const RoomInfoModal: React.FC<RoomInfoModalProps> = ({ isOpen, onClose, roomId, isHost, roomName }) => {
    const { disbandRoom } = useWebSocket();

    const handleDisband = () => {
        if (window.confirm('Are you sure you want to destroy this room for everyone?')) {
            disbandRoom();
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-[#0A0A0A] border border-white/10 p-0 overflow-hidden shadow-2xl sm:rounded-[2.5rem]">
                <DialogTitle className="sr-only">Room Information</DialogTitle>
                {/* ID Card Header Style */}
                <div className="relative h-32 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
                    <div className="absolute top-0 right-0 p-6 opacity-30">
                        <Fingerprint className="w-24 h-24 rotate-12" />
                    </div>
                    
                    <div className="absolute bottom-6 left-8">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Live Secure</span>
                            </div>
                        </div>
                        <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">
                            {roomName || 'Secure Channel'}
                        </h2>
                    </div>
                </div>

                <div className="p-8 space-y-8 relative">
                    {/* Security Grid */}
                    <div className="space-y-4">
                        <Label>Security Protocols</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <StatusCard 
                                icon={Lock} 
                                label="Encryption" 
                                value="End-to-End" 
                                active 
                            />
                            <StatusCard 
                                icon={Shield} 
                                label="Protection" 
                                value="Active" 
                                active 
                            />
                            <StatusCard 
                                icon={Activity} 
                                label="Uptime" 
                                value="99.9%" 
                                active={false}
                                activeColor="text-white/60"
                            />
                            <StatusCard 
                                icon={Server} 
                                label="Region" 
                                value="Low Latency" 
                                active={false}
                                activeColor="text-white/60"
                            />
                        </div>
                    </div>

                    {/* Room Metadata */}
                    <div className="space-y-4">
                        <Label>Session Metadata</Label>
                        <div className="rounded-2xl bg-white/5 border border-white/5 p-5 space-y-4">
                            <div className="flex justify-between items-center group">
                                <span className="text-xs font-medium text-white/40 group-hover:text-white/60 transition-colors">Session ID</span>
                                <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
                                    {roomId}
                                </code>
                            </div>
                            <div className="h-px bg-white/5" />
                            <div className="flex justify-between items-center group">
                                <span className="text-xs font-medium text-white/40 group-hover:text-white/60 transition-colors">Privilege Level</span>
                                <span className="text-xs font-bold text-white flex items-center gap-2">
                                     {isHost ? (
                                        <>
                                            <Crown className="w-3 h-3 text-amber-400" />
                                            Administrator
                                        </>
                                     ) : (
                                        'Participant'
                                     )}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Host Actions */}
                    {isHost && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4 pt-2"
                        >
                            <Label>Admin Controls</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <Button 
                                    variant="outline" 
                                    className="h-12 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white/60 hover:text-white text-xs font-bold uppercase tracking-wider"
                                    disabled
                                >
                                    <MicOff className="w-3 h-3 mr-2" /> Mute All
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="h-12 bg-red-500/5 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40 text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider transition-all"
                                    onClick={handleDisband}
                                >
                                    <AlertTriangle className="w-3 h-3 mr-2" /> Terminate
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-white/5 px-8 py-4 border-t border-white/5">
                    <p className="text-[10px] text-white/20 text-center font-mono uppercase tracking-widest">
                        Cospira Secure Environment • v2.0
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const Label = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-2 mb-2">
        <div className="h-px w-3 bg-white/20" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{children}</span>
        <div className="h-px flex-1 bg-white/10" />
    </div>
);

interface StatusCardProps {
    icon: React.ElementType;
    label: string;
    value: string;
    active: boolean;
    activeColor?: string;
}

const StatusCard = ({ icon: Icon, label, value, active, activeColor = 'text-white' }: StatusCardProps) => (
    <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3 hover:bg-white/10 transition-colors group">
        <div className={`mt-0.5 w-6 h-6 rounded-lg ${active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/30'} flex items-center justify-center shrink-0`}>
            <Icon className="w-3 h-3" />
        </div>
        <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-white/30 group-hover:text-white/50 transition-colors">{label}</span>
            <span className={`text-xs font-bold ${active ? 'text-white' : activeColor}`}>{value}</span>
        </div>
    </div>
);

export default RoomInfoModal;
