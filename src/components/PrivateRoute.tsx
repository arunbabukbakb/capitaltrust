import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface PrivateRouteProps {
  user: any;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ user }) => {
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;