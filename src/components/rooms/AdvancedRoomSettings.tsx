import React, { useState, useRef } from 'react';
import {
  Users,
  Lock,
  Zap,
  MessageSquare,
  Mic,
  Clock,
  Cpu,
  Monitor,
  Building2,
  GraduationCap,
  Wrench,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export interface AdvancedSettings {
  invite_only: boolean;
  join_by_link: boolean;
  join_by_code: boolean;
  host_only_code_visibility: boolean;
  waiting_lobby: boolean;
  organization_only: boolean;
  host_controlled_speaking: boolean;
  chat_permission: 'everyone' | 'host_only' | 'none';
  encryption_enabled: boolean;
  ai_moderation_level: 'off' | 'passive' | 'active';
  auto_close_minutes: number;
  smart_room_mode: 'free' | 'presentation' | 'townhall' | 'lecture' | 'workshop';
  neural_protocols_enabled: boolean;
  require_reapproval_on_rejoin: boolean;
}

const SMART_MODES = [
  {
    value: 'free',
    label: 'Free',
    tagline: 'Pure Manual',
    icon: Zap,
    activeColor: 'text-zinc-400',
    description: 'No automatic restrictions. Governance is purely manual by the host agents.',
    policies: ['Manual Moderation', 'Custom Rules'],
  },
  {
    value: 'presentation',
    label: 'Presentation',
    tagline: 'Host-Centric',
    icon: Monitor,
    activeColor: 'text-blue-400',
    description:
      'Only host and assigned speakers can use mic or share screen. Mutes all others automatically.',
    policies: ['Auto-Mute Audience', 'Screen-Share Restricted'],
  },
  {
    value: 'townhall',
    label: 'Town Hall',
    tagline: 'Scalable',
    icon: Building2,
    activeColor: 'text-amber-400',
    description:
      'Optimized for large groups. Automatically enables waiting lobby when room size > 50.',
    policies: ['Smart Lobby @50', 'Auto-Host Promotion'],
  },
  {
    value: 'lecture',
    label: 'Lecture',
    tagline: 'Audience Silence',
    icon: GraduationCap,
    activeColor: 'text-purple-400',
    description:
      'Strict control. Audience cannot request mic unless host enables Q&A mode. High-quality audio priority.',
    policies: ['Disabled Mic Requests', 'HD Audio Bypass'],
  },
  {
    value: 'workshop',
    label: 'Workshop',
    tagline: 'Session Labs',
    icon: Wrench,
    activeColor: 'text-emerald-400',
    description: 'Collaborative mode. Enables breakout permissions and auto-session timer.',
    policies: ['Breakout Sync', '90m Auto-Close'],
  },
] as const;

interface SmartModeGridProps {
  value: AdvancedSettings['smart_room_mode'];
  onChange: (mode: AdvancedSettings['smart_room_mode']) => void;
}

const SmartModeGrid: React.FC<SmartModeGridProps> = ({ value, onChange }) => {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = (mode: string) => {
    timerRef.current = setTimeout(() => {
      setShowTooltip(mode);
    }, 3000);
  };

  const handleMouseLeave = () => {
    setShowTooltip(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pl-1'>
      {SMART_MODES.map((mode) => (
        <div
          key={mode.value}
          className='relative'
          onMouseEnter={() => handleMouseEnter(mode.value)}
          onMouseLeave={handleMouseLeave}
        >
          <button
            type='button'
            onClick={() => onChange(mode.value)}
            className={`w-full p-4 rounded-2xl border transition-all duration-300 text-left group
                            ${
                              value === mode.value
                                ? `${mode.activeColor} border-current bg-white/[0.03] scale-[1.02] shadow-[0_0_20px_-5px_rgba(0,0,0,0.5)]`
                                : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]'
                            }`}
          >
            <div className='flex flex-col gap-3'>
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${value === mode.value ? 'bg-current/20' : 'bg-white/5 group-hover:bg-white/10'}`}
              >
                <mode.icon
                  className={`w-5 h-5 ${value === mode.value ? 'text-current' : 'text-zinc-500'}`}
                />
              </div>
              <div>
                <div
                  className={`text-[11px] font-black uppercase tracking-tight mb-0.5 ${value === mode.value ? 'text-white' : 'text-zinc-400'}`}
                >
                  {mode.label}
                </div>
                <div className='text-[9px] text-zinc-500 uppercase font-bold leading-tight line-clamp-2'>
                  {mode.tagline}
                </div>
              </div>
            </div>
          </button>

          {/* Tooltip */}
          {showTooltip === mode.value && (
            <div className='absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 p-5 bg-[#0a0c10] border border-white/10 rounded-2xl shadow-2xl animate-in fade-in zoom-in slide-in-from-bottom-2 duration-300 backdrop-blur-xl ring-1 ring-white/10'>
              <div className='flex items-center gap-2 mb-3'>
                <mode.icon className={`w-4 h-4 ${mode.activeColor}`} />
                <span className='text-[10px] font-black text-white uppercase tracking-wider'>
                  {mode.label} Protocol
                </span>
                <div className='ml-auto h-1 w-1 rounded-full bg-purple-500 animate-pulse' />
              </div>
              <p className='text-[10px] text-zinc-400 leading-relaxed uppercase font-medium mb-3'>
                {mode.description}
              </p>
              <div className='space-y-1.5 pt-3 border-t border-white/5'>
                {mode.policies.map((p, i) => (
                  <div
                    key={i}
                    className='flex items-center gap-2 text-[8px] text-zinc-500 font-bold uppercase tracking-wider'
                  >
                    <div
                      className={`w-1 h-1 rounded-full ${mode.activeColor.replace('text-', 'bg-')}`}
                    />
                    {p}
                  </div>
                ))}
              </div>
              <div className='absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0a0c10] border-r border-b border-white/10 rotate-45' />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

interface Props {
  settings: AdvancedSettings;
  onChange: (settings: AdvancedSettings) => void;
}

export const AdvancedRoomSettings: React.FC<Props> = ({ settings, onChange }) => {
  const updateSetting = <K extends keyof AdvancedSettings>(key: K, value: AdvancedSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className='space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500'>
      {/* Master Activation Switch */}
      <div className='flex items-center justify-between p-5 bg-indigo-500/5 rounded-[2rem] border border-indigo-500/10 mb-2 group hover:bg-indigo-500/10 transition-all duration-500'>
        <div className='flex items-center gap-4'>
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${settings.neural_protocols_enabled ? 'bg-indigo-500 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)] rotate-0' : 'bg-white/5 border-white/10 rotate-12 grayscale'}`}
          >
            <Cpu
              className={`w-6 h-6 ${settings.neural_protocols_enabled ? 'text-white translate-y-0' : 'text-zinc-600 -translate-y-0.5'}`}
            />
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h2
                className={`text-sm font-black uppercase tracking-[0.1em] transition-colors duration-500 ${settings.neural_protocols_enabled ? 'text-white' : 'text-zinc-500'}`}
              >
                Neural Protocol Activation
              </h2>
              <div
                className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${settings.neural_protocols_enabled ? 'bg-indigo-500 text-white animate-pulse' : 'bg-white/5 text-zinc-700'}`}
              >
                {settings.neural_protocols_enabled ? 'Active' : 'Standby'}
              </div>
            </div>
            <p className='text-[10px] font-bold text-zinc-500 uppercase tracking-tighter mt-1'>
              {settings.neural_protocols_enabled
                ? 'Neural Engine engaged. Advanced behavioral overrides are online.'
                : 'Protocols offline. Room is operating on standard legacy logic.'}
            </p>
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <span
            className={`text-[10px] font-black uppercase tracking-widest transition-colors ${settings.neural_protocols_enabled ? 'text-indigo-400' : 'text-zinc-700'}`}
          >
            {settings.neural_protocols_enabled ? 'PROTOCOL_ON' : 'PROTOCOL_OFF'}
          </span>
          <Switch
            checked={settings.neural_protocols_enabled}
            onCheckedChange={(val) => updateSetting('neural_protocols_enabled', val)}
            className='scale-125 data-[state=checked]:bg-indigo-500'
          />
        </div>
      </div>

      <div
        className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-700 ${!settings.neural_protocols_enabled ? 'opacity-25 grayscale pointer-events-none blur-[1px] translate-y-2 scale-[0.99]' : 'opacity-100 grayscale-0'}`}
      >
        {/* Access & Entry */}
        <div className='space-y-4'>
          <div className='flex items-center gap-2 mb-4'>
            <Lock className='w-3.5 h-3.5 text-blue-400' />
            <h3 className='text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]'>
              Access & Entry
            </h3>
          </div>

          <div className='flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all group'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20 transition-all'>
                <Lock className='w-5 h-5 text-blue-400' />
              </div>
              <div className='text-left'>
                <Label className='text-xs font-bold text-white uppercase tracking-tight'>
                  Invite Only
                </Label>
                <p className='text-[9px] text-zinc-500 uppercase tracking-tighter'>
                  Only manually invited agents can enter
                </p>
              </div>
            </div>
            <Switch
              checked={settings.invite_only}
              onCheckedChange={(val) => updateSetting('invite_only', val)}
            />
          </div>

          <div className='flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all group'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20 transition-all'>
                <Users className='w-5 h-5 text-blue-400' />
              </div>
              <div className='text-left'>
                <Label className='text-xs font-bold text-white uppercase tracking-tight'>
                  Waiting Lobby
                </Label>
                <p className='text-[9px] text-zinc-500 uppercase tracking-tighter'>
                  Host must approve entry requests
                </p>
              </div>
            </div>
            <Switch
              checked={settings.waiting_lobby}
              onCheckedChange={(val) => updateSetting('waiting_lobby', val)}
            />
          </div>

          <div className='flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all group'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20 transition-all'>
                <Lock className='w-5 h-5 text-blue-400' />
              </div>
              <div className='text-left'>
                <Label className='text-xs font-bold text-white uppercase tracking-tight'>
                  Require Approval on Rejoin
                </Label>
                <p className='text-[9px] text-zinc-500 uppercase tracking-tighter'>
                  Force re-approval if guest refreshes
                </p>
              </div>
            </div>
            <Switch
              checked={settings.require_reapproval_on_rejoin}
              onCheckedChange={(val) => updateSetting('require_reapproval_on_rejoin', val)}
            />
          </div>
        </div>

        {/* Permissions & Controls */}
        <div className='space-y-4'>
          <div className='flex items-center gap-2 mb-4'>
            <Mic className='w-3.5 h-3.5 text-purple-400' />
            <h3 className='text-[10px] font-black text-purple-500 uppercase tracking-[0.2em]'>
              Permissions & Controls
            </h3>
          </div>

          <div className='flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all group'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-500/20 transition-all'>
                <Mic className='w-5 h-5 text-purple-400' />
              </div>
              <div className='text-left'>
                <Label className='text-xs font-bold text-white uppercase tracking-tight'>
                  Host Mic Control
                </Label>
                <p className='text-[9px] text-zinc-500 uppercase tracking-tighter'>
                  Only approved speakers can unmute
                </p>
              </div>
            </div>
            <Switch
              checked={settings.host_controlled_speaking}
              onCheckedChange={(val) => updateSetting('host_controlled_speaking', val)}
            />
          </div>

          <div className='flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all group'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-500/20 transition-all'>
                <MessageSquare className='w-5 h-5 text-purple-400' />
              </div>
              <div className='text-left'>
                <Label className='text-xs font-bold text-white uppercase tracking-tight'>
                  Chat Protocol
                </Label>
                <select
                  value={settings.chat_permission}
                  onChange={(e) =>
                    updateSetting(
                      'chat_permission',
                      e.target.value as 'everyone' | 'host_only' | 'none'
                    )
                  }
                  className='bg-transparent border-none text-[10px] text-purple-400 font-bold uppercase outline-none p-0 cursor-pointer block mt-0.5 hover:text-purple-300 transition-colors'
                >
                  <option value='everyone text-black' className='bg-[#0c1016]'>
                    Everyone Allowed
                  </option>
                  <option value='host_only text-black' className='bg-[#0c1016]'>
                    Host Only
                  </option>
                  <option value='none text-black' className='bg-[#0c1016]'>
                    System Muted
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Room Mode — expanded full-width */}
        <div className='space-y-3 md:col-span-2'>
          <div className='flex items-center gap-2 mb-1'>
            <Zap className='w-3.5 h-3.5 text-purple-400' />
            <h3 className='text-[10px] font-black text-purple-500 uppercase tracking-[0.2em]'>
              Smart Room Mode
            </h3>
            <span className='text-[8px] text-zinc-600 uppercase tracking-widest ml-auto'>
              Hover 3s for details
            </span>
          </div>
          <SmartModeGrid
            value={settings.smart_room_mode}
            onChange={(v) => updateSetting('smart_room_mode', v)}
          />
        </div>

        {/* Advanced Security & AI */}
        <div className='space-y-4 md:col-span-2'>
          <div className='flex items-center gap-2 mb-4'>
            <Cpu className='w-3.5 h-3.5 text-emerald-400' />
            <h3 className='text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]'>
              Advanced Security & Intelligence
            </h3>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all group'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all'>
                  <Cpu className='w-5 h-5 text-emerald-400' />
                </div>
                <div className='text-left'>
                  <Label className='text-xs font-bold text-white uppercase tracking-tight'>
                    AI Moderation
                  </Label>
                  <div className='flex gap-2 mt-1.5'>
                    {['off', 'passive', 'active'].map((l) => (
                      <button
                        key={l}
                        type='button'
                        onClick={() =>
                          updateSetting('ai_moderation_level', l as 'off' | 'passive' | 'active')
                        }
                        className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-lg transition-all border ${
                          settings.ai_moderation_level === l
                            ? 'bg-emerald-500 text-black border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                            : 'bg-white/5 text-zinc-500 border-white/5 hover:text-zinc-400 hover:bg-white/10'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className='flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all group'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all'>
                  <Clock className='w-5 h-5 text-emerald-400' />
                </div>
                <div className='text-left'>
                  <Label className='text-xs font-bold text-white uppercase tracking-tight'>
                    Auto Termination
                  </Label>
                  <div className='flex items-center gap-2 mt-1.5 bg-black/40 border border-white/10 rounded-lg px-2 py-1 focus-within:border-emerald-500/50 transition-all'>
                    <input
                      type='number'
                      value={settings.auto_close_minutes}
                      onChange={(e) =>
                        updateSetting('auto_close_minutes', parseInt(e.target.value))
                      }
                      className='bg-transparent border-none w-10 text-[10px] text-white font-black outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                    />
                    <span className='text-[8px] text-zinc-500 uppercase font-black tracking-widest'>
                      MINS
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
