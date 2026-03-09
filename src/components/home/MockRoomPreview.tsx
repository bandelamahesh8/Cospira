import { motion } from 'framer-motion';
import { Mic, Video, Monitor, MessageSquare, Users, Settings, Phone } from 'lucide-react';

const MockRoomPreview = () => {
  return (
    <motion.div
      className='relative w-full max-w-4xl mx-auto aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black/80 backdrop-blur-sm'
      initial={{ opacity: 0, y: 40, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1, delay: 0.2 }}
      style={{ perspective: '1000px' }}
    >
      {/* Browser Header Mock */}
      <div className='h-8 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2'>
        <div className='flex gap-1.5'>
          <div className='w-2.5 h-2.5 rounded-full bg-red-500/50' />
          <div className='w-2.5 h-2.5 rounded-full bg-yellow-500/50' />
          <div className='w-2.5 h-2.5 rounded-full bg-green-500/50' />
        </div>
        <div className='mx-auto w-1/3 h-4 rounded-full bg-white/5' />
      </div>

      {/* Main Content Area */}
      <div className='p-4 h-[calc(100%-2rem)] flex gap-4'>
        {/* Sidebar / Participants */}
        <div className='hidden md:flex flex-col gap-3 w-16 items-center py-4 bg-white/5 rounded-2xl border border-white/5'>
          <div className='w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 animate-pulse' />
          <div className='w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500' />
          <div className='w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500' />
          <div className='mt-auto w-10 h-10 rounded-full bg-white/10 flex items-center justify-center'>
            <Settings className='w-5 h-5 text-white/50' />
          </div>
        </div>

        {/* Central Stage */}
        <div className='flex-1 flex flex-col gap-4'>
          {/* Video Grid Mock */}
          <div className='flex-1 grid grid-cols-2 gap-4'>
            <div className='relative rounded-2xl bg-zinc-900/50 overflow-hidden border border-white/5 group'>
              <div className='absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-50' />
              <div className='absolute bottom-4 left-4 flex gap-2'>
                <div className='px-2 py-1 rounded bg-black/50 text-[10px] text-white'>You</div>
              </div>
              <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
                <div className='w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center animate-pulse'>
                  <span className='text-purple-500 font-bold text-xl'>JD</span>
                </div>
              </div>
            </div>
            <div className='relative rounded-2xl bg-zinc-900/50 overflow-hidden border border-white/5'>
              <div className='absolute inset-0 flex items-center justify-center text-white/20'>
                <Monitor className='w-12 h-12' />
              </div>
              <div className='absolute top-4 right-4 px-2 py-1 rounded bg-green-500/20 text-green-500 text-[10px] border border-green-500/20'>
                Screen Sharing
              </div>
            </div>
          </div>

          {/* Control Bar Mock */}
          <div className='h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-4 px-6 relative overflow-hidden'>
            <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 animate-shimmer' />

            {[Mic, Video, Monitor, MessageSquare, Users].map((Icon, i) => (
              <div
                key={i}
                className='w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all cursor-default'
              >
                <Icon className='w-5 h-5 text-white' />
              </div>
            ))}
            <div className='w-10 h-10 rounded-full bg-red-500 flex items-center justify-center hover:scale-110 transition-all shadow-lg shadow-red-500/30'>
              <Phone className='w-5 h-5 text-white rotate-[135deg]' />
            </div>
          </div>
        </div>

        {/* Chat Area Mock */}
        <div className='hidden lg:flex w-64 flex-col gap-3 bg-white/5 rounded-2xl border border-white/5 p-3'>
          <div className='h-8 border-b border-white/5 font-xs text-white/50 px-2 flex items-center justify-between'>
            <span>Chat</span>
            <div className='w-2 h-2 rounded-full bg-green-500' />
          </div>
          <div className='flex-1 flex flex-col gap-2 overflow-hidden'>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`flex flex-col gap-1 ${i % 2 === 0 ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`px-3 py-2 rounded-xl text-[10px] text-white/80 max-w-[80%] ${i % 2 === 0 ? 'bg-primary/20 rounded-tr-none' : 'bg-white/10 rounded-tl-none'}`}
                >
                  <div className='w-24 h-2 bg-white/20 rounded mb-1' />
                  <div className='w-16 h-2 bg-white/10 rounded' />
                </div>
              </div>
            ))}
          </div>
          <div className='h-10 rounded-xl bg-black/20 border border-white/5' />
        </div>
      </div>
    </motion.div>
  );
};

export default MockRoomPreview;
