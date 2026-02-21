import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Navbar from '@/components/Navbar';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
    Zap, 
    Cpu,
    Lock,
    Check
} from 'lucide-react';
import { toast } from 'sonner';
import { ROOM_MODE_CONFIGS, RoomMode } from '@/services/RoomIntelligence';
import { encodeRoomId } from '@/utils/roomCode';

const CreateRoom = () => {
  const { createRoom } = useWebSocket();
  const navigate = useNavigate();

  const [roomName, setRoomName] = useState('');
  const [selectedMode, setSelectedMode] = useState<RoomMode>('mixed');
  const [isCreating, setIsCreating] = useState(false);
  const [password, setPassword] = useState('');

  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      toast.error('Sector ID Missing', { description: 'Please assign a name to your new sector.' });
      return;
    }

    setIsCreating(true);

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let roomId = '';
    for (let i = 0; i < 6; i++) {
        roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const accessType = password ? 'password' : 'public';
    const settings = {
        mode: selectedMode,
        // Inherit default features from mode, but allow overrides if we added toggles later.
        // For now, we trust the mode config on the backend/room logic.
    };

    createRoom(roomId, roomName, password, accessType, () => {
      toast.success('Sector Initialized', { description: `Unit ${roomId} is now active in ${ROOM_MODE_CONFIGS[selectedMode].label}.` });
      const encodedId = encodeRoomId(roomId);
      console.log('[CreateRoom] Navigating to:', `/room/${encodedId}`, 'Raw:', roomId, 'Encoded:', encodedId);
      setTimeout(() => navigate(`/room/${encodedId}`), 500);
    }, undefined, settings);
  };

  const currentConfig = ROOM_MODE_CONFIGS[selectedMode];

  return (
    <div className='min-h-screen bg-[#05070a] relative overflow-x-hidden selection:bg-indigo-500/30 font-sans text-white'>
       {/* BACKGROUND EFFECTS */}
       <div className="fixed inset-0 pointer-events-none z-0">
          <motion.div 
            animate={{ 
                background: selectedMode === 'fun' ? 'radial-gradient(circle at 80% 20%, rgba(168,85,247,0.15), transparent 50%)' :
                            selectedMode === 'professional' ? 'radial-gradient(circle at 80% 20%, rgba(59,130,246,0.15), transparent 50%)' :
                            selectedMode === 'ultra' ? 'radial-gradient(circle at 80% 20%, rgba(239,68,68,0.15), transparent 50%)' :
                            'radial-gradient(circle at 80% 20%, rgba(16,185,129,0.15), transparent 50%)'
            }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          />
          <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] bg-white/5 blur-[120px] rounded-full mix-blend-screen" />
          <div className="absolute inset-0 bg-[#05070a]/90" />
       </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        <div className='container mx-auto px-4 md:px-8 py-24 md:py-32 max-w-7xl flex-1 flex flex-col'>
            
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="mb-12"
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-4">
                    <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">System Architect</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white mb-4">
                    INITIALIZE SECTOR
                </h1>
                <p className="text-white/40 font-medium max-w-xl text-lg">
                    Select a protocol to define the capabilities, security level, and visual identity of your workspace.
                </p>
            </motion.div>

            <div className="grid lg:grid-cols-12 gap-12 flex-1">
                
                {/* LEFT: MODE SELECTION (VALORANT CARDS) */}
                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
                    {(Object.keys(ROOM_MODE_CONFIGS) as RoomMode[]).map((mode) => {
                        const config = ROOM_MODE_CONFIGS[mode];
                        const isSelected = selectedMode === mode;

                        return (
                            <motion.button
                                key={mode}
                                onClick={() => setSelectedMode(mode)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`
                                    relative group overflow-hidden rounded-[2rem] border text-left p-8 flex flex-col transition-all duration-300
                                    ${isSelected 
                                        ? 'bg-[#0c1016] border-white/20 shadow-[0_20px_40px_rgba(0,0,0,0.5)]' 
                                        : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10'
                                    }
                                `}
                            >
                                {/* Active Outline / Glow */}
                                {isSelected && (
                                    <motion.div 
                                        layoutId="activeGlow"
                                        className="absolute inset-0 border-2 rounded-[2rem] pointer-events-none z-20"
                                        style={{ borderColor: mode === 'ultra' ? '#EF4444' : mode === 'fun' ? '#A855F7' : mode === 'professional' ? '#3B82F6' : '#10B981' }}
                                    />
                                )}

                                {/* Card Background Gradient */}
                                <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${
                                    mode === 'ultra' ? 'from-red-900/10 to-transparent' : 
                                    mode === 'fun' ? 'from-purple-900/10 to-transparent' : 
                                    mode === 'professional' ? 'from-blue-900/10 to-transparent' : 
                                    'from-emerald-900/10 to-transparent'
                                }`} />

                                <div className="relative z-10 flex-1 flex flex-col">
                                     <div className="flex items-start justify-between mb-6">
                                         <div className={`
                                            w-12 h-12 rounded-2xl flex items-center justify-center text-2xl
                                            ${isSelected ? 'bg-white/10 text-white' : 'bg-white/5 text-white/50 group-hover:text-white group-hover:bg-white/10'}
                                         `}>
                                             {config.icon}
                                         </div>
                                         {isSelected && <Check className="w-6 h-6 text-white" />}
                                     </div>

                                     <h3 className={`text-2xl font-black uppercase tracking-tight mb-2 ${isSelected ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>
                                         {config.label}
                                     </h3>
                                     <p className="text-sm text-white/40 font-medium leading-relaxed mb-6">
                                         {config.description}
                                     </p>

                                     {/* Mini Feature Tags */}
                                     <div className="mt-auto flex flex-wrap gap-2">
                                         {config.features.games && <span className="px-2 py-1 rounded bg-white/5 text-[10px] font-bold uppercase tracking-wider text-white/50">Games</span>}
                                         {config.features.summary && <span className="px-2 py-1 rounded bg-white/5 text-[10px] font-bold uppercase tracking-wider text-white/50">AI Summary</span>}
                                         {config.securityLevel === 'high' && <span className="px-2 py-1 rounded bg-red-500/10 text-[10px] font-bold uppercase tracking-wider text-red-500">Max Security</span>}
                                     </div>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                {/* RIGHT: CONFIGURATION & PREVIEW */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    
                    {/* INPUTS */}
                    <div className="bg-[#0c1016] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Sector Name</Label>
                            <Input 
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                placeholder="e.g. Operation Nightfall"
                                className="h-14 bg-white/5 border-white/5 rounded-2xl px-5 font-bold text-white focus:border-white/20 transition-all placeholder:text-white/10"
                            />
                        </div>

                        <div className="space-y-2">
                             <Label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Passkey (Optional)</Label>
                             <div className="relative">
                                 <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                 <Input 
                                     type="password"
                                     value={password}
                                     onChange={(e) => setPassword(e.target.value)}
                                     placeholder="Secure Access Token"
                                     className="h-14 pl-12 bg-white/[0.02] border-white/5 rounded-2xl font-mono text-sm text-white focus:border-white/20 transition-all placeholder:text-white/10"
                                 />
                             </div>
                        </div>
                    </div>

                    {/* LIVE PREVIEW OF MODE */}
                    <div className="flex-1 bg-gradient-to-b from-[#0c1016] to-transparent border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden">
                        <h4 className="text-xs font-black uppercase tracking-widest text-white/30 mb-6">Protocol Details</h4>
                        
                        <div className="space-y-4 relative z-10">
                            <FeatureRow label="Games & Activities" active={currentConfig.features.games} />
                            <FeatureRow label="AI Intelligence" active={currentConfig.features.summary} />
                            <FeatureRow label="Virtual Browser" active={currentConfig.features.virtualBrowser} />
                            <FeatureRow label="Screen Sharing" active={currentConfig.features.screenShare} />
                            
                            <div className="h-px bg-white/5 my-4" />
                            
                                    <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white/50">Security Level</span>
                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                                    currentConfig.securityLevel === 'high' ? 'bg-red-500/20 text-red-500' :
                                    currentConfig.securityLevel === 'medium' ? 'bg-blue-500/20 text-blue-500' :
                                    'bg-green-500/20 text-green-500'
                                }`}>
                                    {currentConfig.securityLevel}
                                </span>
                            </div>
                        </div>

                        {/* CTA */}
                        <motion.button 
                            onClick={handleCreateRoom}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full mt-8 h-16 rounded-[1.5rem] bg-white text-black font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:bg-indigo-50 transition-colors"
                        >
                            {isCreating ? (
                                <span className="animate-pulse">Initializing...</span>
                            ) : (
                                <>
                                    <Zap className="w-5 h-5 fill-black" />
                                    Launch Sector
                                </>
                            )}
                        </motion.button>
                    </div>

                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

const FeatureRow = ({ label, active }: { label: string, active: boolean }) => (
    <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white/70">{label}</span>
        <div className={`w-8 h-5 rounded-full flex items-center p-1 transition-colors ${active ? 'bg-emerald-500' : 'bg-white/10'}`}>
            <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${active ? 'translate-x-3' : 'translate-x-0'}`} />
        </div>
    </div>
);

export default CreateRoom;
