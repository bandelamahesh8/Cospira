import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const RoomSkeleton = () => {
  return (
    <div className='flex flex-col h-[100dvh] w-full bg-black/90 relative overflow-hidden'>
      {/* Background Ambience */}
      <div className='absolute inset-0 bg-gradient-to-br from-indigo-900/10 via-background to-background z-0' />

      {/* Header Skeleton */}
      <div className='relative z-10 w-full p-4 flex justify-between items-center'>
        <div className='flex items-center gap-3'>
          <Skeleton className='h-10 w-10 rounded-full bg-white/5' />
          <div className='space-y-2'>
            <Skeleton className='h-4 w-32 bg-white/5' />
            <Skeleton className='h-3 w-24 bg-white/5' />
          </div>
        </div>
        <div className='flex gap-2'>
          <Skeleton className='h-9 w-20 rounded-lg bg-white/5' />
          <Skeleton className='h-9 w-9 rounded-lg bg-white/5' />
        </div>
      </div>

      {/* Main Content Skeleton (Video Grid) */}
      <div className='flex-1 relative z-10 p-4'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full'>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className='relative rounded-3xl overflow-hidden bg-white/5 border border-white/5 p-4 flex flex-col justify-end'
            >
              <Skeleton className='absolute inset-0 bg-white/5' />
              <div className='relative z-10 flex items-center gap-2'>
                <Skeleton className='h-8 w-8 rounded-full bg-white/10' />
                <Skeleton className='h-4 w-24 bg-white/10' />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls Skeleton */}
      <div className='relative z-20 pb-8 pt-4 px-4 flex justify-center'>
        <div className='luxury-glass border border-white/10 rounded-3xl p-2 px-6 flex gap-4 h-20 items-center'>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className='h-12 w-12 rounded-2xl bg-white/10' />
          ))}
        </div>
      </div>
    </div>
  );
};
