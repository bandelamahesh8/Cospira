/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useState, useRef, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Terminal, Hash, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useSoundEffects } from '@/hooks/useSoundEffects';

import { ChatMessage } from '@/types/social';

export const GlobalChat = () => {
  // Cast chatMessages to ChatMessage[] if necessary or ensure useWebSocket returns it
  const { socket, chatMessages } = useWebSocket() as { socket: any; chatMessages: ChatMessage[] };
  const { user } = useAuth();
  const { playClick, playHover, playSuccess } = useSoundEffects();
  const [msg, setMsg] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageCount = useRef(chatMessages.length);

  // Auto-scroll and Sound on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }

    // Play sound if new message arrived (and it wasn't me, or maybe even if it was me for confirmation)
    if (chatMessages.length > lastMessageCount.current) {
      const newMsg = chatMessages[chatMessages.length - 1];
      if (newMsg.senderId !== user?.id) {
        playHover(); // Soft tick for incoming
      }
      lastMessageCount.current = chatMessages.length;
    }
  }, [chatMessages, user?.id, playHover]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim() || !socket) return;

    playClick();
    socket.emit('global-chat-message', { content: msg.trim() });
    setMsg('');
  };

  return (
    <div className='flex flex-col flex-1 w-full bg-[#030508]/95 backdrop-blur-xl overflow-hidden relative group'>
      {/* Decoration */}
      <div className='absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-50' />

      {/* Header */}
      <div className='px-4 py-3 border-b border-white/5 flex items-center justify-between bg-black/20'>
        <div className='flex items-center gap-2.5'>
          <div className='w-8 h-8 rounded bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-center text-cyan-400'>
            <Terminal className='w-4 h-4' />
          </div>
          <div>
            <h3 className='font-bold text-white text-xs uppercase tracking-widest flex items-center gap-2'>
              Global_Net
              <span className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' />
            </h3>
            <p className='text-[9px] text-cyan-500/50 font-mono tracking-wider'>
              SECURE CONNECTION
            </p>
          </div>
        </div>
        <div className='flex items-center gap-1 text-[10px] text-white/20 font-mono'>
          <Activity className='w-3 h-3' />
          <span>{chatMessages.length} PKTS</span>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea
        className="flex-1 p-4 bg-[url('/grid.svg')] bg-fixed bg-opacity-5"
        ref={scrollRef}
      >
        <div className='space-y-4'>
          {chatMessages.map((m) => {
            const isMe =
              m.senderName === user?.user_metadata?.display_name || m.senderName === user?.email;
            return (
              <div
                key={m.id}
                className={cn('flex gap-3 items-start group/msg', isMe ? 'flex-row-reverse' : '')}
              >
                <Avatar
                  className={cn(
                    'w-7 h-7 mt-0.5 border border-white/10 ring-2 ring-transparent transition-all',
                    isMe ? 'ring-cyan-500/20' : 'group-hover/msg:ring-purple-500/20'
                  )}
                >
                  <AvatarFallback
                    className={cn(
                      'text-[9px] font-bold',
                      isMe ? 'bg-cyan-950 text-cyan-400' : 'bg-slate-900 text-slate-400'
                    )}
                  >
                    {m.senderName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div
                  className={cn(
                    'max-w-[85%] rounded-lg p-3 text-xs border relative transition-all duration-300',
                    isMe
                      ? 'bg-cyan-950/30 border-cyan-500/20 text-cyan-50 rounded-tr-none shadow-[0_4px_20px_rgba(6,182,212,0.1)]'
                      : 'bg-[#0a0f18] border-white/5 text-slate-300 rounded-tl-none hover:border-white/10'
                  )}
                >
                  {!isMe && (
                    <p className='font-bold text-[9px] text-purple-400 mb-1 uppercase tracking-wider flex items-center gap-1'>
                      {m.senderName}
                      <span className='text-[8px] text-white/10 font-mono'>
                        #{m.senderId.slice(0, 4)}
                      </span>
                    </p>
                  )}
                  <p className='leading-relaxed'>{m.content}</p>
                  <p
                    className={cn(
                      'text-[9px] font-mono mt-1.5 opacity-40 uppercase tracking-widest text-right',
                      isMe ? 'text-cyan-200' : 'text-slate-500'
                    )}
                  >
                    {format(new Date(m.timestamp), 'HH:mm:ss')}
                  </p>

                  {/* Corner Accent */}
                  <div
                    className={cn(
                      'absolute w-1.5 h-1.5',
                      isMe
                        ? 'top-0 right-0 border-t border-r border-cyan-500/50'
                        : 'top-0 left-0 border-t border-l border-white/20'
                    )}
                  />
                </div>
              </div>
            );
          })}
          {chatMessages.length === 0 && (
            <div className='flex flex-col items-center justify-center py-20 opacity-30 gap-2'>
              <Hash className='w-8 h-8 text-white/50' />
              <p className='text-[10px] text-white font-mono uppercase tracking-widest'>
                Channel Empty
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <form
        onSubmit={send}
        className='p-3 bg-black/40 border-t border-white/5 flex gap-2 backdrop-blur-md'
      >
        <Input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder='Transmitting to global net...'
          className='bg-white/5 border-white/5 text-white h-10 text-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50 placeholder:text-white/20 rounded-lg font-medium'
          onFocus={playHover}
        />
        <Button
          size='icon'
          className='h-10 w-10 bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all hover:scale-105 border border-cyan-400/20'
        >
          <Send className='w-4 h-4' />
        </Button>
      </form>
    </div>
  );
};
