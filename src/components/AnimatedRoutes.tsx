import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import About from '@/pages/About';
import Dashboard from '@/pages/Dashboard';
import CreateRoom from '@/pages/CreateRoom';
import Docs from '@/pages/Docs';
import Demo from '@/pages/Demo';
import Room from '@/pages/Room';
import Profile from '@/pages/Profile';
import NotFound from '@/pages/NotFound';
import ProtectedRoute from '@/components/ProtectedRoute';
import PageTransition from './PageTransition';

const AnimatedRoutes = () => {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
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
                        <PageTransition variant="scale">
                            <Auth />
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
                    path='/dashboard'
                    element={
                        <PageTransition variant="slideRight">
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        </PageTransition>
                    }
                />
                <Route
                    path='/create-room'
                    element={
                        <PageTransition variant="rotate">
                            <ProtectedRoute>
                                <CreateRoom />
                            </ProtectedRoute>
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
                    path='/room/:roomId'
                    element={
                        <PageTransition variant="fade">
                            <ProtectedRoute>
                                <Room />
                            </ProtectedRoute>
                        </PageTransition>
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
                    path='*'
                    element={
                        <PageTransition variant="fade">
                            <NotFound />
                        </PageTransition>
                    }
                />
            </Routes>
        </AnimatePresence>
    );
};

export default AnimatedRoutes;
