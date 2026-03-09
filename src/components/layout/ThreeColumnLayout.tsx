import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface ThreeColumnLayoutProps {
  topBar: ReactNode;
  sidebar: ReactNode;
  mainContent: ReactNode;
  intelligencePanel: ReactNode;
  bottomNav?: ReactNode;
}

export const ThreeColumnLayout = ({
  topBar,
  sidebar,
  mainContent,
  intelligencePanel,
  bottomNav,
  isSidebarCollapsed = false,
  isIntelligenceCollapsed = false,
}: ThreeColumnLayoutProps & {
  isSidebarCollapsed?: boolean;
  isIntelligenceCollapsed?: boolean;
}) => {
  return (
    <div className='h-screen bg-[#0b0f14] flex flex-col overflow-hidden'>
      {/* TOP BAR - Command Center */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className='fixed top-0 left-0 right-0 z-50 h-16 bg-[rgba(10,15,25,0.6)] backdrop-blur-[16px] border-b border-white/5'
      >
        {topBar}
      </motion.div>

      {/* MAIN LAYOUT - 3 Columns */}
      <div className='flex flex-1 pt-16 overflow-hidden'>
        {/* LEFT SIDEBAR - Navigation */}
        <motion.aside
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={`hidden lg:block bg-[rgba(255,255,255,0.01)] border-r border-white/5 overflow-hidden transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-60'}`}
        >
          {sidebar}
        </motion.aside>

        {/* CENTER - Main Action Zone */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className='flex-1 overflow-y-auto pb-24 lg:pb-0 custom-scrollbar'
        >
          {mainContent}
        </motion.main>

        {/* RIGHT PANEL - Intelligence Zone */}
        {intelligencePanel && (
          <motion.aside
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`hidden xl:block bg-[rgba(255,255,255,0.03)] border-l border-white/5 overflow-y-auto transition-all duration-300 ease-in-out ${isIntelligenceCollapsed ? 'w-16' : 'w-80'}`}
          >
            {intelligencePanel}
          </motion.aside>
        )}
      </div>

      {/* MOBILE BOTTOM NAV */}
      {bottomNav}
    </div>
  );
};
