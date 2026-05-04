import React, { useState, useEffect } from 'react';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import { 
  GripVertical, CheckCircle2, Info, 
  BarChart3, Trophy, Timer, AlertCircle
} from 'lucide-react';
import { 
  collection, doc, setDoc, getDoc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useUser } from '../lib/UserContext';
import { OperationType } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { cn } from '../lib/utils';

interface PriorityItem {
  id: string;
  label: string;
  description: string;
  category: string;
}

export default function PriorityPoll() {
  const { user } = useUser();
  const [items, setItems] = useState<PriorityItem[]>([
    { id: '1', label: 'Public Transit Expansion', description: 'Increase bus routes and subway frequency.', category: 'Transport' },
    { id: '2', label: 'Affordable Housing', description: 'Subsidies and new residential zoning.', category: 'Community' },
    { id: '3', label: 'Green Energy Initiative', description: 'Transition municipal buildings to solar.', category: 'Environment' },
    { id: '4', label: 'Tech Education in Schools', description: 'Coding and AI literacy programs.', category: 'Education' },
    { id: '5', label: 'Urban Park Maintenance', description: 'Revitalize existing city park spaces.', category: 'Environment' },
    { id: '6', label: 'Police System Reform', description: 'Community-led safety programs.', category: 'Safety' },
  ]);

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const checkExistingPoll = async () => {
    if (!user) return;
    try {
      const pollRef = doc(db, 'polls/annual_2024/responses', user.uid);
      const pollDoc = await getDoc(pollRef);
      if (pollDoc.exists()) {
        setSubmitted(true);
      }
    } catch (e) {
      console.warn('Poll check failed', e);
    }
  };

  useEffect(() => {
    checkExistingPoll();
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const responseRef = doc(db, 'polls/annual_2024/responses', user.uid);
      await setDoc(responseRef, {
        ranking: items.map(item => item.id),
        submittedAt: serverTimestamp(),
        userId: user.uid
      });
      setSubmitted(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'polls/annual_2024/responses');
    } finally {
      setSubmitting(false);
    }
  };

  const communityRankings = [
    { label: 'Education Funding', percentage: 28, trend: 'up' },
    { label: 'Public Transit', percentage: 22, trend: 'down' },
    { label: 'Housing', percentage: 18, trend: 'up' },
    { label: 'Environment', percentage: 15, trend: 'stable' },
    { label: 'Safety', percentage: 10, trend: 'up' },
  ];

  if (submitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="h-full flex flex-col items-center justify-center p-12 text-center max-w-lg mx-auto"
      >
        <div className="h-24 w-24 bg-secondary/10 rounded-full flex items-center justify-center mb-8 relative">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="absolute inset-0 bg-secondary/20 rounded-full animate-ping"
          />
          <CheckCircle2 className="w-12 h-12 text-secondary relative z-10" />
        </div>
        <h2 className="text-4xl font-headline-lg mb-4">Priority Locked</h2>
        <p className="text-on-surface-variant mb-10 text-lg leading-relaxed">
          Your voice has been added to the collective data. These results will directly influence the next fiscal budget hearing.
        </p>
        <div className="p-6 bg-surface-container rounded-2xl border border-outline-variant/30 w-full mb-8">
          <p className="text-xs text-outline font-bold uppercase mb-4">Impact Estimate</p>
          <div className="flex justify-between items-center px-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">11.4k</p>
              <p className="text-[10px] text-outline">Respondents</p>
            </div>
            <div className="h-8 w-[1px] bg-outline-variant/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-secondary">Jun 12</p>
              <p className="text-[10px] text-outline">Review Date</p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setSubmitted(false)}
          className="text-primary hover:underline font-bold text-sm tracking-tight flex items-center gap-2"
        >
          Want to revise your priorities?
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-gutter">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="font-headline-xl text-on-surface">Annual Priority Poll</h1>
          <p className="text-on-surface-variant max-w-2xl">
            Rank your top preferences. Drag and drop to order the items from Most Important (Top) to Least Important (Bottom).
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm px-3 py-1.5 bg-tertiary/10 text-tertiary rounded-full border border-tertiary/20">
          <Timer className="w-4 h-4" />
          <span>Closes in 12 Days</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Reusable Voting List */}
        <div className="lg:col-span-7 bg-surface-container rounded-xl p-6 border border-outline-variant">
          <h2 className="text-xl font-headline-md mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-tertiary" />
            <span>Your Personal Ranking</span>
          </h2>

          <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-3">
            {items.map((item, i) => (
              <Reorder.Item 
                key={item.id} 
                value={item}
                className="bg-surface-container-high rounded-xl p-4 border border-outline-variant/30 hover:border-primary/50 cursor-grab active:cursor-grabbing transition-colors flex items-center gap-4 group"
              >
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-surface-variant text-on-surface-variant font-bold">
                  {i + 1}
                </div>
                <div className="flex-grow">
                  <h4 className="font-bold text-on-surface group-hover:text-primary transition-colors">{item.label}</h4>
                  <p className="text-sm text-on-surface-variant">{item.description}</p>
                </div>
                <GripVertical className="text-outline-variant group-hover:text-on-surface transition-colors" />
              </Reorder.Item>
            ))}
          </Reorder.Group>

          <div className="mt-8 pt-6 border-t border-outline-variant/30">
            <button 
              onClick={handleSubmit}
              disabled={submitting || !user}
              className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <CheckCircle2 className={cn("w-5 h-5", submitting && "animate-pulse")} />
              <span>{submitting ? 'Locking Choices...' : 'Lock My Choices'}</span>
            </button>
            <p className="text-xs text-center text-on-surface-variant mt-4 flex items-center justify-center gap-1">
              <Info className="w-3 h-3" />
              Ranking is anonymous but linked to your verified account.
            </p>
          </div>
        </div>

        {/* Global Stats Preview */}
        <div className="lg:col-span-5 space-y-gutter">
          <div className="bg-surface-container rounded-xl p-6 border border-outline-variant">
            <h2 className="text-xl font-headline-md mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-secondary" />
              <span>Community Average</span>
            </h2>
            <div className="space-y-6">
              {communityRankings.map((res, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface font-medium">{res.label}</span>
                    <span className="text-on-surface-variant">{res.percentage}% Support</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container-lowest rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-secondary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${res.percentage}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-xs text-on-surface-variant italic">
                * Based on 11.4k responses from verified residents. Trends updated every 6 hours.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
