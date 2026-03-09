import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useOrganization } from '@/contexts/useOrganization';
import { ModePolicyResolver } from '@/lib/ModePolicyResolver';
import { OrgMode } from '@/types/organization';
import {
  Building2,
  Plus,
  Shield,
  Lock,
  Key,
  Activity,
  Radio,
  HardDrive,
  Wifi,
  Fingerprint,
  RefreshCcw,
  Eye,
  MonitorSmartphone,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CreateOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateOrganizationModal: React.FC<CreateOrganizationModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { createOrganization } = useOrganization();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [baseMode, setBaseMode] = useState<OrgMode>('PROF');
  const [isLoading, setIsLoading] = useState(false);

  // Tab State for Governance
  const [activeTab, setActiveTab] = useState<'identity' | 'data' | 'threat'>('identity');

  // Governance Activation
  const [governanceEnabled, setGovernanceEnabled] = useState(true);

  // --- Identity Security State ---
  const [identityTrustLevel, setIdentityTrustLevel] = useState<
    'standard' | 'verified' | 'domain' | 'hardware'
  >('standard');
  const [mfaPolicy, setMfaPolicy] = useState<'optional' | 'required' | 'device_bound'>('optional');
  const [deviceTrust, setDeviceTrust] = useState<'any' | 'trusted' | 'managed'>('any');
  const [networkAccess, setNetworkAccess] = useState<'open' | 'office' | 'vpn'>('open');

  // --- Data Protection State ---
  const [encryptionLevel, setEncryptionLevel] = useState<'standard' | 'e2e' | 'ephemeral'>(
    'standard'
  );
  const [sessionSecurity, setSessionSecurity] = useState<
    'standard' | 'auto_logout' | 'strict_reauth'
  >('standard');

  // --- Threat Protection State ---
  const [threatMonitoring, setThreatMonitoring] = useState<'disabled' | 'basic' | 'advanced'>(
    'basic'
  );
  const [auditLogging, setAuditLogging] = useState<'basic' | 'full' | 'compliance'>('basic');
  const [emergencyModeEnabled, setEmergencyModeEnabled] = useState(false);

  // Dynamic Select Wrapper to match premium aesthetic
  const NeuralSelect = ({
    label,
    value,
    onValueChange,
    options,
    icon: Icon,
  }: {
    label: string;
    value: string;
    onValueChange: (v: any) => void;
    options: { value: string; label: string }[];
    icon?: any;
  }) => (
    <div className='flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 transition-all hover:bg-white/[0.07] group'>
      <div className='flex items-center gap-3'>
        {Icon && (
          <Icon className='w-4 h-4 text-zinc-400 group-hover:text-indigo-400 transition-colors' />
        )}
        <div>
          <div className='text-[10px] font-black uppercase tracking-widest text-white/60 group-hover:text-white transition-colors'>
            {label}
          </div>
          <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger className='h-auto p-0 border-0 bg-transparent text-[11px] font-bold text-indigo-400 focus:ring-0 focus:ring-offset-0 transition-all hover:translate-x-1'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='bg-[#0c1016] border-white/10 text-white'>
              {options.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className='text-[11px] font-bold focus:bg-indigo-500/20 focus:text-indigo-300'
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) return;

    setIsLoading(true);
    try {
      // In a real app, passing all these advanced settings to the backend
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (createOrganization as any)(name, slug, baseMode, {
        identity_trust_level: identityTrustLevel,
        mfa_policy: mfaPolicy,
        device_trust: deviceTrust,
        network_access: networkAccess,
        encryption_level: encryptionLevel,
        session_security: sessionSecurity,
        threat_monitoring: threatMonitoring,
        audit_logging: auditLogging,
        emergency_mode_ready: emergencyModeEnabled,
      });
      onOpenChange(false);
      setName('');
      setSlug('');
    } catch {
      // Error handled in context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] sm:max-w-[1050px] bg-[#0c1016] border border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl'>
        {/* Header Background Effect */}
        <div className='absolute top-0 left-0 w-full h-40 bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-500/5 pointer-events-none' />

        <div className='relative z-10 flex flex-col max-h-[85vh]'>
          <div className='p-6 md:p-8 overflow-y-auto custom-scrollbar'>
            <DialogHeader className='mb-6'>
              <div className='flex items-center gap-5'>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className='w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner'
                >
                  <Building2 className='w-7 h-7 text-indigo-400' />
                </motion.div>
                <div>
                  <DialogTitle className='text-3xl font-black uppercase tracking-tighter text-white'>
                    Initialize Organization
                  </DialogTitle>
                  <DialogDescription className='text-white/40 font-medium text-base'>
                    Establish a secure high-integrity domain for your neural operations.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form
              onSubmit={handleSubmit}
              className='grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10'
            >
              {/* Column 1: Identity & Security */}
              <div className='space-y-5 md:space-y-6'>
                <div className='flex items-center gap-2 mb-2'>
                  <div className='h-0.5 w-4 bg-indigo-500' />
                  <span className='text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400'>
                    Core Identity
                  </span>
                </div>

                {/* Organization Name */}
                <div className='space-y-3'>
                  <Label
                    htmlFor='org-name'
                    className='text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-1'
                  >
                    Organization Name
                  </Label>
                  <div className='relative group'>
                    <Building2 className='absolute left-4 top-3.5 w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-colors' />
                    <Input
                      id='org-name'
                      placeholder='ACME CORP'
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (!slug || slug === name.toLowerCase().replace(/\s+/g, '-')) {
                          setSlug(
                            e.target.value
                              .toLowerCase()
                              .replace(/\s+/g, '-')
                              .replace(/[^a-z0-9-]/g, '')
                          );
                        }
                      }}
                      className='pl-11 h-12 bg-white/5 border-white/10 rounded-xl font-medium text-white placeholder:text-white/20 focus:bg-white/10 focus:border-indigo-500/50 transition-all'
                    />
                  </div>
                </div>

                {/* URL Slug removed per user request */}

                {/* Base Security Type */}

                {/* Base Security Type */}
                <div className='space-y-3'>
                  <Label className='text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-1'>
                    Encryption Protocol
                  </Label>
                  <div className='flex gap-2 p-1 bg-black/20 rounded-[14px] border border-white/5 relative'>
                    {(['FUN', 'PROF', 'ULTRA_SECURE'] as OrgMode[]).map((mode) => {
                      const badge = ModePolicyResolver.getBadge(mode);
                      const isActive = baseMode === mode;
                      return (
                        <motion.button
                          key={mode}
                          type='button'
                          onClick={() => setBaseMode(mode)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`relative flex-1 flex flex-col items-center justify-center p-3 rounded-xl transition-all z-10 ${
                            isActive ? 'text-white' : 'text-white/30 hover:text-white/50'
                          }`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId='baseModeHighlight'
                              className={`absolute inset-0 rounded-xl bg-white/5 border border-white/10 shadow-[inner_0_0_20px_rgba(255,255,255,0.02)] ${badge.color.split(' ')[0].replace('text-', 'border-')}`}
                              style={{ borderStyle: 'solid', borderWidth: '1px' }}
                              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            />
                          )}
                          <span className='text-xl mb-1 relative z-20'>{badge.emoji}</span>
                          <span className='text-[9px] font-black uppercase tracking-widest relative z-20'>
                            {badge.label}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Column 2: Governance & Permissions */}
              <div className='space-y-4 md:space-y-5'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <div className='h-0.5 w-4 bg-cyan-500' />
                    <span className='text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400'>
                      Security Domains
                    </span>
                  </div>
                  <div className='flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5'>
                    <span className='text-[9px] font-bold text-white/40 uppercase tracking-tighter'>
                      Governance Engine
                    </span>
                    <Switch
                      checked={governanceEnabled}
                      onCheckedChange={setGovernanceEnabled}
                      className='scale-75 data-[state=checked]:bg-cyan-500'
                    />
                  </div>
                </div>

                <motion.div
                  animate={{
                    opacity: governanceEnabled ? 1 : 0.5,
                    filter: governanceEnabled
                      ? 'grayscale(0%) blur(0px)'
                      : 'grayscale(100%) blur(2px)',
                    pointerEvents: governanceEnabled ? 'auto' : 'none',
                  }}
                  transition={{ duration: 0.4 }}
                  className='space-y-6'
                >
                  {/* Security Tabs Navigation */}
                  <div className='flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/5 relative'>
                    {(['identity', 'data', 'threat'] as const).map((tab) => {
                      const isActive = activeTab === tab;
                      const Icon =
                        tab === 'identity' ? Fingerprint : tab === 'data' ? HardDrive : Activity;
                      const activeColor =
                        tab === 'identity'
                          ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20'
                          : tab === 'data'
                            ? 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20'
                            : 'text-rose-300 bg-rose-500/10 border-rose-500/20';

                      return (
                        <motion.button
                          key={tab}
                          type='button'
                          onClick={() => setActiveTab(tab)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`relative flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all z-10 ${
                            isActive
                              ? activeColor
                              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                          }`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId='activeTabHighlight'
                              className={`absolute inset-0 rounded-xl shadow-inner border transition-colors ${activeColor.split(' ').slice(1).join(' ')}`}
                              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            />
                          )}
                          <Icon className='w-4 h-4 relative z-20' />
                          <span className='relative z-20'>{tab}</span>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Tab Content Area */}
                  <div className='relative min-h-[380px] bg-white/[0.02] border border-white/5 rounded-3xl p-5 overflow-hidden'>
                    <AnimatePresence mode='wait'>
                      {/* --- IDENTITY SECURITY TAB --- */}
                      {activeTab === 'identity' && (
                        <motion.div
                          key='identity'
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className='space-y-6'
                        >
                          {/* Identity Trust Level */}
                          <div className='space-y-3'>
                            <div className='flex items-center gap-2'>
                              <Shield className='w-4 h-4 text-indigo-400' />
                              <Label className='text-[10px] font-black uppercase tracking-widest text-white'>
                                Identity Trust Level
                              </Label>
                            </div>
                            <div className='grid grid-cols-2 gap-2'>
                              {(
                                [
                                  { value: 'standard', label: 'Standard', desc: 'Any user' },
                                  {
                                    value: 'verified',
                                    label: 'Verified Only',
                                    desc: 'Verified accounts',
                                  },
                                  {
                                    value: 'domain',
                                    label: 'Domain Bound',
                                    desc: 'e.g. @acme.com',
                                  },
                                  {
                                    value: 'hardware',
                                    label: 'Hardware Auth',
                                    desc: 'Passkey required',
                                  },
                                ] as const
                              ).map((opt) => {
                                const isActive = identityTrustLevel === opt.value;
                                return (
                                  <motion.button
                                    key={opt.value}
                                    type='button'
                                    onClick={() => setIdentityTrustLevel(opt.value)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`relative p-3 rounded-xl border text-left transition-all ${
                                      isActive
                                        ? 'border-indigo-500/30'
                                        : 'bg-white/5 border-white/5 hover:border-white/10 opacity-70 hover:opacity-100'
                                    }`}
                                  >
                                    {isActive && (
                                      <motion.div
                                        layoutId='identityTrustHighlight'
                                        className='absolute inset-0 rounded-xl bg-indigo-500/10 shadow-[inner_0_0_15px_rgba(99,102,241,0.05)]'
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                      />
                                    )}
                                    <div
                                      className={`relative z-10 text-[10px] font-black uppercase tracking-wider mb-1 ${isActive ? 'text-indigo-300' : 'text-zinc-400'}`}
                                    >
                                      {opt.label}
                                    </div>
                                    <div className='relative z-10 text-[8px] text-zinc-500 font-medium'>
                                      {opt.desc}
                                    </div>
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>

                          {/* MFA Policy */}
                          <NeuralSelect
                            label='MFA Enforcement'
                            value={mfaPolicy}
                            onValueChange={(v) => setMfaPolicy(v as any)}
                            icon={Key}
                            options={[
                              { value: 'optional', label: 'Optional' },
                              { value: 'required', label: 'Required for All Members' },
                              { value: 'device_bound', label: 'Required + Device Binding' },
                            ]}
                          />

                          {/* Device Trust */}
                          <NeuralSelect
                            label='Device Trust'
                            value={deviceTrust}
                            onValueChange={(v) => setDeviceTrust(v as any)}
                            icon={MonitorSmartphone}
                            options={[
                              { value: 'any', label: 'Allow Any Device' },
                              { value: 'trusted', label: 'Trusted Devices Only' },
                              { value: 'managed', label: 'Managed Devices Only' },
                            ]}
                          />

                          {/* Network Access */}
                          <NeuralSelect
                            label='Network Access'
                            value={networkAccess}
                            onValueChange={(v) => setNetworkAccess(v as any)}
                            icon={Wifi}
                            options={[
                              { value: 'open', label: 'Open (Any IP)' },
                              { value: 'office', label: 'Office IP Only' },
                              { value: 'vpn', label: 'Corporate VPN Required' },
                            ]}
                          />
                        </motion.div>
                      )}

                      {/* --- DATA PROTECTION TAB --- */}
                      {activeTab === 'data' && (
                        <motion.div
                          key='data'
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className='space-y-6'
                        >
                          {/* Encryption Level */}
                          <div className='space-y-3'>
                            <div className='flex items-center gap-2'>
                              <Lock className='w-4 h-4 text-cyan-400' />
                              <Label className='text-[10px] font-black uppercase tracking-widest text-white'>
                                Data Encryption Level
                              </Label>
                            </div>
                            <div className='grid grid-cols-1 gap-2'>
                              {(
                                [
                                  {
                                    value: 'standard',
                                    label: 'Standard Encryption',
                                    desc: 'Transit & At-Rest Encryption',
                                  },
                                  {
                                    value: 'e2e',
                                    label: 'End-to-End Encrypted',
                                    desc: 'Server cannot read messages',
                                  },
                                  {
                                    value: 'ephemeral',
                                    label: 'Ephemeral Sessions',
                                    desc: 'Data immediately destroyed after session',
                                  },
                                ] as const
                              ).map((opt) => {
                                const isActive = encryptionLevel === opt.value;
                                return (
                                  <motion.button
                                    key={opt.value}
                                    type='button'
                                    onClick={() => setEncryptionLevel(opt.value)}
                                    whileHover={{ scale: 1.01, x: 5 }}
                                    whileTap={{ scale: 0.99 }}
                                    className={`relative flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                                      isActive
                                        ? 'border-cyan-500/30'
                                        : 'bg-white/5 border-white/5 hover:border-white/10 opacity-70 hover:opacity-100'
                                    }`}
                                  >
                                    {isActive && (
                                      <motion.div
                                        layoutId='encryptionHighlight'
                                        className='absolute inset-0 rounded-xl bg-cyan-500/10 shadow-[inner_0_0_15px_rgba(6,182,212,0.05)]'
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                      />
                                    )}
                                    <div className='relative z-10'>
                                      <div
                                        className={`text-[10px] font-black uppercase tracking-wider text-left mb-0.5 ${isActive ? 'text-cyan-300' : 'text-zinc-400'}`}
                                      >
                                        {opt.label}
                                      </div>
                                      <div className='text-[9px] text-zinc-500 font-medium text-left'>
                                        {opt.desc}
                                      </div>
                                    </div>
                                    {isActive && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className='relative z-10 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                                      />
                                    )}
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Session Security */}
                          <NeuralSelect
                            label='Session Security'
                            value={sessionSecurity}
                            onValueChange={(v) => setSessionSecurity(v as any)}
                            icon={RefreshCcw}
                            options={[
                              { value: 'standard', label: 'Standard Limits' },
                              { value: 'auto_logout', label: '30m Auto-Logout' },
                              { value: 'strict_reauth', label: 'Strict Re-authentication' },
                            ]}
                          />
                        </motion.div>
                      )}

                      {/* --- THREAT PROTECTION TAB --- */}
                      {activeTab === 'threat' && (
                        <motion.div
                          key='threat'
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className='space-y-6'
                        >
                          {/* Threat Monitoring */}
                          <div className='space-y-3'>
                            <div className='flex items-center gap-2'>
                              <Radio className='w-4 h-4 text-rose-400 animate-pulse' />
                              <Label className='text-[10px] font-black uppercase tracking-widest text-white'>
                                Threat Monitoring
                              </Label>
                            </div>
                            <div className='grid grid-cols-1 gap-2'>
                              {(
                                [
                                  {
                                    value: 'disabled',
                                    label: 'Disabled',
                                    desc: 'No active analysis',
                                    color: 'zinc',
                                  },
                                  {
                                    value: 'basic',
                                    label: 'Basic Monitoring',
                                    desc: 'Detects spam and rapid joins',
                                    color: 'amber',
                                  },
                                  {
                                    value: 'advanced',
                                    label: 'Advanced Behavioral Detection',
                                    desc: 'AI-driven zero-trust analysis',
                                    color: 'rose',
                                  },
                                ] as const
                              ).map((opt) => {
                                const isActive = threatMonitoring === opt.value;
                                return (
                                  <motion.button
                                    key={opt.value}
                                    type='button'
                                    onClick={() => setThreatMonitoring(opt.value)}
                                    whileHover={{ scale: 1.01, x: 5 }}
                                    whileTap={{ scale: 0.99 }}
                                    className={`relative flex flex-col p-3 rounded-xl border text-left transition-all ${
                                      isActive
                                        ? '' // Handled by style below
                                        : 'bg-white/5 border-white/5 hover:border-white/10 opacity-70 hover:opacity-100'
                                    }`}
                                    style={
                                      isActive
                                        ? {
                                            borderColor:
                                              opt.color === 'rose'
                                                ? 'rgba(244,63,94,0.3)'
                                                : opt.color === 'amber'
                                                  ? 'rgba(245,158,11,0.3)'
                                                  : 'rgba(113,113,122,0.3)',
                                            backgroundColor:
                                              opt.color === 'rose'
                                                ? 'rgba(244,63,94,0.1)'
                                                : opt.color === 'amber'
                                                  ? 'rgba(245,158,11,0.1)'
                                                  : 'rgba(113,113,122,0.1)',
                                            boxShadow:
                                              opt.color === 'rose'
                                                ? '0 0 15px rgba(244,63,94,0.05)'
                                                : opt.color === 'amber'
                                                  ? '0 0 15px rgba(245,158,11,0.05)'
                                                  : 'none',
                                          }
                                        : {}
                                    }
                                  >
                                    {isActive && (
                                      <motion.div
                                        layoutId='threatHighlight'
                                        className='absolute inset-0 rounded-xl'
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                      />
                                    )}
                                    <div
                                      className={`relative z-10 text-[10px] font-black uppercase tracking-wider mb-0.5 ${isActive ? (opt.color === 'rose' ? 'text-rose-400' : opt.color === 'amber' ? 'text-amber-400' : 'text-zinc-300') : 'text-zinc-400'}`}
                                    >
                                      {opt.label}
                                    </div>
                                    <div className='relative z-10 text-[9px] text-zinc-500 font-medium'>
                                      {opt.desc}
                                    </div>
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Audit Logging */}
                          <NeuralSelect
                            label='Audit Logging Level'
                            value={auditLogging}
                            onValueChange={(v) => setAuditLogging(v as any)}
                            icon={Eye}
                            options={[
                              { value: 'basic', label: 'Basic Connection Logs' },
                              { value: 'full', label: 'Full Activity Trace' },
                              { value: 'compliance', label: 'Compliance WORM Mode' },
                            ]}
                          />

                          {/* Emergency Mode Lock */}
                          <div className='flex items-center justify-between p-4 bg-rose-500/5 rounded-2xl border border-rose-500/20 group'>
                            <div className='flex items-center gap-3'>
                              <div className='w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20'>
                                <Activity className='w-4 h-4 text-rose-500 group-hover:animate-pulse' />
                              </div>
                              <div>
                                <Label className='text-xs font-bold text-white uppercase tracking-tight'>
                                  Emergency Lockdown
                                </Label>
                                <p className='text-[9px] text-white/40 uppercase tracking-tighter'>
                                  Enable instant instance freeze
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={emergencyModeEnabled}
                              onCheckedChange={setEmergencyModeEnabled}
                              className='data-[state=checked]:bg-rose-500'
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>
            </form>
          </div>

          <DialogFooter className='bg-black/40 p-5 md:p-6 border-t border-white/5 flex items-center justify-end gap-4 mt-auto shrink-0'>
            <Button
              type='button'
              variant='ghost'
              onClick={() => onOpenChange(false)}
              className='text-white/40 hover:text-white hover:bg-white/5 rounded-xl text-xs font-bold uppercase tracking-widest h-11 px-8'
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={isLoading || !name || !slug}
              onClick={handleSubmit}
              className='bg-white text-black hover:bg-indigo-50 rounded-xl text-xs font-black uppercase tracking-widest px-10 h-11 shadow-2xl shadow-white/5 group relative overflow-hidden'
            >
              <span className='relative z-10 flex items-center gap-2'>
                {isLoading ? (
                  'INITIALIZING...'
                ) : (
                  <>
                    <Plus className='w-4 h-4 transition-transform group-hover:rotate-90' />
                    ESTABLISH DOMAIN
                  </>
                )}
              </span>
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
