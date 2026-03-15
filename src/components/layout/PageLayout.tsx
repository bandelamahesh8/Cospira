import React from 'react';
import Navbar from '@/components/Navbar';
import { Sidebar, SidebarBody, SidebarProvider } from '@/components/ui/aceternity-sidebar';
import { cn } from '@/lib/utils';
import { Sidebar as AppSidebar } from '@/components/layout/Sidebar';
import { motion } from 'framer-motion';

interface PageLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showNavbar?: boolean;
  className?: string;
  noPadding?: boolean;
}

/**
 * Unified page layout component
 * Provides consistent navbar, sidebar, and responsive behavior across all pages
 */
export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  showSidebar = true,
  showNavbar = true,
  className,
  noPadding = false,
}) => {
  const [open, setOpen] = React.useState(false);

  return (
    <SidebarProvider open={open} setOpen={setOpen}>
      <div className='flex h-screen w-full flex-col bg-background overflow-hidden relative'>
        {/* Navbar */}
        {showNavbar && <Navbar isFixed={true} />}

        <div className={cn('flex flex-1 overflow-hidden', showNavbar && 'pt-16')}>
          {/* Sidebar */}
          {showSidebar && (
            <Sidebar open={open} setOpen={setOpen}>
              <SidebarBody className="border-r border-border h-full">
                <AppSidebar />
              </SidebarBody>
            </Sidebar>
          )}

          {/* Main Content */}
          <main className={cn('flex-1 overflow-auto min-w-0', !noPadding && 'p-1 md:p-1', className)}>
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="h-full"
            >
                {children}
            </motion.div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PageLayout;
