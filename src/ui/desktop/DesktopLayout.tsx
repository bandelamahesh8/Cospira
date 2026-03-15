import React from 'react';
import { isDesktop } from '@/core/featureFlags';
import { useWebSocket } from '@/hooks/useWebSocket';
import { cn } from '@/lib/utils';
import { Activity, Wifi, Minus, X, ShoppingBag } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getDesktopAdapter } from '@/adapters';
import { useEffect } from 'react';
import { FriendsList } from '@/components/social/FriendsList';
import { GlobalChat } from '@/components/social/GlobalChat';
import { Shop } from '@/components/shop/Shop';
import { TournamentLobby } from '@/components/tournament/TournamentLobby';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { ClanManager } from '@/components/social/ClanManager';
import { IdentityEditor } from '@/components/identity/IdentityEditor';
import { MetaLeaderboard } from '@/components/meta/MetaLeaderboard';
import { BalanceDashboard } from '@/components/admin/BalanceDashboard';
import { SeasonHub } from '@/components/seasons/SeasonHub';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { BrainDashboard } from '@/components/brain/BrainDashboard';
import {
  Trophy,
  TrendingUp,
  Users,
  Palette,
  Crown,
  Sliders,
  Calendar,
  Settings,
  Bell,
  Brain,
} from 'lucide-react';

