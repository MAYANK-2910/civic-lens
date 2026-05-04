import React, { useState } from 'react';
import { 
  signInAnonymously, GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword
} from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, HelpCircle, User, Lock, Mail, AlertCircle, Sparkles } from 'lucide-react';
import { auth } from '../lib/firebase';
import { cn } from '../lib/utils';

const spring = { type: 'spring' as const, stiffness: 350, damping: 28, mass: 0.8 };

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error('Email Auth Error:', err.code, err.message);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google Auth Error:', err.code, err.message);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please try again.');
      } else {
        setError(`Google Auth failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error('Anonymous Auth Error:', err.code, err.message);
      setError("Failed to start guest session. Ensure Anonymous auth is enabled.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center p-gutter relative overflow-hidden">
      {/* Ambient background glow */}
      <motion.div 
        className="absolute w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"
        animate={{ 
          x: [0, 50, -30, 0],
          y: [0, -40, 30, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={spring}
        className="w-full max-w-sm bg-surface-container rounded-2xl p-8 border border-outline-variant shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <motion.div 
          className="flex flex-col items-center mb-6 relative z-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
        >
          <motion.div 
            className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4"
            whileHover={{ scale: 1.1, rotate: -5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 12 }}
          >
            <ShieldCheck className="w-6 h-6 text-primary" />
          </motion.div>
          <h1 className="text-2xl font-bold text-on-surface">Civic Lens</h1>
          <p className="text-sm text-on-surface-variant text-center mt-1">
            Access the municipal portal
          </p>
        </motion.div>

        <motion.div 
          className="space-y-4 relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-black py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-100 shadow disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
            Continue with Google
          </motion.button>

          <div className="relative pt-4 pb-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-outline-variant/50"></span></div>
            <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-surface-container px-3 text-outline font-bold tracking-widest">or email</span></div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-outline">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full bg-surface-container-highest border border-outline-variant rounded-lg pl-9 pr-3 py-2 text-sm focus:border-primary transition-all duration-200 text-on-surface"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-outline">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-container-highest border border-outline-variant rounded-lg pl-9 pr-3 py-2 text-sm focus:border-primary transition-all duration-200 text-on-surface"
                />
              </div>
            </div>

            <motion.button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-semibold text-sm shadow hover:brightness-110 disabled:opacity-50 mt-2 btn-ripple"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={loading ? 'loading' : isSignUp ? 'signup' : 'signin'}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </form>

          <div className="text-center mt-2">
            <button 
              onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
              type="button"
              className="text-xs text-primary hover:underline transition-all duration-200"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>

          <div className="relative pt-4 pb-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-outline-variant/30"></span></div>
          </div>

          <motion.button 
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full bg-surface-container-highest text-on-surface-variant py-2.5 rounded-lg font-medium text-xs border border-outline-variant hover:border-outline hover:text-on-surface flex items-center justify-center gap-2 group disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <User className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity duration-200" />
            Continue as Guest
          </motion.button>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-start gap-2 relative z-10 overflow-hidden"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
              >
                <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
              </motion.div>
              <p className="text-xs text-error font-medium leading-tight">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 pt-6 border-t border-outline-variant/30 flex justify-between items-center text-[10px] text-on-surface-variant relative z-10">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3" />
            <span>Secure Access</span>
          </div>
          <button className="flex items-center gap-1 hover:text-on-surface transition-colors duration-200">
            <HelpCircle className="w-3 h-3" />
            <span>Support</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
