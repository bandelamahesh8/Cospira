import { formatDistanceToNow, isToday, isYesterday, subDays, subHours, subMinutes } from 'date-fns';
import { Activity } from '@/types/activity';

// Helper to generate dynamic dates relative to now
const now = new Date();
const getRelativeDate = (days: number, hours: number, minutes: number) => {
  return subMinutes(subHours(subDays(now, days), hours), minutes);
};

export const mockActivities: Activity[] = [
  // Latest session - Today
  {
    id: '1',
    type: 'session-group',
    title: 'Room Session',
    timestamp: getRelativeDate(0, 0, 45), // 45 mins ago
    activities: [
      'Room created',
      'Presentation shared (LAW252.pdf)',
      'Game played (Tic-Tac-Toe)',
      'Browser session started',
    ],
    duration: 45,
    participants: 3,
    roomId: 'ABC123',
    roomName: 'Study Group',
  },

  // Yesterday
  {
    id: '2',
    type: 'room',
    title: 'Cospira Room',
    subtitle: 'Hosted by You',
    action: 'You started a room',
    timestamp: getRelativeDate(1, 2, 0), // Yesterday
    duration: 18,
    participants: 2,
    role: 'host',
    roomId: 'XYZ789',
    roomName: 'Quick Meeting',
  },

  {
    id: '3',
    type: 'presentation',
    title: 'Presentation',
    action: 'You shared a document',
    fileName: 'Project_Proposal.pdf',
    fileType: 'pdf',
    timestamp: getRelativeDate(1, 2, 5), // Yesterday + 5 mins
    roomId: 'XYZ789',
  },

  // 3 Days ago
  {
    id: '4',
    type: 'game',
    title: 'Game Session',
    action: 'You played a game',
    gameName: 'Chess',
    opponent: 'John Doe',
    timestamp: getRelativeDate(3, 1, 0), // 3 days ago
    roomId: 'DEF456',
  },

  {
    id: '5',
    type: 'browser',
    title: 'Media Activity',
    action: 'You browsed content',
    detail: 'Private browser session',
    timestamp: getRelativeDate(3, 1, 25), // 3 days ago
    roomId: 'DEF456',
  },

  // 5 Days ago
  {
    id: '6',
    type: 'youtube',
    title: 'Media Activity',
    action: 'You watched a video',
    detail: 'YouTube session',
    timestamp: getRelativeDate(5, 4, 0), // 5 days ago
    roomId: 'GHI012',
  },

  {
    id: '7',
    type: 'screen',
    title: 'Screen Share',
    action: 'You shared your screen',
    detail: 'Screen sharing session',
    timestamp: getRelativeDate(5, 4, 15), // 5 days ago
    roomId: 'GHI012',
  },

  // 1 Week ago
  {
    id: '8',
    type: 'room',
    title: 'Cospira Room',
    subtitle: 'Participant',
    action: 'You joined a room',
    timestamp: getRelativeDate(7, 0, 0), // 1 week ago
    duration: 60,
    participants: 5,
    role: 'participant',
    roomId: 'JKL345',
    roomName: 'Team Standup',
  },
];

/**
 * Get activities filtered by type
 */
export const getFilteredActivities = (filter: string, activities: Activity[]): Activity[] => {
  if (filter === 'All') return activities;

  const filterMap: Record<string, string[]> = {
    Rooms: ['room', 'session-group'],
    Presentations: ['presentation'],
    Games: ['game'],
    Media: ['browser', 'youtube', 'screen'],
    Feedback: [],
  };

  const types = filterMap[filter] || [];
  return activities.filter((activity) => types.includes(activity.type));
};

/**
 * Format timestamp using emotional/relative logic
 * e.g., "Just now", "2 hours ago", "Yesterday", "3 days ago"
 */
export const formatActivityTimestamp = (date: Date): string => {
  return formatDistanceToNow(date, { addSuffix: true })
    .replace('about ', '')
    .replace('less than a minute ago', 'Just now');
};

/**
 * Group activities by date for section headers
 */
export const groupActivitiesByDate = (activities: Activity[]): Record<string, Activity[]> => {
  const groups: Record<string, Activity[]> = {};

  activities.forEach((activity) => {
    let key = 'Earlier';

    // We recreate dates to ensure comparison works correctly regardless of existing date object state
    const activityDate = new Date(activity.timestamp);
    const today = new Date();

    if (isToday(activityDate)) {
      key = 'Today';
    } else if (isYesterday(activityDate)) {
      key = 'Yesterday';
    } else {
      const daysDiff = Math.floor(
        (today.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff <= 7) {
        key = 'This Week';
      } else if (daysDiff <= 30) {
        key = 'This Month';
      }
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(activity);
  });

  // Create ordered object manually to enforce order
  const orderedGroups: Record<string, Activity[]> = {};
  const order = ['Today', 'Yesterday', 'This Week', 'This Month', 'Earlier'];

  order.forEach((key) => {
    if (groups[key]) {
      orderedGroups[key] = groups[key];
    }
  });

  return orderedGroups;
};

/**
 * Generate a personalized insight based on usage
 */
export const generateActivityInsight = (activities: Activity[]): string => {
  const counts = {
    presentation: 0,
    game: 0,
    media: 0,
    room: 0,
  };

  activities.forEach((a) => {
    if (a.type === 'presentation') counts.presentation++;
    if (a.type === 'game') counts.game++;
    if (['browser', 'youtube', 'screen'].includes(a.type)) counts.media++;
    if (['room', 'session-group'].includes(a.type)) counts.room++;
  });

  // Find highest count
  let max = -1;
  let topType = '';

  Object.entries(counts).forEach(([type, count]) => {
    if (count > max) {
      max = count;
      topType = type;
    }
  });

  switch (topType) {
    case 'game':
      return 'You mostly use games to connect with others.';
    case 'presentation':
      return 'You frequently share documents and present ideas.';
    case 'media':
      return 'You often browse and share media content.';
    default:
      return 'You are an active room host and participant.';
  }
};
