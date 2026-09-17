import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Loader2 } from 'lucide-react';

export default function AdminGuard() {
  const [authStatus, setAuthStatus] = useState('checking'); // 'checking' | 'unauthenticated' | 'student' | 'admin'
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const checkAdminStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.user) {
          if (isMounted) setAuthStatus('unauthenticated');
          return;
        }
        
        const user = session.user;

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (isMounted) {
          console.log("Admin Access Check - User Role:", profile?.role);
          setAuthStatus(profile?.role === 'admin' ? 'admin' : 'student');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        if (isMounted) setAuthStatus('unauthenticated');
      }
    };

    checkAdminStatus();

    return () => { isMounted = false; };
  }, [location.pathname]);

  if (authStatus === 'checking') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  if (authStatus === 'student') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
