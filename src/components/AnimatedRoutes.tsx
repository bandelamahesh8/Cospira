import React, { lazy, Suspense, ReactNode, isValidElement } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

// Fallback component displayed when a lazy-loaded module fails to load or has an invalid default export.
const FallbackComponent = () => (
  <div className='min-h-screen bg-[#05070a] flex items-center justify-center p-6 font-sans'>
    <div className='max-w-md w-full bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-12 text-center shadow-2xl'>
      <div className='w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20'>
        <div className='w-3 h-3 bg-red-500 rounded-full animate-ping' />
      </div>
      <h2 className='text-2xl font-black text-white uppercase italic tracking-tighter mb-4'>Component Error</h2>
      <p className='text-zinc-400 text-sm leading-relaxed mb-8'>
        Unable to load this section. This is often caused by a bundle loading error or a top-level crash in the module.
      </p>
      <button
        onClick={() => window.location.reload()}
        className='w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all shadow-lg active:scale-95'
      >
        Refresh Application
      </button>
    </div>
  </div>
);

// helper that wraps React.lazy with a runtime check ensuring the imported module actually
// exports a default component. Without this we were getting cryptic "Cannot read properties of
// undefined (reading 'S')" errors in production when a lazy import resolved to an object that
// didn't have a default export (usually due to a bad path or a refactor). The check logs a
// helpful error and throws so the ErrorBoundary can display a meaningful message.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeLazy<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(() =>
    factory()
      .then((module) => {
        // Sanity check: module might not have default export if developer used named import pattern wrong
        const Component = module?.default;
        
        if (!Component || (typeof Component !== 'function' && typeof Component !== 'object')) {
          console.error('safeLazy error: Target is not a valid component', { module });
          return { default: (FallbackComponent as unknown) as T };
        }
        return module;
      })
      .catch((err) => {
        // Use separate arguments to prevent string conversion attempt if the logger is buggy
        console.error('safeLazy failed to load module:', err);
        return { default: (FallbackComponent as unknown) as T };
      })
  );
}

import ProtectedRoute from "@/components/ProtectedRoute";
import PageTransition from "./PageTransition";
import RootLayout from "@/components/layout/RootLayout";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageLoader } from "./PageLoader";

import Index from "@/pages/Index";
import Dashboard from "@/pages/Dashboard";

const Auth = safeLazy(() => import("@/pages/Auth"));
const About = safeLazy(() => import("@/pages/AboutPage"));
const CreateRoom = safeLazy(() => import("@/pages/CreateRoom"));
const Docs = safeLazy(() => import("@/pages/Docs"));
const Room = safeLazy(() => import("@/pages/Room"));
const Profile = safeLazy(() => import("@/pages/Profile"));
const Feedback = safeLazy(() => import("@/pages/Feedback"));
const NotFound = safeLazy(() => import("@/pages/NotFound"));
const RandomLanding = safeLazy(() => import("@/pages/random-connect/RandomLanding"));
const TextRoom = safeLazy(() => import("@/pages/random-connect/TextRoom"));
const ProjectsPage = safeLazy(() => import("@/pages/Projects"));
const Organizations = safeLazy(() => import("@/pages/Organizations"));
const OrganizationRoom = safeLazy(() => import("@/pages/OrganizationRoom"));
const BreakoutRoom = safeLazy(() => import("@/pages/BreakoutRoom"));
const Join = safeLazy(() => import("@/pages/Join"));
const Games = safeLazy(() => import("@/pages/Games"));
const AIAnalytics = safeLazy(() => import("@/pages/AIAnalyticsPage"));
const Settings = safeLazy(() => import("@/pages/Settings"));
const UpcomingFeatures = safeLazy(() => import("@/pages/UpcomingFeatures"));
import { SidebarDemo } from "@/components/SidebarDemo";


const Loader = ({ children }: { children: ReactNode }) => {
  // guard against undefined/null children; this is the most common symptom when a lazy
  // import resolves to an empty object (no default). React.createElement would otherwise
  // throw the cryptic "reading 'S'" error.
  if (children === undefined || children === null || !isValidElement(children)) {
    console.error('Loader received invalid children:', children);
    return <PageLoader />;
  }
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
};

