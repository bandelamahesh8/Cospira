export const BOARD_CELL_SIZE = 1.2;
export const BOARD_THICKNESS = 0.4;

export const LUDO_COLORS = {
  red: '#e74c3c',
  green: '#27ae60',
  yellow: '#f1c40f',
  blue: '#3498db',
  board: '#1a1a2e',
  path: '#ffffff',
  safe: '#95a5a6'
};

// Maps 1-based R, C from original logic to 3D continuous space
// where (8,8) is the center (0,0).
export function getPositionFromRC(r: number, c: number, height: number = 0.2): [number, number, number] {
  // Original is 1-15, so subtract 8 to center at 0
  const x = (c - 8) * BOARD_CELL_SIZE;
  const z = (r - 8) * BOARD_CELL_SIZE;
  return [x, height, z];
}

// Reuse the original PATH_COORDS to make integration seamless
export const PATH_COORDS = [
  { x: 9, y: 2 }, { x: 9, y: 3 }, { x: 9, y: 4 }, { x: 9, y: 5 }, { x: 9, y: 6 },
  { x: 10, y: 7 }, { x: 11, y: 7 }, { x: 12, y: 7 }, { x: 13, y: 7 }, { x: 14, y: 7 }, { x: 15, y: 7 },
  { x: 15, y: 8 }, { x: 15, y: 9 },
  { x: 14, y: 9 }, { x: 13, y: 9 }, { x: 12, y: 9 }, { x: 11, y: 9 }, { x: 10, y: 9 },
  { x: 9, y: 10 }, { x: 9, y: 11 }, { x: 9, y: 12 }, { x: 9, y: 13 }, { x: 9, y: 14 }, { x: 9, y: 15 },
  { x: 8, y: 15 }, { x: 7, y: 15 },
  { x: 7, y: 14 }, { x: 7, y: 13 }, { x: 7, y: 12 }, { x: 7, y: 11 }, { x: 7, y: 10 },
  { x: 6, y: 9 }, { x: 5, y: 9 }, { x: 4, y: 9 }, { x: 3, y: 9 }, { x: 2, y: 9 }, { x: 1, y: 9 },
  { x: 1, y: 8 }, { x: 1, y: 7 },
  { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }, { x: 6, y: 7 },
  { x: 7, y: 6 }, { x: 7, y: 5 }, { x: 7, y: 4 }, { x: 7, y: 3 }, { x: 7, y: 2 }, { x: 7, y: 1 },
  { x: 8, y: 1 }, { x: 9, y: 1 },
];

export const PLAYER_OFFSETS = [39, 0, 13, 26]; // Red, Green, Yellow, Blue

export function getCoords3D(pIdx: number, pos: number, tIdx: number): [number, number, number] {
  let cx = 8;
  let cy = 8;

  if (pos === undefined || pos === null || isNaN(pos)) return getPositionFromRC(8, 8, 0.25);

  if (pos === -1) { // Home base
    const basePositions = [
      [{ x: 3, y: 12 }, { x: 5, y: 12 }, { x: 3, y: 14 }, { x: 5, y: 14 }], // Red (BL)
      [{ x: 3, y: 3 }, { x: 5, y: 3 }, { x: 3, y: 5 }, { x: 5, y: 5 }],    // Green (TL)
      [{ x: 12, y: 3 }, { x: 14, y: 3 }, { x: 12, y: 5 }, { x: 14, y: 5 }], // Yellow (TR)
      [{ x: 12, y: 12 }, { x: 14, y: 12 }, { x: 12, y: 14 }, { x: 14, y: 14 }] // Blue (BR)
    ];
    cx = basePositions[pIdx][tIdx].x;
    cy = basePositions[pIdx][tIdx].y;
  } else if (pos >= 57) { // Finished (Center)
    cx = 8;
    cy = 8;
  } else if (pos <= 51) { // Pathway
    let pathIdx = 0;
    if (pos === 0) pathIdx = PLAYER_OFFSETS[pIdx];
    else pathIdx = (PLAYER_OFFSETS[pIdx] + pos) % 52;
    
    cx = PATH_COORDS[pathIdx].x;
    cy = PATH_COORDS[pathIdx].y;
  } else { // Finish Stretch (52 to 56)
    const step = pos - 51; // 1 to 5
    if (pIdx === 1) { cx = 8; cy = step + 1; } // Green (Top)
    else if (pIdx === 2) { cx = 15 - step; cy = 8; } // Yellow (Right)
    else if (pIdx === 3) { cx = 8; cy = 15 - step; } // Blue (Bottom)
    else if (pIdx === 0) { cx = step + 1; cy = 8; } // Red (Left)
  }

  // Adding slight randomness/offsets if multiple tokens occupy the same spot?
  // We'll skip complex stacking logic for now, or just let them clip gently
  // Actually, standard Ludo visually offsets stacked pieces. We can do that in Token component if needed.
  return getPositionFromRC(cy, cx, 0.25);
}
