/**
 * Design Guards
 * Protect softness forever - hard veto rules
 */

/**
 * Sound guard - reject loud sounds
 */
export const guardSound = (volume: number): boolean => {
  const MAX_VOLUME = 0.3;

  if (volume > MAX_VOLUME) {
    console.error(`[Design Guard] Sound rejected: volume ${volume} exceeds max ${MAX_VOLUME}`);
    return false;
  }

  return true;
};

/**
 * Animation guard - reject fast/aggressive animations
 */
export const guardAnimation = (duration: number, type: string): boolean => {
  const MIN_DURATION = 300; // ms

  if (duration < MIN_DURATION && type !== 'micro') {
    console.error(`[Design Guard] Animation rejected: duration ${duration}ms too fast`);
    return false;
  }

  return true;
};

/**
 * Language guard - reject competitive/harsh language
 */
export const guardLanguage = (text: string): boolean => {
  const BANNED_WORDS = [
    'crush',
    'destroy',
    'dominate',
    'beat',
    'lose',
    'loser',
    'fail',
    'failure',
    'stupid',
    'dumb',
    'bad',
  ];

  const lowerText = text.toLowerCase();
  const hasBannedWord = BANNED_WORDS.some((word) => lowerText.includes(word));

  if (hasBannedWord) {
    console.error(`[Design Guard] Language rejected: contains harsh words`);
    return false;
  }

  return true;
};

/**
 * Visual guard - reject flashing/aggressive visuals
 */
export const guardVisual = (flashRate: number): boolean => {
  const MAX_FLASH_RATE = 0.5; // Hz (once per 2 seconds max)

  if (flashRate > MAX_FLASH_RATE) {
    console.error(`[Design Guard] Visual rejected: flash rate ${flashRate}Hz too fast`);
    return false;
  }

  return true;
};

/**
 * Final litmus test - all checks
 */
export const finalLitmusTest = (feature: {
  makesKinder: boolean;
  reducesUrgency: boolean;
  helpsLosers: boolean;
  niceAt1AM: boolean;
}): boolean => {
  const { makesKinder, reducesUrgency, helpsLosers, niceAt1AM } = feature;

  if (!makesKinder || !reducesUrgency || !helpsLosers || !niceAt1AM) {
    console.error('[Design Guard] Feature rejected: failed litmus test', feature);
    return false;
  }

  return true;
};
