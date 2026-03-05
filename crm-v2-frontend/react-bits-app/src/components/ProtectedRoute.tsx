import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    console.log('ProtectedRoute: Loading auth state...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity }}
          className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full"
        />
        <p className="text-slate-300">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('ProtectedRoute: Authenticated, rendering children');
  return <>{children}</>;
};

export default ProtectedRoute;
