import { BreakoutSession, UserPresence } from '@/types/organization';

// Fallback tags based on room type
const getTagsForRoomType = (type?: string): string[] => {
  switch (type) {
    case 'SECURE_VAULT':
      return ['Management', 'Strategy', 'Finance', 'Legal'];
    case 'COLLAB_HUB':
      return ['Design', 'Engineering', 'Product', 'Marketing'];
    case 'AI_LAB':
      return ['AI', 'Data', 'Engineering', 'Research'];
    case 'GENERAL':
    default:
      return ['General', 'Onboarding', 'Social'];
  }
};

// Extrapolate room tags from name or type
const getRoomTags = (room: BreakoutSession): string[] => {
  return room.tags?.length ? room.tags : getTagsForRoomType(room.room_type);
};

// Fallback random skills for mock data
const AVAILABLE_SKILLS = [
  'Engineering',
  'Design',
  'Product',
  'Marketing',
  'AI',
  'Strategy',
  'Data',
  'Management',
];
const getRandomSkills = (): string[] => {
  const count = Math.floor(Math.random() * 3) + 1; // 1 to 3 skills
  const skills = new Set<string>();
  while (skills.size < count) {
    skills.add(AVAILABLE_SKILLS[Math.floor(Math.random() * AVAILABLE_SKILLS.length)]);
  }
  return Array.from(skills);
};

export interface DistributionResult {
  roomId: string;
  userIds: string[];
}

/**
 * Calculates a distribution map mapping room IDs to arrays of user IDs
 * based on skill/tag overlap heuristics to simulate an AI match.
 */
export const calculateDistributionMap = (
  unassignedMembers: UserPresence[],
  liveRooms: BreakoutSession[]
): DistributionResult[] => {
  const distribution: Record<string, string[]> = {};

  // Initialize distribution map
  liveRooms.forEach((room) => {
    distribution[room.id] = [];
  });

  unassignedMembers.forEach((member) => {
    // Inject mock skills if they don't have any (V1 implementation)
    const skills = member.skills?.length ? member.skills : getRandomSkills();
    member.skills = skills; // Store back for consistency if needed in UI

    let bestMatchRoomId: string | null = null;
    let highestScore = -1;

    liveRooms.forEach((room) => {
      // Check capacity constraint
      const currentCount = room.participants_count || 0;
      const assignedCount = distribution[room.id].length;
      if (room.max_participants && currentCount + assignedCount >= room.max_participants) {
        return; // Skip room if full
      }

      // Calculate score based on tag overlap
      const roomTags = getRoomTags(room);
      let score = 0;

      // Feature 1: Skill/Tag Overlap (High Weight)
      skills.forEach((skill: string) => {
        if (roomTags.some((tag) => tag.toLowerCase() === skill.toLowerCase())) {
          score += 20; // Increased weight for skill matching
        }
      });

      // Feature 2: Role Balancing (Medium Weight) - Mocking role checks
      // If room has no host, and user is a 'Lead' or 'Senior', boost score
      if (!room.host_id && (member.role === 'Lead' || member.role === 'Senior')) {
        score += 15;
      }

      // Feature 3: Past Collaboration (Future logic placeholder)
      // score += getCollaborationScore(member, room);

      // Add slight randomness to break ties naturally
      score += Math.random();

      if (score > highestScore) {
        highestScore = score;
        bestMatchRoomId = room.id;
      }
    });

    if (bestMatchRoomId) {
      distribution[bestMatchRoomId].push(member.user_id);
    } else if (liveRooms.length > 0) {
      // Fallback: place in least crowded room
      let minAssigned = Infinity;
      liveRooms.forEach((room) => {
        const assigned = distribution[room.id].length;
        if (assigned < minAssigned) {
          minAssigned = assigned;
          bestMatchRoomId = room.id;
        }
      });
      if (bestMatchRoomId) {
        distribution[bestMatchRoomId].push(member.user_id);
      }
    }
  });

  // Convert to array format
  return Object.entries(distribution)
    .filter(([_, userIds]) => userIds.length > 0)
    .map(([roomId, userIds]) => ({ roomId, userIds }));
};
