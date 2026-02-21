import { Bell } from 'lucide-react';
import { CospiraLogo } from '@/components/logo/CospiraLogo';
import { useAuth } from '@/hooks/useAuth';

export const MobileHeader = () => {
    const { user } = useAuth();

    return (
        <div className="flex items-center justify-between px-6 py-4 bg-[#05070a]/80 backdrop-blur-xl sticky top-0 z-50">
            <div className="flex items-center gap-2">
                <CospiraLogo size={32} />
                <span className="text-2xl font-black tracking-tighter text-white">cospira</span>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="relative">
                    <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                        <Bell className="w-5 h-5 text-white/70" />
                    </button>
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-black text-white border-2 border-[#05070a]">
                        3
                    </span>
                </div>
                
                <button className="w-10 h-10 rounded-full border-2 border-indigo-500/30 overflow-hidden ring-4 ring-indigo-500/10">
                    <img 
                        src={user?.user_metadata?.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                    />
                </button>
            </div>
        </div>
    );
};
