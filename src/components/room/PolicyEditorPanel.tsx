/**
 * PolicyEditorPanel — Visual Dynamic Policy Rule Builder
 *
 * Allows hosts and co-hosts to create, edit, and manage governance policies.
 * Smart Mode presets instantly create multi-policy configurations.
 * AI Suggestions are displayed at the bottom — advisory only, never auto-applied.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Zap,
  Bot,
  CheckCircle,
  XCircle,
  ChevronDown,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  usePolicyEngine,
  type Policy,
  type PolicyCondition,
  type AISuggestion,
  type CreatePolicyInput,
} from '@/hooks/usePolicyEngine';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const CONDITION_FIELDS = [
  { value: 'participants', label: 'Participant Count' },
  { value: 'user.role', label: 'User Role' },
  { value: 'time_elapsed_minutes', label: 'Time Elapsed (min)' },
  { value: 'room.state', label: 'Room State' },
  { value: 'user.account_age_hours', label: 'Account Age (hours)' },
];

const NUMERIC_OPERATORS = ['>', '<', '>=', '<=', '==', '!='];
const STRING_OPERATORS = ['==', '!='];

const POLICY_ACTIONS = [
  { value: 'enable_waiting_lobby', label: '🔒 Enable Waiting Lobby' },
  { value: 'disable_waiting_lobby', label: '🔓 Disable Waiting Lobby' },
  { value: 'mute_user', label: '🔇 Mute Triggering User' },
  { value: 'mute_all', label: '🔇 Mute All Participants' },
  { value: 'promote_to_speaker', label: '🎤 Promote to Speaker' },
  { value: 'demote_to_listener', label: '👂 Demote to Listener' },
  { value: 'lock_room', label: '🔐 Lock Room' },
  { value: 'unlock_room', label: '🔓 Unlock Room' },
  { value: 'disable_chat', label: '💬 Disable Chat' },
  { value: 'enable_chat', label: '💬 Enable Chat' },
  { value: 'disable_screen_share', label: '🖥 Disable Screen Share' },
  { value: 'send_alert', label: '📢 Send Alert to Room' },
  { value: 'suggest_ai', label: '🤖 AI Suggestion (Advisory)' },
];

const SMART_MODES = [
  {
    value: 'PRESENTATION',
    label: '📊 Presentation',
    desc: 'Mutes listeners, host-only screen share',
  },
  { value: 'TOWNHALL', label: '🏛 Town Hall', desc: 'Auto-lobby >50 users, controlled speaking' },
  { value: 'LECTURE', label: '📚 Lecture', desc: 'Only assigned speakers can unmute' },
  { value: 'WORKSHOP', label: '🛠 Workshop', desc: 'Auto-closes after 90 minutes' },
] as const;

// ─────────────────────────────────────────────
// Helper: get operators and hint for a field
// ─────────────────────────────────────────────
function getOperators(field: string) {
  const stringFields = ['user.role', 'room.state'];
  return stringFields.includes(field) ? STRING_OPERATORS : NUMERIC_OPERATORS;
}

function getValueHint(field: string): string {
  const map: Record<string, string> = {
    participants: 'e.g. 50',
    'user.role': 'HOST, COHOST, LISTENER…',
    time_elapsed_minutes: 'e.g. 60',
    'room.state': 'LIVE, PRESENTATION…',
    'user.account_age_hours': 'e.g. 24',
  };
  return map[field] ?? 'value';
}

// ─────────────────────────────────────────────
// BLANK POLICY FORM
// ─────────────────────────────────────────────
const BLANK_FORM: CreatePolicyInput = {
  name: '',
  condition: { field: 'participants', operator: '>', value: 10 },
  action: 'enable_waiting_lobby',
  priority: 50,
};

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
interface PolicyEditorPanelProps {
  roomId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket: any;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export function PolicyEditorPanel({ roomId, socket }: PolicyEditorPanelProps) {
  const {
    policies,
    aiSuggestions,
    isLoading,
    lastTriggered,
    createPolicy,
    deletePolicy,
    togglePolicy,
    applySmartMode,
    approveSuggestion,
    dismissSuggestion,
  } = usePolicyEngine(roomId, socket);

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<CreatePolicyInput>(BLANK_FORM);
  const [showSmartModes, setShowSmartModes] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.action) return;
    setIsSaving(true);
    createPolicy(form);
    setTimeout(() => {
      setForm(BLANK_FORM);
      setShowAddForm(false);
      setIsSaving(false);
    }, 500);
  };

  const operators = getOperators(form.condition.field);

  return (
    <div className='flex flex-col gap-4'>
      {/* ── Header ────────────────────────────── */}
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='text-xs font-black uppercase tracking-widest text-white'>Policy Engine</h3>
          <p className='text-[10px] text-slate-500 mt-0.5'>Auto-governance rules for this room</p>
        </div>
        <div className='flex gap-2'>
          <Button
            size='sm'
            variant='ghost'
            onClick={() => setShowSmartModes((s) => !s)}
            className='h-7 px-2 text-[10px] font-bold text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg'
          >
            <Zap size={10} className='mr-1' /> Smart Modes
          </Button>
          <Button
            size='sm'
            onClick={() => setShowAddForm((s) => !s)}
            className='h-7 px-2 text-[10px] font-black bg-white/10 text-white hover:bg-white/20 rounded-lg'
          >
            <Plus size={10} className='mr-1' /> Add Rule
          </Button>
        </div>
      </div>

      {/* ── Policy Triggered Notice ────────────── */}
      <AnimatePresence>
        {lastTriggered && lastTriggered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className='rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2'
          >
            <p className='text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1'>
              Policies Triggered
            </p>
            {lastTriggered.map((t, i) => (
              <p key={i} className='text-xs text-slate-400'>
                → {t.name} <span className='text-emerald-500'>{t.action}</span>
              </p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Smart Modes ─────────────────────────── */}
      <AnimatePresence>
        {showSmartModes && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className='grid grid-cols-2 gap-2'
          >
            {SMART_MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => {
                  applySmartMode(mode.value);
                  setShowSmartModes(false);
                }}
                className='text-left p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group'
              >
                <p className='text-xs font-bold text-white'>{mode.label}</p>
                <p className='text-[10px] text-slate-500 mt-0.5 leading-tight'>{mode.desc}</p>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Policy Form ─────────────────────── */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className='rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col gap-3'
          >
            <p className='text-[10px] font-black uppercase tracking-widest text-slate-400'>
              New Policy Rule
            </p>

            {/* Name */}
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder='Policy name…'
              className='h-8 bg-white/5 border-white/10 text-white placeholder:text-slate-600 text-xs rounded-lg'
            />

            {/* Condition Builder */}
            <div className='rounded-xl bg-black/30 border border-white/5 p-3 flex flex-col gap-2'>
              <p className='text-[9px] font-black uppercase tracking-widest text-slate-600'>
                Condition
              </p>
              <div className='flex gap-2 flex-wrap'>
                {/* Field */}
                <Select
                  value={form.condition.field}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      condition: {
                        ...f.condition,
                        field: v,
                        operator: getOperators(v)[0],
                        value: '',
                      },
                    }))
                  }
                >
                  <SelectTrigger className='h-8 w-auto min-w-[130px] bg-white/5 border-white/10 text-white text-xs rounded-lg'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className='bg-[#0A0D12] border-white/10 text-white'>
                    {CONDITION_FIELDS.map((f) => (
                      <SelectItem key={f.value} value={f.value} className='text-xs'>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Operator */}
                <Select
                  value={form.condition.operator}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, condition: { ...f.condition, operator: v } }))
                  }
                >
                  <SelectTrigger className='h-8 w-16 bg-white/5 border-white/10 text-white text-xs rounded-lg'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className='bg-[#0A0D12] border-white/10 text-white'>
                    {operators.map((op) => (
                      <SelectItem key={op} value={op} className='text-xs font-mono'>
                        {op}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Value */}
                <Input
                  value={String(form.condition.value)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, condition: { ...f.condition, value: e.target.value } }))
                  }
                  placeholder={getValueHint(form.condition.field)}
                  className='h-8 flex-1 min-w-[80px] bg-white/5 border-white/10 text-white placeholder:text-slate-600 text-xs rounded-lg font-mono'
                />
              </div>
            </div>

            {/* Action */}
            <div className='rounded-xl bg-black/30 border border-white/5 p-3 flex flex-col gap-2'>
              <p className='text-[9px] font-black uppercase tracking-widest text-slate-600'>
                Action
              </p>
              <Select
                value={form.action}
                onValueChange={(v) => setForm((f) => ({ ...f, action: v }))}
              >
                <SelectTrigger className='h-8 bg-white/5 border-white/10 text-white text-xs rounded-lg'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='bg-[#0A0D12] border-white/10 text-white'>
                  {POLICY_ACTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value} className='text-xs'>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className='flex items-center gap-2'>
              <span className='text-[10px] text-slate-500 shrink-0'>Priority</span>
              <input
                type='range'
                min={1}
                max={100}
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                className='flex-1 accent-white h-1'
              />
              <span className='text-[10px] font-mono text-slate-400 w-6 text-right'>
                {form.priority}
              </span>
            </div>

            {/* Actions */}
            <div className='flex gap-2'>
              <Button
                size='sm'
                variant='ghost'
                onClick={() => {
                  setShowAddForm(false);
                  setForm(BLANK_FORM);
                }}
                className='flex-1 h-8 text-xs rounded-lg text-slate-500 hover:text-white hover:bg-white/10'
              >
                Cancel
              </Button>
              <Button
                size='sm'
                onClick={handleSubmit}
                disabled={!form.name.trim() || isSaving}
                className='flex-1 h-8 text-xs rounded-lg bg-white text-black hover:bg-white/90 font-bold'
              >
                {isSaving ? <Loader2 size={12} className='animate-spin' /> : 'Create Policy'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Policy List ─────────────────────────── */}
      {isLoading ? (
        <div className='flex items-center justify-center py-8'>
          <Loader2 size={16} className='animate-spin text-slate-500' />
        </div>
      ) : policies.length === 0 ? (
        <div className='text-center py-8 rounded-2xl bg-white/2 border border-white/5'>
          <AlertTriangle size={20} className='text-slate-600 mx-auto mb-2' />
          <p className='text-xs text-slate-600'>No policies defined.</p>
          <p className='text-[10px] text-slate-700 mt-1'>Add a rule or use a Smart Mode preset.</p>
        </div>
      ) : (
        <div className='flex flex-col gap-1.5'>
          {[...policies]
            .sort((a, b) => a.priority - b.priority)
            .map((policy) => (
              <PolicyRow
                key={policy.policyId}
                policy={policy}
                onToggle={(enabled) => togglePolicy(policy.policyId, enabled)}
                onDelete={() => deletePolicy(policy.policyId)}
              />
            ))}
        </div>
      )}

      {/* ── AI Suggestions ──────────────────────── */}
      {aiSuggestions.length > 0 && (
        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-2'>
            <Bot size={12} className='text-purple-400' />
            <span className='text-[10px] font-black uppercase tracking-widest text-purple-400'>
              AI Suggestions
            </span>
            <span className='text-[10px] text-slate-600'>— advisory only</span>
          </div>
          {aiSuggestions
            .filter((s) => !s.approved)
            .map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                onApprove={() => approveSuggestion(s.id)}
                onDismiss={() => dismissSuggestion(s.id)}
              />
            ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PolicyRow
// ─────────────────────────────────────────────
function PolicyRow({
  policy,
  onToggle,
  onDelete,
}: {
  policy: Policy;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-xl border transition-all ${policy.enabled ? 'bg-white/5 border-white/10' : 'bg-white/2 border-white/5 opacity-50'}`}
    >
      <div className='flex items-center gap-2 px-3 py-2'>
        {/* Priority pill */}
        <span className='text-[9px] font-mono text-slate-600 w-4 text-center shrink-0'>
          {policy.priority}
        </span>

        {/* Name */}
        <button onClick={() => setExpanded((e) => !e)} className='flex-1 text-left min-w-0'>
          <p className='text-xs font-semibold text-white truncate'>{policy.name}</p>
          <p className='text-[9px] text-slate-600 uppercase tracking-wider truncate'>
            {policy.condition.field} {policy.condition.operator} {policy.condition.value}
            {' → '}
            {POLICY_ACTIONS.find((a) => a.value === policy.action)?.label?.replace(/^..\s/, '') ??
              policy.action}
          </p>
        </button>

        {/* Toggle */}
        <button
          onClick={() => onToggle(!policy.enabled)}
          className='shrink-0 text-slate-500 hover:text-white transition-colors'
        >
          {policy.enabled ? (
            <ToggleRight size={16} className='text-emerald-400' />
          ) : (
            <ToggleLeft size={16} />
          )}
        </button>

        {/* Expand / Delete */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className='shrink-0 text-slate-600 hover:text-white transition-colors'
        >
          <ChevronDown
            size={12}
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>

        <button
          onClick={onDelete}
          className='shrink-0 text-slate-700 hover:text-red-400 transition-colors'
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className='px-3 pb-3'
          >
            <div className='rounded-lg bg-black/30 p-2.5 font-mono text-[10px] text-slate-400 space-y-1'>
              <p>
                <span className='text-slate-600'>IF</span>{' '}
                <span className='text-white'>{policy.condition.field}</span>{' '}
                <span className='text-cyan-400'>{policy.condition.operator}</span>{' '}
                <span className='text-amber-400'>"{policy.condition.value}"</span>
              </p>
              <p>
                <span className='text-slate-600'>THEN</span>{' '}
                <span className='text-emerald-400'>{policy.action}</span>
              </p>
              <p>
                <span className='text-slate-600'>PRIORITY</span>{' '}
                <span className='text-white'>{policy.priority}</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
// SuggestionCard
// ─────────────────────────────────────────────
function SuggestionCard({
  suggestion,
  onApprove,
  onDismiss,
}: {
  suggestion: AISuggestion;
  onApprove: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className='rounded-xl bg-purple-500/10 border border-purple-500/20 p-3 flex flex-col gap-2'>
      <div className='flex items-start gap-2'>
        <Bot size={12} className='text-purple-400 shrink-0 mt-0.5' />
        <p className='text-xs text-slate-300 leading-relaxed flex-1'>{suggestion.message}</p>
      </div>
      {suggestion.suggestedAction && (
        <p className='text-[10px] font-mono text-purple-300/60 pl-5'>
          → {suggestion.suggestedAction}
        </p>
      )}
      <div className='flex gap-2 pl-5'>
        <button
          onClick={onApprove}
          className='flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors'
        >
          <CheckCircle size={11} /> Apply
        </button>
        <button
          onClick={onDismiss}
          className='flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-slate-400 transition-colors'
        >
          <XCircle size={11} /> Dismiss
        </button>
      </div>
    </div>
  );
}
