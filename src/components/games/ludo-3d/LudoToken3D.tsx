import { useSpring, a } from '@react-spring/three';
import { getCoords3D, LUDO_COLORS, BOARD_CELL_SIZE } from './LudoConfig';
import { Cylinder } from '@react-three/drei';
import { useEffect, useState } from 'react';

interface TokenProps {
  playerIndex: number;
  tokenIndex: number;
  position: number;
  color: 'red' | 'green' | 'yellow' | 'blue';
  isMovable: boolean;
  onClick: () => void;
  isAiTarget?: boolean;
}

export function LudoToken3D({
  playerIndex,
  tokenIndex,
  position,
  color,
  isMovable,
  onClick,
  isAiTarget
}: TokenProps) {
  const [targetPos, setTargetPos] = useState<[number, number, number]>(() => getCoords3D(playerIndex, position, tokenIndex));
  const hexColor = LUDO_COLORS[color] || '#ffffff';

  // Update target when position changes
  useEffect(() => {
    setTargetPos(getCoords3D(playerIndex, position, tokenIndex));
  }, [position, playerIndex, tokenIndex]);

  // Spring animation for smooth movement (x, z) and a parabolic jump (y)
  // To keep it simple, we animate x,z normally and add a bounce if movable
  const { pos } = useSpring({
    to: { pos: targetPos },
    config: { mass: 1, tension: 170, friction: 26 }
  });

  const { scale } = useSpring({
    to: { scale: isMovable ? [1.1, 1.1, 1.1] : [1, 1, 1] },
    config: { tension: 300, friction: 10 }
  });

  const { bounceY } = useSpring({
    from: { bounceY: 0 },
    to: async (next) => {
      while (isMovable) {
        await next({ bounceY: 0.3 });
        await next({ bounceY: 0 });
      }
    },
    reset: true,
    config: { tension: 300, friction: 10 }
  });

  return (
    <a.group
      position={pos as unknown as [number, number, number]}
      scale={scale as unknown as [number, number, number]}
      onClick={(e) => {
        if (isMovable) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      <a.group position-y={isMovable ? bounceY : 0}>
        <Cylinder args={[BOARD_CELL_SIZE * 0.3, BOARD_CELL_SIZE * 0.4, 0.6, 32]} position={[0, 0.3, 0]} castShadow>
          <meshPhysicalMaterial 
            color={hexColor} 
            roughness={0.1}
            transmission={0.6}
            thickness={1}
            metalness={0.2}
          />
        </Cylinder>
        <Cylinder args={[BOARD_CELL_SIZE * 0.2, BOARD_CELL_SIZE * 0.3, 0.4, 32]} position={[0, 0.7, 0]} castShadow>
          <meshStandardMaterial color={hexColor} roughness={0.2} metalness={0.8} />
        </Cylinder>

        <mesh position={[0, 0.9, 0]} castShadow>
          <sphereGeometry args={[BOARD_CELL_SIZE * 0.25, 32, 32]} />
          <meshStandardMaterial color={hexColor} emissive={isAiTarget ? '#ffffff' : hexColor} emissiveIntensity={isAiTarget ? 0.5 : 0} />
        </mesh>
      </a.group>

      {isMovable && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[BOARD_CELL_SIZE * 0.4, BOARD_CELL_SIZE * 0.5, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
        </mesh>
      )}
    </a.group>
  );
}
