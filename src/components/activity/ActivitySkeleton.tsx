import { Skeleton } from '@/components/ui/skeleton';

export const ActivitySkeleton = () => {
  return (
    <div className='relative border-l border-white/5 ml-3 pl-8 space-y-12 py-2'>
      {[1, 2].map((groupIndex) => (
        <div key={groupIndex} className='relative'>
          {/* Date Group Header */}
          <div className='absolute -left-[41px] top-0 flex items-center bg-[#05070a] py-1 border border-white/5 rounded-md px-1.5 min-w-[60px] justify-center'>
            <Skeleton className='h-3 w-10 bg-white/10' />
          </div>

          {/* Activities in this group */}
          <div className='space-y-4 pt-1'>
            {[1, 2, 3].map((itemIndex) => (
              <div key={itemIndex} className='relative group'>
                {/* Timeline dot */}
                <div className='absolute -left-[43px] top-6 w-2 h-2 rounded-full border border-white/10 bg-[#0c1016] z-10' />

                {/* Card */}
                <div className='bg-[#0c1016] border border-white/5 rounded-2xl p-5'>
                  <div className='flex items-start justify-between gap-4'>
                    <div className='flex-1 space-y-3'>
                      {/* Title & Subtitle */}
                      <div className='space-y-2'>
                        <Skeleton className='h-4 w-48 bg-white/10' />
                        <Skeleton className='h-3 w-24 bg-white/5' />
                      </div>
                      {/* Action */}
                      <Skeleton className='h-3 w-32 bg-white/5' />

                      {/* Stats */}
                      <div className='flex gap-3 pt-1'>
                        <Skeleton className='h-5 w-16 bg-white/5 rounded-md' />
                        <Skeleton className='h-5 w-12 bg-white/5 rounded-md' />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
