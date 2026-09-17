import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Loader2 } from 'lucide-react';

export default function AdminGuard() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const checkAdminStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.user) {
          if (isMounted) setIsAdmin(false);
          window.location.href = '/login';
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
          setIsAdmin(profile?.role === 'admin');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        if (isMounted) setIsAdmin(false);
        window.location.href = '/login';
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    checkAdminStatus();

    return () => { isMounted = false; };
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
