import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    LogOut, Shield, Lock, 
    Pencil, Info, Rocket
} from 'lucide-react';
import { useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { formatActivityTimestamp } from '@/utils/activityHelpers';
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuGroup, 
    DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { NeuralInformer } from '@/components/intelligence';

const UserMenu = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const { socket, isConnected } = useWebSocket();
    const [recentRooms, setRecentRooms] = useState<{name: string, time: string, status: 'active' | 'expired', id: string}[]>([]);

    const userEmail = user?.email || 'guest@cospira.com';
    const displayName = user?.user_metadata?.display_name || userEmail.split('@')[0];
    const photoUrl = user?.user_metadata?.photo_url;
    const displayPhotoUrl = photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`;

    useEffect(() => {
        if (!socket || !isConnected) return;

        interface HistoryItem {
            id: string;
            name: string;
            isActive: boolean;
            joinedAt?: string | number;
            lastActive?: string | number;
        }

        socket.emit('get-user-history', { userId: user?.id }, (res: { success: boolean, history?: HistoryItem[] }) => {
            if (res.success && res.history) {
                const mapped = res.history
                    .slice(0, 3)
                    .map(item => ({
                        id: item.id,
                        name: item.name || 'Unnamed Room',
                        time: formatActivityTimestamp(new Date(item.joinedAt || item.lastActive || Date.now())),
                        status: item.isActive ? 'active' : 'expired' as 'active' | 'expired'
                    }));
                setRecentRooms(mapped);
            }
        });
    }, [socket, isConnected, user?.id]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="group flex items-center gap-2 outline-none">
                    <Avatar className='h-8 w-8 border border-white/20 group-hover:border-primary transition-all duration-300 group-data-[state=open]:ring-2 group-data-[state=open]:ring-primary/20'>
                        <AvatarImage src={displayPhotoUrl} className="object-cover" />
                        <AvatarFallback className="bg-zinc-800 text-xs">U</AvatarFallback>
                    </Avatar>
                </button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent 
                className="w-80 p-2 bg-[#0B0F14]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl text-white mr-4 mt-2"
                align="end"
                sideOffset={5}
            >
                {/* Header */}
                {/* 1. IDENTITY BLOCK (QUITE & REFINED) */}
                <NeuralInformer 
                    title="User Neural Identity" 
                    description="Access and modify your global agent profile. Customize your neural avatar, display name, and system-wide appearance settings."
                >
                    <div 
                        onClick={() => navigate('/profile')}
                        className="group/identity flex items-center gap-3 p-3 mb-2 rounded-xl bg-white/[0.03] border border-white/5 cursor-pointer hover:bg-white/5 transition-all"
                    >
                        <Avatar className='h-9 w-9 border border-white/10'>
                            <AvatarImage src={displayPhotoUrl} />
                            <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col flex-1">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-white/90">{displayName}</span>
                                {/* 2. EDIT PROFILE: Hover reveal trigger */}
                                <Pencil className="w-3 h-3 text-white/20 opacity-0 group-hover/identity:opacity-100 transition-opacity" />
                            </div>
                            <span className="text-[10px] font-mono text-white/60 truncate max-w-[150px]">{userEmail}</span>
                        </div>
                    </div>
                </NeuralInformer>

                <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-white/30 px-3 py-2">
                        Recent Rooms
                    </DropdownMenuLabel>
                        {recentRooms.length > 0 ? (
                            recentRooms.map((room, i) => (
                                <DropdownMenuItem 
                                    key={i} 
                                    onClick={() => navigate(`/room/${room.id}`)}
                                    className="flex items-center justify-between p-3 rounded-xl focus:bg-white/5 cursor-pointer"
                                >
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-xs font-medium text-white/80">{room.name}</span>
                                        <span className="text-[10px] text-white/30">{room.time}</span>
                                    </div>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                                        room.status === 'active' 
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                        : 'bg-zinc-800 border-white/5 text-white/30'
                                    }`}>
                                        {room.status === 'active' ? 'Rejoin' : 'Expired'}
                                    </span>
                                </DropdownMenuItem>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-center">
                                <span className="text-[10px] text-white/20">No recent sessions found</span>
                            </div>
                        )}
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="bg-white/5 my-2" />

                <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-white/30 px-3 py-2">
                        Privacy & Security
                    </DropdownMenuLabel>
                    <div className="px-3 py-2 grid grid-cols-2 gap-2">
                        <div className="p-2 rounded-lg bg-white/5 border border-white/5 flex flex-col gap-1">
                            <Shield className="w-3 h-3 text-emerald-400/60" />
                            <span className="text-[9px] text-white/40 font-mono">Encryption</span>
                            <span className="text-[10px] font-bold text-white/80">Active (AES)</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5 border border-white/5 flex flex-col gap-1">
                            <Lock className="w-3 h-3 text-emerald-400/60" />
                            <span className="text-[9px] text-white/40 font-mono">Session</span>
                            <span className="text-[10px] font-bold text-white/80">Verified</span>
                        </div>
                    </div>
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="bg-white/5 my-2" />

                <NeuralInformer 
                    title="Project Roadmap & Intel" 
                    description="Explore upcoming architectural upgrades and feature deployments planned for the Cospira ecosystem."
                >
                    <DropdownMenuItem onClick={() => navigate('/upcoming')} className="group flex items-center gap-2 p-2 rounded-lg focus:bg-white/5 cursor-pointer text-white/50 hover:text-white text-left">
                        <Rocket className="w-3.5 h-3.5 text-pink-400" />
                        <span className="text-xs font-medium">Upcoming Features</span>
                    </DropdownMenuItem>
                </NeuralInformer>

                <NeuralInformer 
                    title="System Information" 
                    description="Detailed metadata regarding the Cospira project, its neural architecture, and the team behind the mesh."
                >
                    <DropdownMenuItem onClick={() => navigate('/about')} className="group flex items-center gap-2 p-2 rounded-lg focus:bg-white/5 cursor-pointer text-white/50 hover:text-white text-left">
                        <Info className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">About Cospira</span>
                    </DropdownMenuItem>
                </NeuralInformer>



                <DropdownMenuItem onClick={signOut} className="group flex items-center gap-2 p-2 rounded-lg focus:bg-red-500/10 cursor-pointer text-white/30 hover:text-red-400 transition-colors mt-1">
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-red-400">Sign Out</span>
                </DropdownMenuItem>

            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default UserMenu;
