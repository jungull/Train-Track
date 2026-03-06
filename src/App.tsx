import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Dumbbell, Zap, ListTodo, Timer, LineChart, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import TodayPage from './pages/TodayPage';
import GTGPage from './pages/GTGPage';
import ProgramPage from './pages/ProgramPage';
import ToolsPage from './pages/ToolsPage';
import ProgressPage from './pages/ProgressPage';
import SettingsPage from './pages/SettingsPage';
import GTGManager from './components/GTGManager';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      <GTGManager />
      <main className="flex-1 w-full max-w-md mx-auto bg-white shadow-sm pb-20 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-zinc-200 pb-safe">
        <div className="max-w-md mx-auto flex justify-around items-center h-16 px-2">
          <NavItem to="/today" icon={<Dumbbell />} label="Today" />
          <NavItem to="/gtg" icon={<Zap />} label="GTG" />
          <NavItem to="/program" icon={<ListTodo />} label="Program" />
          <NavItem to="/tools" icon={<Timer />} label="Tools" />
          <NavItem to="/progress" icon={<LineChart />} label="Log" />
          <NavItem to="/settings" icon={<Settings />} label="Settings" />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center justify-center w-14 h-full gap-1 transition-colors",
        isActive ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
      )}
    >
      <div className={cn("w-5 h-5", isActive && "stroke-[2.5px]")}>{icon}</div>
      <span className="text-[9px] font-medium">{label}</span>
    </Link>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/gtg" element={<GTGPage />} />
          <Route path="/program" element={<ProgramPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
