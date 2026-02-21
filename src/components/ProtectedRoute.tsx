import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { useRef, useEffect } from 'react';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const hasNavigated = useRef(false);

  // Reset navigation flag when location changes
  useEffect(() => {
    hasNavigated.current = false;
  }, [location.pathname]);

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-background'>
        <Loader2 className='w-8 h-8 animate-spin text-primary' />
      </div>
    );
  }

  if (!user && !hasNavigated.current) {
    hasNavigated.current = true;
    // Redirect to auth page but save the attempted location
    return <Navigate to='/auth' state={{ from: location }} replace />;
  }

  if (!user) {
    // Prevent infinite loop by showing loading state if already navigated
    return (
      <div className='min-h-screen flex items-center justify-center bg-background'>
        <Loader2 className='w-8 h-8 animate-spin text-primary' />
      </div>
    );
  }
  return <>{children}</>;
};

export default ProtectedRoute;
