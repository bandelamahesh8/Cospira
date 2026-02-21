import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Gamepad2, Brain, User } from 'lucide-react';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Gamepad2, label: 'Games', path: '/games' },
  { icon: Brain, label: 'AI', path: '/ai-insights' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0b0f14]/90 backdrop-blur-xl border-t border-white/10 pb-safe md:hidden">
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.9 }}
              className="relative flex flex-col items-center justify-center w-full h-full gap-1 group"
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-white' : 'text-white/40'
                  }`}
                />
                
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -inset-2 bg-white/5 rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
              
              <span
                className={`text-[10px] font-bold transition-colors ${
                  isActive ? 'text-white' : 'text-white/40'
                }`}
              >
                {item.label}
              </span>

              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute top-0 w-8 h-0.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
