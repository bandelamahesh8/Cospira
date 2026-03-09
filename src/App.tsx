import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { BreakoutProvider } from '@/contexts/BreakoutContext';
import { AIAssistantProvider } from '@/contexts/AIAssistantContext';
import AnimatedRoutes from '@/components/AnimatedRoutes';
import { DesktopLayout } from '@/ui/desktop/DesktopLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthProvider>
            <OrganizationProvider>
              <BreakoutProvider>
                <WebSocketProvider>
                  <AIAssistantProvider>
                    <DesktopLayout>
                      <AnimatedRoutes />
                    </DesktopLayout>
                  </AIAssistantProvider>
                </WebSocketProvider>
              </BreakoutProvider>
            </OrganizationProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
