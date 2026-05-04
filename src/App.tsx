/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { motion } from 'motion/react';
import { auth } from './lib/firebase';

// Components
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import BudgetExplorer from './components/BudgetExplorer';
import Feedback from './components/Feedback';
import PriorityPoll from './components/PriorityPoll';
import AdminPanel from './components/AdminPanel';

import Profile from './components/Profile';

import { UserProvider, useUser } from './lib/UserContext';

function AppContent() {
  const { user: currentUser, profile, loading } = useUser();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-lowest">
        <motion.div 
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <motion.div 
            className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent shadow-sm"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
          />
          <motion.p 
            className="text-sm font-medium text-outline tracking-wide"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          >
            Syncing Portal...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/auth" 
        element={currentUser ? <Navigate to="/" /> : <Auth />} 
      />
      
      <Route 
        path="/*" 
        element={
          currentUser ? (
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/budget" element={<BudgetExplorer />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/poll" element={<PriorityPoll />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin" element={profile?.role === 'admin' ? <AdminPanel /> : <Navigate to="/" />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/auth" />
          )
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;
