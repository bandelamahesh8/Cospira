import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import { Box } from '@react-three/drei';
import * as THREE from 'three';

interface DiceProps {
  rolling: boolean;
  value: number;
  onRollComplete?: (value: number) => void;
}

export function LudoDice3D({ rolling, value }: DiceProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const [isRolling, setIsRolling] = useState(false);

  // When rolling prop changes to true:
  useEffect(() => {
    if (rolling && !isRolling) {
      setIsRolling(true);
      if (rigidBodyRef.current) {
        // Boost up
        rigidBodyRef.current.setTranslation({ x: 0, y: 5, z: 0 }, true);
        
        // Random spin
        rigidBodyRef.current.setLinvel({ x: (Math.random() - 0.5) * 5, y: 5, z: (Math.random() - 0.5) * 5 }, true);
        rigidBodyRef.current.setAngvel({ x: Math.random() * 20, y: Math.random() * 20, z: Math.random() * 20 }, true);
      }
      
      // Stop rolling after 1.5s
      setTimeout(() => {
        setIsRolling(false);
        // We could theoretically force rotation to match `value` here if we want pseudo-physics
        // But true physics dice needs raycasting to find top face. 
        // For visual sake, since game engine dictates value, we'll brute force rotation.
      }, 1500);
    }
  }, [rolling, isRolling, value]);

  useFrame(() => {
    if (!isRolling && rigidBodyRef.current) {
      // Force correct face up based on `value`
      const rotations: Record<number, [number, number, number]> = {
        1: [0, 0, 0],
        2: [Math.PI / 2, 0, 0],
        3: [0, 0, Math.PI / 2],
        4: [0, 0, -Math.PI / 2],
        5: [-Math.PI / 2, 0, 0],
        6: [Math.PI, 0, 0]
      };
      
      const target = new THREE.Euler(...(rotations[value] || [0,0,0]));
      const currentQuat = rigidBodyRef.current.rotation();
      const targetQuat = new THREE.Quaternion().setFromEuler(target);
      const slerped = new THREE.Quaternion().copy(currentQuat as THREE.Quaternion).slerp(targetQuat, 0.1);
      
      // We manually override physics locally to snap to face
      rigidBodyRef.current.setRotation(slerped, true);
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      colliders="cuboid"
      restitution={0.6}
      friction={0.5}
      position={[0, 2, 0]}
      type={isRolling ? 'dynamic' : 'fixed'}
    >
      <Box args={[1, 1, 1]} castShadow receiveShadow>
         {/* Faces (1 to 6) */}
         <meshStandardMaterial attach="material-0" color="#ffffff" map={createDiceTexture(4)} />
         <meshStandardMaterial attach="material-1" color="#ffffff" map={createDiceTexture(3)} />
         <meshStandardMaterial attach="material-2" color="#ffffff" map={createDiceTexture(6)} />
         <meshStandardMaterial attach="material-3" color="#ffffff" map={createDiceTexture(1)} />
         <meshStandardMaterial attach="material-4" color="#ffffff" map={createDiceTexture(5)} />
         <meshStandardMaterial attach="material-5" color="#ffffff" map={createDiceTexture(2)} />
      </Box>
    </RigidBody>
  );
}

// Simple canvas texture generator for dice faces
function createDiceTexture(value: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#111111';

  const drawDot = (x: number, y: number) => {
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
  };

  const center = 64;
  const offset = 32;

  if (value === 1 || value === 3 || value === 5) drawDot(center, center);
  if (value === 2 || value === 3 || value === 4 || value === 5 || value === 6) {
    drawDot(center - offset, center - offset);
    drawDot(center + offset, center + offset);
  }
  if (value === 4 || value === 5 || value === 6) {
    drawDot(center - offset, center + offset);
    drawDot(center + offset, center - offset);
  }
  if (value === 6) {
    drawDot(center - offset, center);
    drawDot(center + offset, center);
  }

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}