const getRouteKey = (pathname: string) => {
  if (pathname.startsWith('/room/') || pathname.startsWith('/dashboard/room/')) return 'room-route';
  return pathname;
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={getRouteKey(location.pathname)}>
        {/* Public Routes */}

        <Route
          path="/"
          element={
            <PageTransition>
              <Loader>
                <Index />
              </Loader>
              </PageTransition>
          }
        />

        <Route
          path="/auth"
          element={
            <PageTransition>
              <Loader>
                <Auth />
              </Loader>
              </PageTransition>
          }
        />

        {/* Dashboard */}

        <Route
          path="/dashboard"
          element={
            <PageTransition>
              <Loader>
                <PageLayout showNavbar showSidebar className="p-0 overflow-hidden">
                  <Dashboard />
                </PageLayout>
              </Loader>
              </PageTransition>
          }
        />

        {/* Root Layout */}

        <Route element={<RootLayout />}>
          <Route
            path="/organizations"
            element={
              <PageTransition>
              <Loader>
                  <ProtectedRoute>
                    <Organizations />
                  </ProtectedRoute>
                </Loader>
              </PageTransition>
            }
          />

          <Route
            path="/organizations/:orgId/room"
            element={
              <PageTransition>
              <Loader>
                  <ProtectedRoute>
                    <OrganizationRoom />
                  </ProtectedRoute>
                </Loader>
              </PageTransition>
            }
          />

          <Route
            path="/organizations/:orgId/breakout/:breakoutId"
            element={
              <PageTransition>
              <Loader>
                  <ProtectedRoute>
                    <BreakoutRoom />
                  </ProtectedRoute>
                </Loader>
              </PageTransition>
            }
          />

          <Route
            path="/join/:orgId"
            element={
              <PageTransition>
              <Loader>
                  <ProtectedRoute>
                    <Join />
                  </ProtectedRoute>
                </Loader>
              </PageTransition>
            }
          />

          <Route
            path="/profile"
            element={
              <PageTransition variant="scale">
              <Loader>
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                </Loader>
              </PageTransition>
            }
          />

          <Route
            path="/projects"
            element={
              <PageTransition>
              <Loader>
                  <ProtectedRoute>
                    <ProjectsPage />
                  </ProtectedRoute>
                </Loader>
              </PageTransition>
            }
          />

          <Route
            path="/games"
            element={
              <PageTransition>
              <Loader>
                  <ProtectedRoute>
                    <Games />
                  </ProtectedRoute>
                </Loader>
              </PageTransition>
            }
          />

          <Route
            path="/ai-analytics"
            element={
              <PageTransition>
              <Loader>
                  <ProtectedRoute>
                    <AIAnalytics />
                  </ProtectedRoute>
                </Loader>
              </PageTransition>
            }
          />

          <Route
            path="/settings"
            element={
              <PageTransition>
              <Loader>
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                </Loader>
              </PageTransition>
            }
          />

          <Route
            path="/upcoming-features"
            element={
              <PageTransition>
              <Loader>
                  <ProtectedRoute>
                    <UpcomingFeatures />
                  </ProtectedRoute>
                </Loader>
              </PageTransition>
            }
          />
        </Route>

        {/* Other Routes */}

        <Route
          path="/create-room"
          element={
            <PageTransition variant="rotate">
              <Loader>
                <CreateRoom />
              </Loader>
              </PageTransition>
          }
        />

        <Route
          path="/room/:roomId"
          element={
            <PageTransition>
              <Loader>
                <Room />
              </Loader>
              </PageTransition>
          }
        />

        <Route
          path="/dashboard/room/:roomId"
          element={
            <PageTransition>
              <Loader>
                <Room />
              </Loader>
              </PageTransition>
          }
        />

        <Route
          path="/connect"
          element={
            <PageTransition variant="scale">
              <Loader>
                <RandomLanding />
              </Loader>
              </PageTransition>
          }
        />

        <Route
          path="/text-room/:roomId"
          element={
            <PageTransition>
              <Loader>
                <TextRoom />
              </Loader>
              </PageTransition>
          }
        />

        <Route
          path="/feedback"
          element={
            <PageTransition variant="slideLeft">
              <Loader>
                <Feedback />
              </Loader>
              </PageTransition>
          }
        />

        <Route
          path="/about"
          element={
            <PageTransition variant="slideLeft">
              <Loader>
                <About />
              </Loader>
              </PageTransition>
          }
        />

        <Route
          path="/docs"
          element={
            <PageTransition>
              <Loader>
                <Docs />
              </Loader>
              </PageTransition>
          }
        />

        <Route
          path="/sidebar-demo"
          element={
            <PageTransition>
              <SidebarDemo />
            </PageTransition>
          }
        />

        <Route
          path="*"
          element={
            <PageTransition>
              <Loader>
                <NotFound />
              </Loader>
              </PageTransition>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;