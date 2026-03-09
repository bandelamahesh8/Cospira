/**
 * AuditService — Client-side READER for the immutable audit log.
 *
 * CRITICAL: This service is READ-ONLY on the client.
 * Writes happen exclusively on the server after every breakout action.
 * Any attempt to insert from the client will be rejected by RLS.
 *
 * Audit log is enforced by Supabase RLS:
 *   - INSERT: allowed (server service role)
 *   - SELECT: only org owner
 *   - UPDATE: DENIED
 *   - DELETE: DENIED
 */

import { supabase } from '@/integrations/supabase/client';
import { AuditEvent } from '@/types/organization';

export class AuditService {
  /**
   * Fetch the full audit log for an organization.
   * Only org owners are permitted by RLS — others get empty array.
   *
   * @param orgId - Organization ID
   * @param breakoutId - Optional: filter to a specific breakout session
   * @param limit - Max events to fetch (default 100)
   */
  static async getAuditLog(orgId: string, breakoutId?: string, limit = 100): Promise<AuditEvent[]> {
    let query = supabase
      .from('breakout_audit_events')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (breakoutId) {
      query = query.eq('breakout_id', breakoutId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as unknown as AuditEvent[];
  }

  /**
   * Fetch only POLICY_DENIED events — shows who tried to violate policy.
   * Useful for ULTRA_SECURE security review by owner.
   */
  static async getPolicyDenials(orgId: string, limit = 50): Promise<AuditEvent[]> {
    const { data, error } = await supabase
      .from('breakout_audit_events')
      .select('*')
      .eq('org_id', orgId)
      .eq('action', 'POLICY_DENIED')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return ((data as unknown[]) ?? []) as AuditEvent[];
  }

  /**
   * Verify a single audit event's payload hash.
   * Returns true if the SHA-256 of the payload matches the stored hash.
   *
   * Note: hashing is done client-side here for display purposes only.
   * Server is the authoritative signer.
   */
  static async verifyPayloadHash(event: AuditEvent): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(event.payload));
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      return hashHex === event.payload_hash;
    } catch {
      return false;
    }
  }

  /**
   * Returns a human-readable summary for an audit action code.
   */
  static actionLabel(action: AuditEvent['action']): string {
    const labels: Record<string, string> = {
      BREAKOUT_CREATED: 'Breakout Created',
      BREAKOUT_STARTED: 'Breakout Started',
      BREAKOUT_PAUSED: 'Breakout Paused',
      BREAKOUT_RESUMED: 'Breakout Resumed',
      BREAKOUT_CLOSED: 'Breakout Closed',
      HOST_ASSIGNED: 'Host Assigned',
      PARTICIPANT_ASSIGNED: 'Participant Assigned',
      PARTICIPANT_REMOVED: 'Participant Removed',
      HOST_REASSIGNED: 'Host Reassigned',
      OWNER_JOINED: 'Owner Joined',
      MODE_SWITCHED: 'Mode Switched',
      POLICY_DENIED: '⚠ Policy Violation Attempt',
    };
    return labels[action] ?? action;
  }
}
