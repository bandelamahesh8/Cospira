/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * CommandNetworkPanel — Multi-Room Command Center
 *
 * Only visible to command room operators (HOST/COHOST of a command room).
 * Shows live status of all child rooms and provides cross-room controls.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Radio,
  Users,
  Lock,
  MessageSquare,
  X,
  Mic,
  BarChart2,
  ChevronDown,
  Loader2,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoomStateBadge } from './RoomStateBadge';

interface ChildRoom {
  roomId: string;
  name: string;
  state: string;
  participantCount: number;
  duration: number;
  purpose: string;
}

interface NetworkTotals {
  participants: number;
  rooms: number;
}

interface CommandNetworkPanelProps {
  commandRoomId: string;
   
  socket: any;
  isHost: boolean;
}

export function CommandNetworkPanel({ commandRoomId, socket, isHost }: CommandNetworkPanelProps) {
  const [rooms, setRooms] = useState<ChildRoom[]>([]);
  const [totals, setTotals] = useState<NetworkTotals>({ participants: 0, rooms: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [addRoomId, setAddRoomId] = useState('');
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!socket) return;
    setIsLoading(true);
    socket.emit('command:network_status', { commandRoomId });
  }, [socket, commandRoomId]);

  useEffect(() => {
    if (!socket) return;
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (!socket) return;

    socket.on(
      'command:network_status',
      ({
        commandRoomId: cid,
        rooms: r,
        totals: t,
      }: {
        commandRoomId: string;
        rooms: ChildRoom[];
        totals: NetworkTotals;
      }) => {
        if (cid !== commandRoomId) return;
        setRooms(r ?? []);
        setTotals(t ?? { participants: 0, rooms: 0 });
        setIsLoading(false);
      }
    );

    socket.on('command:broadcast_sent', ({ broadcastTo }: { broadcastTo: string[] }) => {
      setLastResult(`Broadcast sent to ${broadcastTo.length} room(s).`);
      setIsBroadcasting(false);
      setBroadcastMsg('');
      setTimeout(() => setLastResult(null), 4000);
    });

    socket.on('command:network_locked', ({ lockedRooms }: { lockedRooms: string[] }) => {
      setLastResult(`${lockedRooms.length} room(s) locked.`);
      setTimeout(() => setLastResult(null), 4000);
      refresh();
    });

    socket.on('command:network_created', () => refresh());

    return () => {
      socket.off('command:network_status');
      socket.off('command:broadcast_sent');
      socket.off('command:network_locked');
      socket.off('command:network_created');
    };
  }, [socket, commandRoomId, refresh]);

  const handleBroadcast = () => {
    if (!broadcastMsg.trim() || !isHost) return;
    setIsBroadcasting(true);
    socket?.emit('command:broadcast', {
      commandRoomId,
      message: { text: broadcastMsg, type: 'announcement' },
    });
  };

  const handleLockAll = () => {
    if (!isHost) return;
    socket?.emit('command:lock_all', { commandRoomId });
  };

  const handleEndAll = () => {
    if (!isHost) return;
    socket?.emit('command:end_all', { commandRoomId });
  };

  const handleAddChild = () => {
    if (!addRoomId.trim()) return;
    socket?.emit('command:create_network', { commandRoomId, childRoomIds: [addRoomId] });
    setAddRoomId('');
  };

  return (
    <div className='flex flex-col gap-4'>
      {/* ── Header ────────────────────────────── */}
      <div className='flex items-center gap-2'>
        <div className='w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center'>
          <Radio size={12} className='text-cyan-400' />
        </div>
        <div>
          <h3 className='text-xs font-black uppercase tracking-widest text-white'>
            Command Network
          </h3>
          <p className='text-[10px] text-slate-500'>Multi-room coordination center</p>
        </div>
        <button
          onClick={refresh}
          className='ml-auto text-slate-600 hover:text-white transition-colors'
        >
          <BarChart2 size={12} />
        </button>
      </div>

      {/* ── Network Totals ─────────────────────── */}
      <div className='grid grid-cols-2 gap-2'>
        {[
          { label: 'Total Rooms', value: totals.rooms, icon: Shield, color: 'text-cyan-400' },
          {
            label: 'Total Participants',
            value: totals.participants,
            icon: Users,
            color: 'text-purple-400',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className='rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-2'
          >
            <stat.icon size={14} className={stat.color} />
            <div>
              <p className='text-lg font-black text-white'>{stat.value}</p>
              <p className='text-[9px] text-slate-600 uppercase tracking-widest'>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Last Result Notice ─────────────────── */}
      {lastResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className='rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-400 font-bold'
        >
          ✓ {lastResult}
        </motion.div>
      )}

      {/* ── Broadcast ─────────────────────────── */}
      {isHost && (
        <div className='rounded-2xl bg-white/3 border border-white/10 p-3 flex flex-col gap-2'>
          <p className='text-[10px] font-black uppercase tracking-widest text-slate-500'>
            Broadcast Message
          </p>
          <div className='flex gap-2'>
            <Input
              value={broadcastMsg}
              onChange={(e) => setBroadcastMsg(e.target.value)}
              placeholder='Message to all rooms…'
              className='h-8 flex-1 bg-white/5 border-white/10 text-white placeholder:text-slate-600 text-xs rounded-lg'
              onKeyDown={(e) => e.key === 'Enter' && handleBroadcast()}
            />
            <Button
              size='sm'
              onClick={handleBroadcast}
              disabled={isBroadcasting || !broadcastMsg.trim()}
              className='h-8 px-3 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg text-xs font-bold border border-cyan-500/20'
            >
              {isBroadcasting ? (
                <Loader2 size={12} className='animate-spin' />
              ) : (
                <MessageSquare size={12} />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── Emergency Controls ─────────────────── */}
      {isHost && (
        <div className='flex gap-2'>
          <Button
            size='sm'
            onClick={handleLockAll}
            className='flex-1 h-8 text-[10px] font-black bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-xl border border-amber-500/20'
          >
            <Lock size={10} className='mr-1' /> Lock All
          </Button>
          <Button
            size='sm'
            onClick={handleEndAll}
            className='flex-1 h-8 text-[10px] font-black bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl border border-red-500/20'
          >
            <X size={10} className='mr-1' /> End All
          </Button>
        </div>
      )}

      {/* ── Child Rooms ────────────────────────── */}
      {isLoading ? (
        <div className='flex items-center justify-center py-8'>
          <Loader2 size={16} className='animate-spin text-slate-600' />
        </div>
      ) : rooms.length === 0 ? (
        <div className='text-center py-8 rounded-2xl bg-white/2 border border-white/5'>
          <Radio size={20} className='text-slate-700 mx-auto mb-2' />
          <p className='text-xs text-slate-600'>No child rooms linked.</p>
        </div>
      ) : (
        <div className='flex flex-col gap-1.5'>
          {rooms.map((room) => (
            <div
              key={room.roomId}
              className='rounded-xl bg-white/5 border border-white/10 overflow-hidden'
            >
              <button
                onClick={() => setExpandedRoom((e) => (e === room.roomId ? null : room.roomId))}
                className='w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition-colors'
              >
                <div className='flex-1 min-w-0'>
                  <p className='text-xs font-bold text-white truncate'>{room.name}</p>
                  <div className='flex items-center gap-2 mt-0.5'>
                    <Users size={9} className='text-slate-600' />
                    <span className='text-[10px] text-slate-500'>{room.participantCount}</span>
                    <span className='text-slate-700'>·</span>
                    <span className='text-[9px] uppercase tracking-widest text-slate-600'>
                      {room.state}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  size={12}
                  className={`text-slate-600 transition-transform ${expandedRoom === room.roomId ? 'rotate-180' : ''}`}
                />
              </button>

              {expandedRoom === room.roomId && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className='px-3 pb-3 border-t border-white/5'
                >
                  <div className='flex flex-col gap-2 pt-2'>
                    {isHost && (
                      <div className='flex gap-2'>
                        <Button
                          size='sm'
                          onClick={() =>
                            socket?.emit('command:inject_speaker', {
                              commandRoomId,
                              targetRoomId: room.roomId,
                              targetUserId: 'host',
                            })
                          }
                          className='flex-1 h-7 text-[9px] font-bold bg-white/5 text-slate-400 hover:bg-white/10 rounded-lg'
                        >
                          <Mic size={9} className='mr-1' /> Inject Speaker
                        </Button>
                      </div>
                    )}
                    <p className='text-[9px] text-slate-600 font-mono'>{room.roomId}</p>
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Add Child Room ─────────────────────── */}
      {isHost && (
        <div className='flex gap-2'>
          <Input
            value={addRoomId}
            onChange={(e) => setAddRoomId(e.target.value)}
            placeholder='Add room ID…'
            className='h-8 flex-1 bg-white/5 border-white/10 text-white placeholder:text-slate-600 text-xs rounded-lg'
            onKeyDown={(e) => e.key === 'Enter' && handleAddChild()}
          />
          <Button
            size='sm'
            onClick={handleAddChild}
            className='h-8 px-3 bg-white/10 text-white hover:bg-white/20 rounded-lg text-xs font-bold'
          >
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
