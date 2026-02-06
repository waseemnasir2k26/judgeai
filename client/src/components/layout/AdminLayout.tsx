import React, { useState } from 'react';
import { Outlet, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from './Navbar';
import { PageLoader } from '../ui/Spinner';
import {
  LayoutDashboard,
  Users,
  Settings,
  MessageSquare,
  FileText,
  ShieldCheck,
  ChevronLeft,
  X,
  Menu,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (isLoading) {
    return <PageLoader message="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Overview', exact: true },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/ai-config', icon: Settings, label: 'AI Configuration' },
    { path: '/admin/feedback', icon: MessageSquare, label: 'Feedback' },
    { path: '/admin/audit-logs', icon: FileText, label: 'Audit Logs' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-legal-darker">
      {/* Top Navigation */}
      <div className="h-16 bg-legal-dark border-b border-gray-800 px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-legal-gold" />
            <span className="text-lg font-semibold text-white">Admin Panel</span>
          </div>
        </div>

        <NavLink
          to="/dashboard"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to App</span>
        </NavLink>
      </div>

      <div className="flex">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed top-16 left-0 h-[calc(100vh-4rem)] w-64
            bg-legal-dark border-r border-gray-800
            transform transition-transform duration-300 ease-in-out z-30
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0 lg:static lg:z-0
          `}
        >
          <div className="flex flex-col h-full">
            {/* Mobile Close Button */}
            <div className="flex items-center justify-between p-4 lg:hidden">
              <span className="font-semibold text-white">Menu</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg
                      transition-all duration-200
                      ${isActive
                        ? 'bg-legal-gold/20 text-legal-gold'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* User Info */}
            {user && (
              <div className="p-4 border-t border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-legal-gold flex items-center justify-center text-legal-dark font-medium">
                    {user.firstName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-400 truncate capitalize">
                      {user.role}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8 min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
