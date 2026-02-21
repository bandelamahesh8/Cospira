import { Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import PageTransition from './PageTransition';
import { PageLoader } from '@/components/PageLoader';
import { PageLayout } from '@/components/layout/PageLayout';

// Lazy loaded pages
const Index = lazy(() => import('@/pages/Index'));
const Auth = lazy(() => import('@/pages/Auth'));
const About = lazy(() => import('@/pages/AboutPage'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const CreateRoom = lazy(() => import('@/pages/CreateRoom'));
const Docs = lazy(() => import('@/pages/Docs'));
const Demo = lazy(() => import('@/pages/Demo'));
const Room = lazy(() => import('@/pages/Room'));
const SocialRoom = lazy(() => import('@/pages/SocialRoom'));
const Profile = lazy(() => import('@/pages/Profile'));
const Feedback = lazy(() => import('@/pages/Feedback'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Activity = lazy(() => import('@/pages/Activity'));
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const RandomLanding = lazy(() => import('@/pages/random-connect/RandomLanding'));
const TextRoom = lazy(() => import('@/pages/random-connect/TextRoom'));
const ProjectsPage = lazy(() => import('@/pages/Projects'));
const ProjectDashboard = lazy(() => import('@/pages/ProjectDashboard'));
const UpcomingFeatures = lazy(() => import('@/pages/UpcomingFeatures'));

const ModeSelection = lazy(() => import('@/pages/ModeSelection'));
const ModeSelectorDemo = lazy(() => import('@/pages/ModeSelectorDemo'));
const AIAnalyticsPage = lazy(() => import('@/pages/AIAnalyticsPage'));
const Games = lazy(() => import('@/pages/Games'));
const Settings = lazy(() => import('@/pages/Settings'));
const RootLayout = lazy(() => import('@/components/layout/RootLayout'));

const AnimatedRoutes = () => {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Suspense fallback={<div className="h-screen w-full flex items-center justify-center"><PageLoader /></div>}>
                <Routes location={location} key={location.pathname}>
                    <Route
                        path='/'
                        element={
                            <PageTransition variant="fade">
                                <Index />
                            </PageTransition>
                        }
                    />
                    <Route
                        path='/auth'
                        element={
                            <PageTransition variant="slideUp">
                                <Auth />
                            </PageTransition>
                        }
                    />

                    
                    {/* Routes with Shared Sidebar/Navbar */}
                    <Route 
                        path='/dashboard' 
                        element={
                            <PageLayout showNavbar={true} showSidebar={true} className="p-0 overflow-hidden">
                                <PageTransition variant="slideRight">
                                    <Dashboard />
                                </PageTransition>
                            </PageLayout>
                        } 
                    />

                    <Route element={<RootLayout />}>


                        <Route
                            path='/games'
                            element={
                                <PageTransition variant="fade">
                                    <Games />
                                </PageTransition>
                            }
                        />
                        <Route
                            path='/ai-analytics'
                            element={
                                <ProtectedRoute>
                                    <PageTransition variant="fade">
                                        <AIAnalyticsPage />
                                    </PageTransition>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path='/settings'
                            element={
                                <ProtectedRoute>
                                    <PageTransition variant="fade">
                                        <Settings />
                                    </PageTransition>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path='/profile'
                            element={
                                <PageTransition variant="scale">
                                    <ProtectedRoute>
                                        <Profile />
                                    </ProtectedRoute>
                                </PageTransition>
                            }
                        />
                        <Route
                            path='/projects'
                            element={
                                <PageTransition variant="fade">
                                    <ProtectedRoute>
                                        <ProjectsPage />
                                    </ProtectedRoute>
                                </PageTransition>
                            }
                        />
                        <Route
                            path='/activity'
                            element={
                                <PageTransition variant="slideRight">
                                    <Activity />
                                </PageTransition>
                            }
                        />
                        <Route
                            path='/upcoming'
                            element={
                                <PageTransition variant="scale">
                                    <UpcomingFeatures />
                                </PageTransition>
                            }
                        />
                        <Route
                            path='/about'
                            element={
                                <PageTransition variant="slideLeft">
                                    <About />
                                </PageTransition>
                            }
                        />
                        <Route
                            path='/docs'
                            element={
                                <PageTransition variant="fade">
                                    <Docs />
                                </PageTransition>
                            }
                        />
                    </Route>

                    {/* Special/Full-screen Routes */}
                    <Route
                        path='/mode-selection'
                        element={
                            <PageTransition variant="fade">
                                <ModeSelection />
                            </PageTransition>
                        }
                    />
                    <Route
                        path='/create-room'
                        element={
                            <PageTransition variant="rotate">
                                <CreateRoom />
                            </PageTransition>
                        }
                    />
                    <Route
                        path='/docs'
                        element={
                            <PageTransition variant="fade">
                                <Docs />
                            </PageTransition>
                        }
                    />
                    <Route
                        path='/demo'
                        element={
                            <PageTransition variant="scale">
                                <Demo />
                            </PageTransition>
                        }
                    />
                    <Route
                        path='/dashboard/room/:roomId'
                        element={
                            <PageTransition variant="fade">
                                <Room />
                            </PageTransition>
                        }
                    />
                    <Route
                        path='/room/:roomId'
                        element={
                            <PageTransition variant="fade">
                                <Room />
                            </PageTransition>
                        }
                    />
                    <Route
                        path='/feedback'
                        element={
                            <PageTransition variant="slideLeft">
                                <Feedback />
                            </PageTransition>
                        }
                    />
                    <Route
                        path='/COSPERA_ADMIN88/login'
                        element={
                            <PageTransition variant="fade">
                                <AdminLogin />
                            </PageTransition>
                        }
                    />
                    <Route
                        path='/COSPERA_ADMIN88'
                        element={
                            <PageTransition variant="fade">
                                <AdminDashboard />
                            </PageTransition>
                        }
                    />
                    <Route
                        path='/connect'
                        element={
                            <PageTransition variant="scale">
                                <RandomLanding />
                            </PageTransition>
                        }
                    />
                    <Route
                        path='/text-room/:roomId'
                        element={
                            <PageTransition variant="fade">
                                <TextRoom />
                            </PageTransition>
                        }
                    />
                    <Route
                        path='/project/:projectId'
                        element={
                            <PageTransition variant="slideLeft">
                                <ProtectedRoute>
                                    <ProjectDashboard />
                                </ProtectedRoute>
                            </PageTransition>
                        }
                    />
                    <Route
                        path='/mode-selector-demo'
                        element={
                            <PageTransition variant="scale">
                                <ModeSelectorDemo />
                            </PageTransition>
                        }
                    />
                    <Route
                        path="/social-room/:roomId"
                        element={
                            <PageTransition variant="fade">
                                <Suspense fallback={<PageLoader />}>
                                    <SocialRoom />
                                </Suspense>
                            </PageTransition>
                        }
                    />
                    <Route
                        path='*'
                        element={
                            <PageTransition variant="fade">
                                <NotFound />
                            </PageTransition>
                        }
                    />
                </Routes>
            </Suspense>
        </AnimatePresence>
    );
};

export default AnimatedRoutes;
