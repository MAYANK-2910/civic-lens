import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, PieChart, MessageSquare, 
  Vote, ShieldCheck, LogOut, Menu, X, 
  Search, Bell, User as UserIcon, Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import { useUser } from '../lib/UserContext';
import { cn } from '../lib/utils';

const pageTransition = {
  initial: { opacity: 0, y: 8, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -8, filter: 'blur(4px)' },
};

const pageSpring = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useUser();

  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/budget', label: 'Budget Tracker', icon: PieChart },
    { to: '/feedback', label: 'Citizens Voice', icon: MessageSquare },
    { to: '/poll', label: 'Strategic Plan', icon: Vote },
    ...(profile?.role === 'admin' ? [{ to: '/admin', label: 'Control Center', icon: ShieldCheck }] : []),
  ];

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="flex h-screen bg-surface-lowest overflow-hidden relative font-sans selection:bg-primary/30">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-scrim/60 backdrop-blur-sm z-[200] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-64 bg-surface-dim border-r border-outline-variant/30 flex flex-col z-[201] lg:relative lg:translate-x-0 shadow-xl lg:shadow-none",
        "transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 pb-8 flex items-center gap-3">
          <motion.div 
            className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center rotate-3 border border-primary/20"
            whileHover={{ rotate: -3, scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <ShieldCheck className="w-5 h-5 text-primary" />
          </motion.div>
          <div>
            <span className="text-lg font-bold tracking-tight block text-on-surface">Civic Lens</span>
            <span className="text-[9px] uppercase font-bold tracking-widest text-outline">Unified Portal</span>
          </div>
        </div>

        <nav className="flex-grow px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium group",
                "transition-all duration-200 ease-out active:scale-[0.97]",
                isActive 
                  ? "text-on-primary shadow-md shadow-primary/10" 
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 bg-primary rounded-xl"
                      transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }}
                    />
                  )}
                  <item.icon className={cn(
                    "w-4 h-4 flex-shrink-0 relative z-10 transition-transform duration-200 group-hover:scale-110",
                    isActive ? "text-on-primary" : "text-outline group-hover:text-primary"
                  )} />
                  <span className="relative z-10">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-outline-variant/20">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-all duration-200 group text-sm font-medium"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Content Canvas */}
      <div className="flex-grow flex flex-col min-w-0 relative">
        <header className="h-14 bg-surface-dim/80 backdrop-blur-xl border-b border-outline-variant/20 flex items-center justify-between px-6 z-[100] sticky top-0">
          <div className="flex items-center gap-4">
            <motion.button 
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 hover:bg-surface-container rounded-md lg:hidden text-on-surface-variant"
              aria-label="Open menu"
              whileTap={{ scale: 0.9 }}
            >
              <Menu className="w-5 h-5" />
            </motion.button>
            <div className="relative hidden md:block group">
              <Search className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-all duration-200 pointer-events-none",
                searchQuery ? "text-primary" : "text-outline"
              )} />
              <input 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 bg-surface-container-low border border-outline-variant/30 rounded-full pl-8 pr-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-300 ease-out text-xs placeholder:text-outline/70 focus:w-64"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant"
              aria-label="Toggle Theme"
              whileTap={{ scale: 0.85, rotate: 180 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={isDark ? 'sun' : 'moon'}
                  initial={{ scale: 0, rotate: -90, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0, rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </motion.div>
              </AnimatePresence>
            </motion.button>
            
            <div className="relative">
              <motion.button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  "p-2 rounded-full relative group",
                  showNotifications ? "bg-primary/10 text-primary" : "hover:bg-surface-container text-on-surface-variant"
                )}
                aria-label="Notifications"
                whileTap={{ scale: 0.9 }}
              >
                <Bell className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                <motion.span 
                  className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-surface-dim shadow-sm"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                />
              </motion.button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-[109]" onClick={() => setShowNotifications(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="absolute right-0 mt-2 w-72 bg-surface-container-high border border-outline-variant rounded-xl shadow-xl p-3 z-[110]"
                    >
                      <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="font-semibold text-xs text-on-surface">Notifications</h3>
                        <button className="text-[9px] text-primary font-bold uppercase hover:underline">Mark all read</button>
                      </div>
                      <div className="space-y-1">
                        <motion.div 
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.1 }}
                          className="p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-lg flex gap-3 cursor-pointer hover:bg-surface-variant transition-colors duration-200 group/item"
                        >
                          <div className="h-6 w-6 bg-primary/10 text-primary rounded inline-flex items-center justify-center shrink-0 group-hover/item:scale-110 transition-transform duration-200">
                            <MessageSquare className="w-3 h-3" />
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-on-surface leading-tight">Welcome to CivicLens</p>
                            <p className="text-[9px] text-on-surface-variant mt-0.5">Explore your city's data and share your voice.</p>
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            
            <div className="h-6 w-[1px] bg-outline-variant/20 mx-1" />

            <motion.button 
              onClick={() => navigate('/profile')}
              className="group flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-surface-container transition-all duration-200"
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex flex-col items-end hidden sm:flex text-right">
                <span className="text-[11px] font-semibold text-on-surface leading-none truncate max-w-[100px]">
                  {profile?.displayName || (user?.isAnonymous ? 'Guest User' : (user?.email || 'Citizen'))}
                </span>
                <span className="text-[9px] text-on-surface-variant leading-none mt-1 uppercase tracking-tighter font-semibold">
                  {profile?.role || 'Citizen'}
                </span>
              </div>
              <div className="h-7 w-7 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant/50 group-hover:border-primary transition-colors duration-200 overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 text-on-surface-variant group-hover:text-primary transition-colors duration-200" />
                )}
              </div>
            </motion.button>
          </div>
        </header>

        <main className="flex-grow overflow-y-auto p-4 md:p-6 lg:p-8 relative scroll-smooth bg-surface-lowest">
          <div className="max-w-7xl mx-auto h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={pageTransition.initial}
                animate={pageTransition.animate}
                exit={pageTransition.exit}
                transition={pageSpring}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