export const DesktopLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!isDesktop) {
    return <>{children}</>;
  }

  const { isConnected, roomName, users } = useWebSocket();

  useEffect(() => {
    // Initialize adapter listeners (like window close)
    const adapter = getDesktopAdapter();

    // Sync tray status
    const status = isConnected ? 'online' : 'offline';
    adapter.setTrayStatus(status).catch(console.error);

    return () => {
      // cleanup if needed
    };
  }, [isConnected]);

  const [view, setView] = React.useState<
    | 'desktop'
    | 'shop'
    | 'tournament'
    | 'clans'
    | 'identity'
    | 'meta'
    | 'admin'
    | 'seasons'
    | 'brain'
  >('desktop');
  const [showSettings, setShowSettings] = React.useState(false);

  return (
    <div className='flex flex-col h-screen w-full bg-background overflow-hidden'>
      <SettingsModal open={showSettings} onOpenChange={setShowSettings} />

      {/* Header/Nav */}
      <header className='h-16 border-b border-border bg-card/50 backdrop-blur px-6 flex items-center justify-between shrink-0 z-50'>
        <div className='flex items-center gap-4'>{/* ... existing ... logo ... */}</div>

        <div className='flex items-center gap-3'>
          {/* ... existing buttons ... */}

          {/* Notifications (Mockup for now) */}
          <button className='p-2 hover:bg-white/5 rounded-full relative text-slate-400 hover:text-white transition-colors'>
            <Bell className='w-5 h-5' />
            <span className='absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-slate-900'></span>
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className='p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors'
          >
            <Settings className='w-5 h-5' />
          </button>
        </div>
      </header>
      {/* Desktop Specific Header / Titlebar Area */}
      {/* We can make this draggable region for Tauri later */}
      <div
        className='h-8 flex items-center justify-between px-4 bg-muted/30 select-none border-b border-border/40'
        data-tauri-drag-region
      >
        <span className='text-xs font-semibold text-muted-foreground/70 tracking-widest uppercase'>
          Cospira Desktop
        </span>
        <div className='flex items-center gap-3'>
          {/* Connection Health Indicator */}
          <div
            className='flex items-center gap-1.5'
            title={isConnected ? 'Connected' : 'Disconnected'}
          >
            <Wifi
              className={cn(
                'w-3 h-3 transition-colors',
                isConnected ? 'text-emerald-500' : 'text-destructive'
              )}
            />
          </div>

          {/* Window Controls */}
          <div className='flex items-center gap-3 ml-auto'>
            {/* Tournament Button */}
            <button
              onClick={() => setView((v) => (v === 'tournament' ? 'desktop' : 'tournament'))}
              className='flex items-center gap-2 px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors border border-indigo-500/20'
            >
              <Trophy className='w-3.5 h-3.5' />
              <span className='text-xs font-bold'>CUPS</span>
            </button>

            {/* Meta Button */}
            <button
              onClick={() => setView((v) => (v === 'meta' ? 'desktop' : 'meta'))}
              className='flex items-center gap-2 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg transition-colors border border-amber-500/20'
            >
              <Crown className='w-3.5 h-3.5' />
              <span className='text-xs font-bold'>META</span>
            </button>

            {/* Admin Button */}
            <button
              onClick={() => setView((v) => (v === 'admin' ? 'desktop' : 'admin'))}
              className='flex items-center gap-2 px-3 py-1 bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 rounded-lg transition-colors border border-slate-500/20'
            >
              <Sliders className='w-3.5 h-3.5' />
              <span className='text-xs font-bold'>ADMIN</span>
            </button>

            {/* BRAIN Button (Elite) */}
            <button
              onClick={() => setView((v) => (v === 'brain' ? 'desktop' : 'brain'))}
              className='flex items-center gap-2 px-3 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-400 rounded-lg transition-colors border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
            >
              <Brain className='w-3.5 h-3.5' />
              <span className='text-xs font-bold'>BRAIN</span>
            </button>

            {/* Seasons Button */}
            <button
              onClick={() => setView((v) => (v === 'seasons' ? 'desktop' : 'seasons'))}
              className='flex items-center gap-2 px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors border border-indigo-500/20'
            >
              <Calendar className='w-3.5 h-3.5' />
              <span className='text-xs font-bold'>PASS</span>
            </button>

            {/* Clans Button */}
            <button
              onClick={() => setView((v) => (v === 'clans' ? 'desktop' : 'clans'))}
              className='flex items-center gap-2 px-3 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition-colors border border-yellow-500/20'
            >
              <Users className='w-3.5 h-3.5' />
              <span className='text-xs font-bold'>CLANS</span>
            </button>

            {/* Identity Button */}
            <button
              onClick={() => setView((v) => (v === 'identity' ? 'desktop' : 'identity'))}
              className='flex items-center gap-2 px-3 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg transition-colors border border-purple-500/20'
            >
              <Palette className='w-3.5 h-3.5' />
              <span className='text-xs font-bold'>STYLE</span>
            </button>

            {/* Shop Button */}
            <button
              onClick={() => setView((v) => (v === 'shop' ? 'desktop' : 'shop'))}
              className='flex items-center gap-2 px-3 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition-colors border border-yellow-500/20'
            >
              <ShoppingBag className='w-3.5 h-3.5' />
              <span className='text-xs font-bold'>SHOP</span>
            </button>

            <div className='flex items-center gap-1 border-l border-border/20 pl-2'>
              <button
                onClick={() => getCurrentWindow().minimize()}
                className='p-1 hover:bg-muted/50 rounded-md text-muted-foreground hover:text-foreground transition-colors'
              >
                <Minus className='w-3.5 h-3.5' />
              </button>
              <button
                onClick={() => getCurrentWindow().close()}
                className='p-1 hover:bg-destructive/10 hover:text-destructive rounded-md text-muted-foreground transition-colors'
              >
                <X className='w-3.5 h-3.5' />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className='flex flex-1 overflow-hidden'>
        {/* Persistent Sidebar (only visible when in a room or configured to be always on) */}
        {roomName && (
          <div className='w-16 flex flex-col items-center py-4 bg-card border-r border-border/40 gap-4'>
            <div className='w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary animate-pulse-subtle'>
              <Activity className='w-5 h-5' />
            </div>
            <div className='flex-1 flex flex-col items-center gap-2'>
              {/* Room Avatars or Indicators could go here */}
              <div className='text-[10px] text-muted-foreground font-mono writing-vertical-rl rotate-180 uppercase tracking-wider'>
                {roomName}
              </div>
            </div>
            <div className='text-[10px] font-bold text-muted-foreground'>{users.length}</div>
          </div>
        )}

        {/* Main Content Area */}
        <main className='flex-1 relative overflow-auto'>
          {view === 'shop' ? (
            <Shop />
          ) : view === 'tournament' ? (
            <TournamentLobby />
          ) : view === 'clans' ? (
            <ClanManager />
          ) : view === 'identity' ? (
            <IdentityEditor />
          ) : view === 'meta' ? (
            <MetaLeaderboard />
          ) : view === 'admin' ? (
            <BalanceDashboard />
          ) : view === 'seasons' ? (
            <SeasonHub />
          ) : view === 'brain' ? (
            <BrainDashboard />
          ) : (
            children
          )}
        </main>

        {/* RIGHT SIDEBAR (Social) */}
        {!roomName && (
          <div className='w-64 border-l border-border/40 flex flex-col bg-background/50 backdrop-blur-sm'>
            <FriendsList />
            <div className='h-px bg-border/40 my-2' />
            <div className='flex-1 overflow-hidden p-2'>
              <GlobalChat />
            </div>
          </div>
        )}
      </div>

      {/* Background Status Label */}
      {!roomName && (
        <div className='h-6 bg-muted/10 border-t border-border/20 flex items-center justify-end px-3'>
          <span className='text-[10px] text-muted-foreground/60'>Ready to join</span>
        </div>
      )}
    </div>
  );
};
