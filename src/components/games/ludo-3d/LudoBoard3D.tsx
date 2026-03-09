import { useMemo } from 'react';
import { Box, RoundedBox, Float, Text } from '@react-three/drei';
import { BOARD_CELL_SIZE, BOARD_THICKNESS, getPositionFromRC } from './LudoConfig';
import { RigidBody } from '@react-three/rapier';

const SAFE_POSITIONS_2D = [
  {r: 7, c: 2}, {r: 2, c: 9},
  {r: 9, c: 14}, {r: 14, c: 7},
  {r: 9, c: 3}, {r: 3, c: 7},
  {r: 7, c: 13}, {r: 13, c: 9}
];

export function LudoBoard3D() {
  // Main wooden or plastic board base

  const cells = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 225; i++) {
      const r = Math.floor(i / 15) + 1;
      const c = (i % 15) + 1;

      const isPath = (r >= 7 && r <= 9) || (c >= 7 && c <= 9);
      if (!isPath) continue; // These are Home Base areas

      const isGreenStretch = c === 8 && r >= 2 && r <= 7;
      const isYellowStretch = r === 8 && c >= 9 && c <= 14;
      const isBlueStretch = c === 8 && r >= 9 && r <= 14;
      const isRedStretch = r === 8 && c >= 2 && c <= 7;
      
      let color = '#ffffff'; // default white path
      if (isGreenStretch) color = '#2ecc71';
      else if (isYellowStretch) color = '#f1c40f';
      else if (isBlueStretch) color = '#3498db';
      else if (isRedStretch) color = '#e74c3c';

      const isSafe = SAFE_POSITIONS_2D.some(s => s.r === r && s.c === c);
      if (isSafe && color === '#ffffff') color = '#95a5a6'; // Safe spots

      // Convert R,C to 3D coords
      const [x, y, z] = getPositionFromRC(r, c, 0);

      arr.push(
         <Box 
           key={`cell-${r}-${c}`} 
           args={[BOARD_CELL_SIZE * 0.95, 0.1, BOARD_CELL_SIZE * 0.95]} 
           position={[x, y + 0.1, z]} 
           receiveShadow
         >
           <meshStandardMaterial 
             color={color} 
             roughness={0.2} 
             metalness={0.1}
             // emission if you want neon
             // emissive={isSafe ? '#ffffff' : '#000000'}
             // emissiveIntensity={0.1}
           />
         </Box>
      );
    }
    return arr;
  }, []);

  return (
    <group>
      {/* Base Board Physics */}
      <RigidBody type="fixed" colliders="cuboid">
        <RoundedBox 
          args={[15 * BOARD_CELL_SIZE + 1.5, BOARD_THICKNESS, 15 * BOARD_CELL_SIZE + 1.5]} 
          position={[0, -BOARD_THICKNESS / 2, 0]}
          radius={0.5} 
          smoothness={4} 
          receiveShadow
        >
          <meshStandardMaterial color="#1f1b24" roughness={0.8} metalness={0.2} />
        </RoundedBox>
      </RigidBody>

      {/* Grid Canvas (Backdrop for paths) */}
      <Box args={[15 * BOARD_CELL_SIZE, 0.05, 15 * BOARD_CELL_SIZE]} position={[0, 0.05, 0]} receiveShadow>
         <meshStandardMaterial color="#ecf0f1" roughness={0.5} metalness={0.1} />
      </Box>

      {/* Path Cells */}
      {cells}

      {/* Home Bases */}
      {/* Red Bottom-Left */}
      <HomeBase color="#e74c3c" position={getPositionFromRC(12, 3, 0.1)} />
      {/* Green Top-Left */}
      <HomeBase color="#2ecc71" position={getPositionFromRC(3, 3, 0.1)} />
      {/* Yellow Top-Right */}
      <HomeBase color="#f1c40f" position={getPositionFromRC(3, 12, 0.1)} />
      {/* Blue Bottom-Right */}
      <HomeBase color="#3498db" position={getPositionFromRC(12, 12, 0.1)} />
      
      {/* Entry Point Indicators */}
      <EntryPoint pIdx={0} color="#e74c3c" rotation={[0, 0, 0]} />
      <EntryPoint pIdx={1} color="#2ecc71" rotation={[0, -Math.PI/2, 0]} />
      <EntryPoint pIdx={2} color="#f1c40f" rotation={[0, Math.PI, 0]} />
      <EntryPoint pIdx={3} color="#3498db" rotation={[0, Math.PI/2, 0]} />

      {/* Center Home Triangle Finish */}
      <Box args={[BOARD_CELL_SIZE * 2.8, 0.2, BOARD_CELL_SIZE * 2.8]} position={[0, 0.1, 0]}>
         <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
         <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <Text
              position={[0, 1, 0]}
              fontSize={0.5}
              color="#ffffff"
              font="https://fonts.gstatic.com/s/outfit/v6/QGYsz_MVcBeNP4NJjtWq6H_S.woff"
            >
              FINISH
            </Text>
         </Float>
      </Box>
    </group>
  );
}

function EntryPoint({ pIdx, color, rotation }: { pIdx: number, color: string, rotation: [number, number, number] }) {
  // Arrow pointing inward
  const coords = [
    getPositionFromRC(7, 2, 0.4), // Red
    getPositionFromRC(2, 9, 0.4), // Green
    getPositionFromRC(9, 14, 0.4), // Yellow
    getPositionFromRC(14, 7, 0.4), // Blue
  ];
  
  return (
    <Float speed={3} rotationIntensity={0.2} floatIntensity={0.5} position={coords[pIdx]}>
       <mesh rotation={rotation}>
          <coneGeometry args={[0.2, 0.4, 4]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
       </mesh>
    </Float>
  );
}

function HomeBase({ color, position }: { color: string, position: [number, number, number] }) {
  return (
    <group position={position}>
      <RoundedBox args={[BOARD_CELL_SIZE * 5.5, 0.1, BOARD_CELL_SIZE * 5.5]} radius={0.5} receiveShadow>
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </RoundedBox>
      <RoundedBox args={[BOARD_CELL_SIZE * 4.5, 0.15, BOARD_CELL_SIZE * 4.5]} position={[0, 0.05, 0]} radius={0.5} receiveShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.1} />
      </RoundedBox>
      
      {/* Token resting spots inside home base */}
      {/* offset by 2 and -2 */}
      <circleGeometry args={[BOARD_CELL_SIZE*0.8, 32]} />
      {[ [-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5] ].map((offset, i) => (
         <mesh key={i} position={[offset[0]*BOARD_CELL_SIZE, 0.16, offset[1]*BOARD_CELL_SIZE]} rotation={[-Math.PI/2, 0, 0]}>
            <circleGeometry args={[BOARD_CELL_SIZE * 0.6, 32]} />
            <meshStandardMaterial color={color} opacity={0.5} transparent />
         </mesh>
      ))}
    </group>
  );
}
