import { useLocation, useNavigate } from 'react-router-dom';
import CospiraLogoImg from '@/assets/COSPIRA_LOGO.png';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Gamepad2,
  Brain,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  User,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebar } from '@/components/ui/sidebar';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Building2, label: 'Organizations', path: '/organizations' },
  { icon: Gamepad2, label: 'Games', path: '/games' },
  { icon: Brain, label: 'AI Analytics', path: '/ai-analytics' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <div className='h-full flex flex-col pt-6 relative overflow-hidden'>
      {/* Background Image */}
      <div
        className='absolute inset-0 z-0 opacity-10 pointer-events-none bg-center bg-no-repeat bg-contain'
        style={{ backgroundImage: `url(${CospiraLogoImg})` }}
      />

      {/* Header: Logo and Toggle */}
      <div
        className={`px-4 mb-6 flex items-center relative z-10 ${isCollapsed ? 'justify-center' : 'justify-between'}`}
      >
        {/* {!isCollapsed && (
            <Link to="/" className="flex items-center gap-2 pl-2 group/logo">
               <CospiraLogo size={28} className="text-white group-hover/logo:text-blue-400 transition-colors" />
               <div className="flex flex-col">
                  <span className="font-black tracking-tighter text-white uppercase italic text-lg leading-none">Cospira</span>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] leading-none">Access OS</span>
               </div>
            </Link>
         )} */}

        <button
          onClick={toggleSidebar}
          className='p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all group relative'
        >
          {isCollapsed ? (
            <PanelLeftOpen className='w-5 h-5 shrink-0' />
          ) : (
            <PanelLeftClose className='w-5 h-5 shrink-0' />
          )}

          {isCollapsed && (
            <div className='absolute left-full ml-6 px-3 py-1.5 bg-[#0c1016] text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none z-50'>
              Expand Sidebar
            </div>
          )}
        </button>
      </div>

      <nav
        className={`flex-1 flex flex-col space-y-3 relative z-10 ${isCollapsed ? 'px-3' : 'px-4'}`}
      >
        <TooltipProvider delayDuration={0}>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            const ButtonContent = (
              <motion.button
                key={item.path}
                layout
                onClick={() => navigate(item.path)}
                className={`
                  w-full h-12 rounded-2xl flex items-center transition-all relative group
                  ${isActive ? 'bg-blue-600/10' : 'hover:bg-white/5'}
                  ${isCollapsed ? 'justify-center px-0' : 'px-4 gap-4'}
                `}
              >
                {/* Active Glow */}
                {isActive && (
                  <div className='absolute inset-0 rounded-2xl border border-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.15)]' />
                )}

                {/* Content */}
                <div
                  className={`relative z-10 flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'}`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      isActive ? 'text-blue-400' : 'text-zinc-500 group-hover:text-white'
                    }`}
                  />

                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className={`text-sm font-bold transition-colors whitespace-nowrap uppercase tracking-widest ${
                        isActive ? 'text-blue-100' : 'text-zinc-500 group-hover:text-white'
                      }`}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </div>
              </motion.button>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>{ButtonContent}</TooltipTrigger>
                  <TooltipContent
                    side='right'
                    className='bg-[#0c1016] text-white border-white/10 font-bold ml-6 px-4 py-2 rounded-xl shadow-2xl backdrop-blur-xl'
                  >
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return ButtonContent;
          })}
        </TooltipProvider>
      </nav>

      {/* Bottom Section - Settings / System */}
      <div
        className={`pt-6 border-t border-white/5 space-y-3 pb-8 relative z-10 ${isCollapsed ? 'px-3' : 'px-4'}`}
      >
        <TooltipProvider delayDuration={0}>
          {/* System */}
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                layout
                onClick={() => navigate('/settings')}
                className={`
                  w-full h-12 rounded-2xl flex items-center transition-all relative group
                  ${location.pathname === '/settings' ? 'bg-blue-600/10' : 'hover:bg-white/5'}
                  ${isCollapsed ? 'justify-center px-0' : 'px-4 gap-4'}
                `}
              >
                {location.pathname === '/settings' && (
                  <div className='absolute inset-0 rounded-2xl border border-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.15)]' />
                )}
                <div
                  className={`relative z-10 flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'}`}
                >
                  <Settings
                    className={`w-5 h-5 shrink-0 transition-colors ${location.pathname === '/settings' ? 'text-blue-400' : 'text-zinc-500 group-hover:text-white'}`}
                  />
                  {!isCollapsed && (
                    <div className='flex flex-col items-start leading-none gap-0.5'>
                      <span
                        className={`text-sm font-bold transition-colors whitespace-nowrap uppercase tracking-widest ${location.pathname === '/settings' ? 'text-blue-100' : 'text-zinc-500 group-hover:text-white'}`}
                      >
                        System
                      </span>
                      <span className='text-[9px] font-black text-emerald-500/60 uppercase tracking-[0.2em]'>
                        Optimal
                      </span>
                    </div>
                  )}
                </div>
              </motion.button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent
                side='right'
                className='bg-[#0c1016] text-white border-white/10 font-bold ml-6 px-4 py-2 rounded-xl shadow-2xl backdrop-blur-xl'
              >
                System: Optimal
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};
