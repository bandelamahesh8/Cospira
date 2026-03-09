/**
 * AuditLogPanel — ULTRA SECURE mode owner-only audit viewer.
 *
 * Displays the immutable breakout event log with:
 * - Action type with color-coded severity
 * - Actor and timestamp
 * - SHA-256 hash verification indicator
 * - POLICY_DENIED events highlighted in red
 * - Payload preview on hover/expand
 */
import React, { useEffect, useState, useCallback } from 'react';
import { AuditService } from '@/services/AuditService';
import { AuditEvent } from '@/types/organization';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';

interface AuditLogPanelProps {
  orgId: string;
  breakoutId?: string;
}

const AuditLogPanel: React.FC<AuditLogPanelProps> = ({ orgId, breakoutId }) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hashVerified, setHashVerified] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await AuditService.getAuditLog(orgId, breakoutId, 50);
      setEvents(data);
      // Verify hashes for all events in background
      data.forEach(async (event) => {
        const valid = await AuditService.verifyPayloadHash(event);
        setHashVerified((prev) => ({ ...prev, [event.id]: valid }));
      });
    } catch (err) {
      console.error('[AuditLogPanel] Failed to load audit log:', err);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, breakoutId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className='bg-white/[0.02] border border-red-500/20 rounded-2xl overflow-hidden'>
      {/* Header */}
      <div className='flex items-center justify-between px-4 py-3 border-b border-red-500/10 bg-red-500/5'>
        <div className='flex items-center gap-2'>
          <Shield className='w-4 h-4 text-red-400' />
          <span className='text-[10px] font-black uppercase tracking-widest text-red-400'>
            Immutable Audit Log
          </span>
        </div>
        <button
          onClick={load}
          disabled={isLoading}
          className='p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all'
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Events */}
      <div className='divide-y divide-white/[0.03] max-h-80 overflow-y-auto'>
        {isLoading && events.length === 0 && (
          <div className='py-8 text-center text-white/20 text-xs'>Loading audit events...</div>
        )}
        {!isLoading && events.length === 0 && (
          <div className='py-8 text-center text-white/20 text-[10px] uppercase tracking-widest'>
            No audit events yet
          </div>
        )}
        {events.map((event) => {
          const isDenial = event.action === 'POLICY_DENIED';
          const isExpanded = expandedId === event.id;
          const hashOk = hashVerified[event.id];
          const hashChecked = event.id in hashVerified;

          return (
            <div key={event.id} className={`px-4 py-3 ${isDenial ? 'bg-red-500/5' : ''}`}>
              <div
                className='flex items-start justify-between gap-3 cursor-pointer group'
                onClick={() => setExpandedId(isExpanded ? null : event.id)}
              >
                {/* Left: action + actor */}
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 mb-1'>
                    {isDenial ? (
                      <AlertTriangle className='w-3 h-3 text-red-400 shrink-0' />
                    ) : (
                      <div className='w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-0.5' />
                    )}
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest truncate ${
                        isDenial ? 'text-red-400' : 'text-white/70'
                      }`}
                    >
                      {AuditService.actionLabel(event.action)}
                    </span>
                  </div>
                  <div className='flex items-center gap-2 pl-3.5'>
                    <span className='text-[9px] text-white/20 font-mono truncate'>
                      actor:{event.actor_id.slice(0, 8)}…
                    </span>
                    {isDenial && event.audit_code && (
                      <span className='text-[8px] font-black uppercase text-red-500/60 bg-red-500/10 px-1.5 py-0.5 rounded'>
                        {event.audit_code}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: hash + time + expand */}
                <div className='flex items-center gap-2 shrink-0'>
                  {/* Hash verification indicator */}
                  {hashChecked &&
                    (hashOk ? (
                      <span title='Hash verified — not tampered'>
                        <CheckCircle2 className='w-3 h-3 text-emerald-400' />
                      </span>
                    ) : (
                      <span title='Hash mismatch — possible tampering!'>
                        <XCircle className='w-3 h-3 text-red-400' />
                      </span>
                    ))}
                  <span className='text-[9px] text-white/20 font-mono'>
                    {new Date(event.created_at).toLocaleTimeString()}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className='w-3 h-3 text-white/20' />
                  ) : (
                    <ChevronDown className='w-3 h-3 text-white/20 opacity-0 group-hover:opacity-100' />
                  )}
                </div>
              </div>

              {/* Expanded payload */}
              {isExpanded && (
                <div className='mt-3 ml-3.5 space-y-2'>
                  {isDenial && event.denial_reason && (
                    <p className='text-[9px] text-red-400/70 italic'>{event.denial_reason}</p>
                  )}
                  <div className='bg-black/30 rounded-lg p-2.5 overflow-x-auto'>
                    <pre className='text-[9px] text-white/40 font-mono whitespace-pre-wrap'>
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  </div>
                  <div className='flex items-center gap-1.5'>
                    <span className='text-[8px] text-white/20 uppercase font-bold'>SHA-256:</span>
                    <span className='text-[8px] font-mono text-white/20 truncate'>
                      {event.payload_hash}
                    </span>
                    {!hashOk && hashChecked && (
                      <span className='text-[8px] text-red-400 font-black uppercase'>
                        ⚠ MISMATCH
                      </span>
                    )}
                  </div>
                  <div className='flex items-center gap-1.5'>
                    <span className='text-[8px] text-white/20 uppercase font-bold'>Mode:</span>
                    <span className='text-[8px] font-mono text-white/30'>{event.mode}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AuditLogPanel;
