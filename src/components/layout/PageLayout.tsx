import React from 'react';
import Navbar from '@/components/Navbar';
import { Sidebar, SidebarContent, SidebarTrigger, SidebarProvider } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Sidebar as AppSidebar } from '@/components/layout/Sidebar';

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
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className='flex h-screen w-full flex-col bg-background overflow-hidden relative'>
        {/* Navbar */}
        {showNavbar && <Navbar isFixed={true} />}

        <div className={cn('flex flex-1 overflow-hidden', showNavbar && 'pt-16')}>
          {/* Sidebar */}
          {showSidebar && !isMobile && (
            <Sidebar
              collapsible='icon'
              className='hidden md:flex border-r border-border mt-16 h-[calc(100vh-4rem)]'
            >
              <SidebarContent>
                <AppSidebar />
              </SidebarContent>
            </Sidebar>
          )}

          {/* Mobile Sidebar Trigger */}
          {showSidebar && isMobile && (
            <SidebarTrigger className='absolute left-4 top-20 z-50 md:hidden' />
          )}

          {/* Main Content */}
          <main className={cn('flex-1 overflow-auto', !noPadding && 'p-1 md:p-1', className)}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PageLayout;
