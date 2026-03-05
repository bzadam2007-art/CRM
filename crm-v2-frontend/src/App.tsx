import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ProspectTable from './components/ProspectTable';
import ProspectDetail from './components/ProspectDetail';
import ProspectForm from './components/ProspectForm';
import CSVImport from './components/CSVImport';
import EmailSettings from './components/EmailSettings';
import AdminRoute from './components/AdminRoute';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import SystemSettings from './pages/admin/SystemSettings';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();


  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden font-sans transition-colors duration-200 relative selection:bg-purple-500/30">

      {/* Animated Mesh Background (Global) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 mesh-bg">
        <div className="mesh-blob mesh-blob-1 rounded-full bg-purple-600/30 mix-blend-screen animate-float" style={{ animationDuration: '15s' }} />
        <div className="mesh-blob mesh-blob-2 rounded-full bg-blue-600/30 mix-blend-screen animate-float" style={{ animationDuration: '20s', animationDelay: '2s' }} />
        <div className="mesh-blob mesh-blob-3 rounded-full bg-indigo-600/30 mix-blend-screen animate-float" style={{ animationDuration: '18s', animationDelay: '5s' }} />
      </div>

      {/* Ambient Background - Subtle Version */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[100px]" />
        <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] rounded-full bg-blue-500/5 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[30%] h-[30%] rounded-full bg-indigo-500/5 blur-[100px]" />
      </div>

      {/* Modal Overlay for All Screens */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container - Always Modal */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.div
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed left-0 top-0 h-screen w-64 z-50 shadow-2xl`}
          >
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Global Header with Glass Effect */}
        <header className="h-20 bg-slate-900/50 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 shrink-0 sticky top-0 z-30 transition-all duration-300">

          <div className="flex items-center gap-4 relative z-20">
            {/* Menu Button */}
            <motion.button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <Menu size={24} className="text-white" />
            </motion.button>
          </div>

          {/* Logo and Name - Centered Absolute */}
          <motion.button
            onClick={() => navigate('/dashboard')}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 group"
            whileHover={{ scale: 1.01 }}
          >
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img
                src="/logo.png"
                alt="EXPANZIA"
                className="w-10 h-10 object-contain relative z-10 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col text-left">
              <h1 className="text-xl font-black tracking-tight text-white group-hover:text-purple-400 transition-colors">
                EXPANZIA
              </h1>
            </div>
          </motion.button>


        </header>

        <div className="flex-1 overflow-y-auto w-full p-4 md:p-6 scroll-smooth">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/prospects" element={<ProspectTable />} />
            <Route path="/prospects/new" element={<ProspectForm />} />
            <Route path="/prospects/:id" element={<ProspectDetail />} />
            <Route path="/prospects/:id/edit" element={<ProspectForm />} />
            <Route path="/import" element={<CSVImport />} />
            <Route path="/email-settings" element={<EmailSettings />} />
            <Route path="/settings" element={<SystemSettings />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="settings" element={<SystemSettings />} />
            </Route>

            {/* Redirects/Placeholders */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
