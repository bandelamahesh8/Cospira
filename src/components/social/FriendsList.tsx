import { useState } from 'react';
import { useSocial } from '@/hooks/useSocial';
import { SocialService } from '@/services/SocialService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Check, X, Search, Users, Shield, Zap } from 'lucide-react';
import { PlayerProfile } from '@/types/player';
import { cn } from '@/lib/utils';
import { useSoundEffects } from '@/hooks/useSoundEffects';

export const FriendsList = () => {
    const { friends, requests, sendRequest, respond } = useSocial();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Partial<PlayerProfile>[]>([]);
    const { playHover, playClick, playSuccess } = useSoundEffects();

    const handleSearch = async () => {
        if (!searchQuery) return;
        playClick();
        const res = await SocialService.searchUsers(searchQuery);
        setSearchResults(res);
    };

    return (
        <div className="w-full h-full flex flex-col bg-[#05080f]/90 border-l border-white/5 backdrop-blur-xl relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />

            {/* Header */}
            <div className="p-5 border-b border-white/5 z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                        <Users className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-sm font-black text-white tracking-widest uppercase">Social Grid</h2>
                </div>

                <Tabs defaultValue="friends" className="w-full">
                    <TabsList className="w-full bg-black/40 border border-white/5 p-1 h-9">
                        <TabsTrigger 
                            value="friends" 
                            onClick={playHover}
                            className="flex-1 text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 h-7"
                        >
                            Allies ({friends.length})
                        </TabsTrigger>
                        <TabsTrigger 
                            value="add" 
                            onClick={playHover}
                            className="flex-1 text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 text-white/40 h-7"
                        >
                            Recruit
                        </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="friends" className="mt-4 focus-visible:outline-none">
                        <ScrollArea className="h-[calc(100vh-280px)] pr-4 -mr-4">
                            {/* REQUESTS */}
                            {requests.length > 0 && (
                                <div className="mb-6 space-y-3">
                                    <div className="flex items-center gap-2 px-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Incoming Transmissions</p>
                                    </div>
                                    {requests.map(req => (
                                        <div key={req.id} className="flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 p-3 rounded-xl transition-all group">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-8 h-8 ring-2 ring-orange-500/20">
                                                    <AvatarImage src={req.avatarUrl} />
                                                    <AvatarFallback className="bg-orange-950 text-orange-500 text-xs font-bold">{req.username[0]}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors">{req.username}</span>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-400 hover:text-green-300 hover:bg-green-500/20" onClick={() => { playSuccess(); respond(req.id, true); }}>
                                                    <Check className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20" onClick={() => { playClick(); respond(req.id, false); }}>
                                                    <X className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* FRIENDS */}
                            <div className="space-y-2">
                                {friends.map(friend => (
                                    <div 
                                        key={friend.id} 
                                        onMouseEnter={() => playHover()}
                                        className="flex items-center gap-3 p-3 hover:bg-white/5 border border-transparent hover:border-white/5 rounded-xl cursor-pointer group transition-all"
                                    >
                                        <div className="relative">
                                            <Avatar className="w-9 h-9 border border-white/10 group-hover:border-purple-500/50 transition-colors">
                                                <AvatarImage src={friend.avatarUrl} />
                                                <AvatarFallback className="bg-slate-900 text-slate-500 text-xs font-bold">{friend.username[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className={cn(
                                                "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#05080f]",
                                                friend.isOnline ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-slate-600"
                                            )} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-200 group-hover:text-purple-400 transition-colors truncate">{friend.username}</p>
                                            <p className="text-[10px] text-slate-500 font-medium truncate flex items-center gap-1.5">
                                                {friend.isOnline ? (
                                                    <span className="text-emerald-500/80">Online</span>
                                                ) : (
                                                    'Offline'
                                                )}
                                            </p>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/10">
                                                <Zap className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {friends.length === 0 && (
                                    <div className="text-center py-12 px-4 border border-dashed border-white/5 rounded-xl bg-white/[0.02]">
                                        <Shield className="w-8 h-8 text-white/10 mx-auto mb-3" />
                                        <p className="text-xs text-white/40 font-medium">No allies in network.</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="add" className="mt-4 focus-visible:outline-none">
                        <div className="flex gap-2 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-white/30" />
                                <Input 
                                    placeholder="Search codename..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="bg-black/20 border-white/10 pl-9 text-xs text-white placeholder:text-white/20 h-9 rounded-lg focus-visible:ring-purple-500/50"
                                />
                            </div>
                            <Button size="icon" onClick={handleSearch} className="h-9 w-9 bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/30">
                                <Search className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                        <ScrollArea className="h-[350px]">
                            {searchResults.map(user => (
                                <div key={user.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-all mb-2">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={user.avatarUrl} />
                                            <AvatarFallback className="bg-slate-800 text-slate-400 text-xs font-bold">{user.username?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs font-bold text-white">{user.username}</span>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        onClick={() => { playSuccess(); sendRequest(user.id!); }}
                                        className="h-7 text-[10px] font-bold uppercase tracking-wider bg-white/5 hover:bg-purple-600 hover:text-white border border-white/10 transition-all"
                                    >
                                        <UserPlus className="w-3 h-3 mr-1.5" /> Add
                                    </Button>
                                </div>
                            ))}
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};
