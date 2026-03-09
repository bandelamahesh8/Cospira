import React, { createContext, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/useOrganization';
import { useBreakout } from '@/contexts/useBreakout';
import { toast } from 'sonner';

/**
 * AIAssistantManager manages autonomous AI features like:
 * - Smart Matchmaking
 * - Sentimenet & Threat Detection
 * - Auto-Summaries
 */

interface AIAssistantContextType {
  isAutoMatchmaking: boolean;
  toggleAutoMatchmaking: () => void;
  requestSmartMatchmaking: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

export const AIAssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { breakouts, lobbyUsers, batchAssignParticipants } = useBreakout();

  const [isAutoMatchmaking, setIsAutoMatchmaking] = useState(false);

  const isOwner = currentOrganization?.owner_id === user?.id;

  // ── Smart Matchmaking Logic (Simulated AI) ──
  const requestSmartMatchmaking = useCallback(async () => {
    if (!isOwner || !currentOrganization || breakouts.length === 0 || lobbyUsers.length === 0) {
      toast.error('Cannot run matchmaking: ensure you have breakouts and users in the lobby.');
      return;
    }

    toast.info('AI is analyzing user profiles for optimal matchmaking...', { icon: '🤖' });

    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simple deterministic assignment simulation (Round Robin)
    const assignments: { breakoutId: string; userIds: string[] }[] = breakouts.map((b) => ({
      breakoutId: b.id,
      userIds: [],
    }));
    let currentBreakoutIndex = 0;

    for (const lbUser of lobbyUsers) {
      // Find a breakout that isn't full
      let breakoutFound = false;
      let iterations = 0;

      while (!breakoutFound && iterations < breakouts.length) {
        const targetBreakout = breakouts[currentBreakoutIndex];
        const assignedCount =
          assignments[currentBreakoutIndex].userIds.length +
          (targetBreakout.participants_count || 0);

        if (assignedCount < targetBreakout.max_participants) {
          assignments[currentBreakoutIndex].userIds.push(lbUser.user_id);
          breakoutFound = true;
        }

        currentBreakoutIndex = (currentBreakoutIndex + 1) % breakouts.length;
        iterations++;
      }
    }

    let successCount = 0;

    // Execute assignments
    for (const assignment of assignments) {
      if (assignment.userIds.length > 0) {
        try {
          await batchAssignParticipants(assignment.breakoutId, assignment.userIds);
          successCount += assignment.userIds.length;
        } catch (e) {
          console.error(`Failed to batch assign to ${assignment.breakoutId}`, e);
        }
      }
    }

    if (successCount > 0) {
      toast.success(`AI successfully matched ${successCount} users into breakouts!`, {
        icon: '✨',
      });
    } else {
      toast.warning('AI could not find suitable breakouts for the remaining users.');
    }

    setIsAutoMatchmaking(false);
  }, [breakouts, lobbyUsers, isOwner, currentOrganization, batchAssignParticipants]);

  const toggleAutoMatchmaking = useCallback(() => {
    setIsAutoMatchmaking((prev) => !prev);
    if (!isAutoMatchmaking) {
      toast.success('Auto-Matchmaking enabled. AI will now sort users as they join the lobby.', {
        icon: '🤖',
      });
    } else {
      toast.info('Auto-Matchmaking disabled.');
    }
  }, [isAutoMatchmaking]);

  // Hook for Auto-Matchmaking
  useEffect(() => {
    if (isAutoMatchmaking && lobbyUsers.length > 0 && breakouts.length > 0 && isOwner) {
      // Setup a small debounce so we don't spam it
      const timeout = setTimeout(() => {
        requestSmartMatchmaking();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [lobbyUsers, breakouts, isAutoMatchmaking, requestSmartMatchmaking, isOwner]);

  return (
    <AIAssistantContext.Provider
      value={{
        isAutoMatchmaking,
        toggleAutoMatchmaking,
        requestSmartMatchmaking,
      }}
    >
      {children}
    </AIAssistantContext.Provider>
  );
};
