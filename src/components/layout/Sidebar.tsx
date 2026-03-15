import React from 'react';
import { useLocation } from 'react-router-dom';
import CospiraLogoImg from '@/assets/COSPIRA_LOGO.png';
import { LayoutDashboard, Gamepad2, Brain, Settings, Building2, Bot, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAceternitySidebar as useSidebar } from '@/components/ui/aceternity-sidebar';
import { SidebarLink } from '@/components/ui/aceternity-sidebar';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { icon: <LayoutDashboard className='w-5 h-5' />, label: 'Dashboard', path: '/dashboard' },
  { icon: <Building2 className='w-5 h-5' />, label: 'Organizations', path: '/organizations' },
  { icon: <Gamepad2 className='w-5 h-5' />, label: 'Games', path: '/games' },
  { icon: <Brain className='w-5 h-5' />, label: 'AI Analytics', path: '/ai-analytics' },
  {
    icon: <Bot className='w-5 h-5' />,
    label: 'AI Interview',
    path: '/ai-interview',
    badge: 'Launching Soon',
  },
];

export const Sidebar = () => {
  const location = useLocation();
  const { open } = useSidebar();
  const [openTooltip, setOpenTooltip] = React.useState<string | null>(null);

  return (
    <div className='flex flex-col h-full bg-transparent relative selection:bg-indigo-500/30'>
      {/* Background Subtle Logo Glow */}
      <div
        className='absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-center bg-no-repeat bg-contain scale-150 blur-xl'
        style={{ backgroundImage: `url(${CospiraLogoImg})` }}
      />

      <nav className='flex-1 flex flex-col space-y-4 relative z-10'>
        <TooltipProvider delayDuration={100}>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const link = (
              <SidebarLink
                key={item.path}
                link={{
                  label: item.label,
                  href: item.path,
                  badge: item.badge,
                  icon: React.cloneElement(item.icon as React.ReactElement, {
                    className: `w-5 h-5 shrink-0 transition-all duration-300 ${
                      isActive ? 'text-white' : 'text-zinc-500 group-hover/sidebar:text-zinc-200'
                    }`,
                  }),
                }}
                className={cn(
                  'transition-all duration-300',
                  isActive
                    ? 'bg-indigo-600/20 border-indigo-500/30 shadow-[0_4px_12px_rgba(99,102,241,0.1)]'
                    : 'hover:bg-white/[0.03] hover:border-white/5'
                )}
              />
            );

            if (!open) {
              return (
                <Tooltip
                  key={item.path}
                  open={openTooltip === item.path}
                  onOpenChange={(isOpen) => setOpenTooltip(isOpen ? item.path : null)}
                >
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent
                    side='right'
                    className='bg-[#0A0D11] text-white border border-white/5 font-bold ml-6 px-4 py-2 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl'
                  >
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return link;
          })}
        </TooltipProvider>
      </nav>

      {/* Bottom Section */}
      <div className='pt-6 border-t border-white/5 space-y-4 pb-4 relative z-10'>
        <SidebarLink
          link={{
            label: 'About Cospira',
            href: '/about',
            icon: (
              <Info
                className={`w-5 h-5 shrink-0 transition-all duration-300 ${location.pathname === '/about' ? 'text-white' : 'text-zinc-500 group-hover/sidebar:text-zinc-200'}`}
              />
            ),
          }}
          className={cn(
            'transition-all duration-300',
            location.pathname === '/about'
              ? 'bg-indigo-600/20 border-indigo-500/30'
              : 'hover:bg-white/[0.03] hover:border-white/5'
          )}
        />
        <SidebarLink
          link={{
            label: 'Settings',
            href: '/settings',
            icon: (
              <Settings
                className={`w-5 h-5 shrink-0 transition-all duration-300 ${location.pathname === '/settings' ? 'text-white' : 'text-zinc-500 group-hover/sidebar:text-zinc-200'}`}
              />
            ),
          }}
          className={cn(
            'transition-all duration-300',
            location.pathname === '/settings'
              ? 'bg-indigo-600/20 border-indigo-500/30'
              : 'hover:bg-white/[0.03] hover:border-white/5'
          )}
        />
      </div>
    </div>
  );
};
