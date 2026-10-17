import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../../store/authStore.js';
import { demoUser } from '../../demo/mockAdapter.js';

// Demo build: visitors are signed in as the demo user automatically,
// unless they just logged out.
function ProtectedRoute({ children }) {
  const { user, setAuth } = useAuthStore();
  const loggedOut = sessionStorage.getItem('demo-logged-out') === '1';

  useEffect(() => {
    if (!user && !loggedOut) setAuth(demoUser);
  }, [user, loggedOut]);

  if (!user && loggedOut) return <Navigate to="/login" replace />;
  if (!user) return null;
  return children ? children : <Outlet />;
}

export default ProtectedRoute;
