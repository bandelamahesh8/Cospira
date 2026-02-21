import React from 'react';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import Room from '@/components/Room';

export default function TestRoom() {
  return (
    <WebSocketProvider>
      <div className='container mx-auto py-8'>
        <h1 className='text-3xl font-bold mb-8 text-center'>Cospira Room</h1>
        <Room />
      </div>
    </WebSocketProvider>
  );
}
