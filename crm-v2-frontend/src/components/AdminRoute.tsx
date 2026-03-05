import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminRoute: React.FC = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>;
    }

    if (!user || user.role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default AdminRoute;
