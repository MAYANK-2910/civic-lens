import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, ThumbsUp, ThumbsDown, MessageSquare, 
  Flag, Shield, Send, Image as ImageIcon,
  X, Filter, Search, CheckCircle2, AlertTriangle, BarChart2
} from 'lucide-react';
import { 
  collection, query, getDocs, addDoc, updateDoc, 
  doc, orderBy, limit, increment, where, serverTimestamp,
  setDoc, getDoc, runTransaction, onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useUser } from '../lib/UserContext';
import { Feedback as FeedbackType, OperationType } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { cn } from '../lib/utils';

const GENERIC_POLLS = [
  { 
    id: 'p1', 
    question: "Should we allocate more budget to the proposed North-South Metro line extension?", 
    options: [{ label: "Yes, public transit is priority", percentage: 62 }, { label: "No, focus on existing roads", percentage: 38 }],
    totalVotes: 1245
  },
  { 
    id: 'p2', 
    question: "What is your primary concern regarding the new solid waste management proposal?", 
    options: [{ label: "User fees", percentage: 45 }, { label: "Collection frequency", percentage: 35 }, { label: "Segregation rules", percentage: 20 }],
    totalVotes: 890
  }
];

export default function Feedback() {
  const { user, profile } = useUser();
  const [feedbacks, setFeedbacks] = useState<FeedbackType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filter, setFilter] = useState('All');
  const [submitting, setSubmitting] = useState(false);
  
  // Comments state
  const [activeFeedback, setActiveFeedback] = useState<FeedbackType | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Poll state
  const [activePoll, setActivePoll] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Transport' as any,
  });

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'), limit(50));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FeedbackType[];
      const visibleData = data.filter(f => 
        f.status === 'active' || 
        f.moderationStatus === 'approved' || 
        (!f.moderationStatus && !f.status) ||
        (user && f.authorId === user.uid)
      );
      setFeedbacks(visibleData);
    } catch (error) {
      console.warn('Using demo data due to fetch error:', error);
      setFeedbacks([
        { 
          id: '1', title: 'Improve Bus Frequency', authorId: 'system',
          description: 'The morning commute is incredibly crowded. Adding just two more buses between 7 AM and 8 AM would significantly reduce wait times.',
          category: 'Transport', upvotes: 245, downvotes: 12, status: 'active', createdAt: Date.now() 
        },
        { 
          id: '2', title: 'Dog Park Lighting', authorId: 'system',
          description: 'During winter months, the dog park is completely dark by 5 PM. Installing solar-powered floodlights would make it safer.',
          category: 'Parks', upvotes: 189, downvotes: 4, status: 'active', createdAt: Date.now() - 86400000 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [user]);

  // Load comments for active feedback
  useEffect(() => {
    if (!activeFeedback) return;
    
    // Check if real data
    if (activeFeedback.authorId === 'system') {
      setComments([
        { id: 'c1', text: 'I completely agree, the wait times are ridiculous.', authorId: 'user1', createdAt: Date.now() - 1000000 }
      ]);
      return;
    }

    const q = query(
      collection(db, `feedback/${activeFeedback.id}/comments`),
      orderBy('createdAt', 'asc')
    );
    
    // We try to catch error if rules prevent subcollection reading, fallback to empty
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setComments(data);
    }, (error) => {
      console.warn('Failed to load comments:', error);
      setComments([]);
    });

    return () => unsubscribe();
  }, [activeFeedback]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const newFeedback = {
        ...formData,
        authorId: user.uid,
        upvotes: 0,
        downvotes: 0,
        status: 'active',
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'feedback'), newFeedback);
      
      setFeedbacks(prev => [{ id: docRef.id, ...newFeedback, createdAt: Date.now() } as any, ...prev]);
      setIsFormOpen(false);
      setFormData({ title: '', description: '', category: 'Transport' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeFeedback || !newComment.trim()) return;
    
    setSubmittingComment(true);
    try {
      if (activeFeedback.authorId === 'system') {
        const commentData = { id: Date.now().toString(), text: newComment, authorId: user.uid, createdAt: Date.now() };
        setComments(prev => [...prev, commentData]);
        setNewComment('');
        return;
      }

      await addDoc(collection(db, `feedback/${activeFeedback.id}/comments`), {
        text: newComment,
        authorId: user.uid,
        feedbackId: activeFeedback.id,
        createdAt: serverTimestamp()
      });
      setNewComment('');
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, `feedback/${activeFeedback.id}/comments`);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleVote = async (id: string, type: 'up' | 'down') => {
    if (!user) {
      alert("Please sign in to vote.");
      return;
    }
    
    const feedback = feedbacks.find(f => f.id === id);
    if (!feedback) return;

    if (feedback.authorId === 'system') {
       // Demo data fallback
       setFeedbacks(prev => prev.map(f => {
        if (f.id === id) {
          return { ...f, [type === 'up' ? 'upvotes' : 'downvotes']: (f[type === 'up' ? 'upvotes' : 'downvotes'] || 0) + 1 };
        }
        return f;
       }));
       return;
    }

    try {
      const feedbackRef = doc(db, 'feedback', id);
      const voteRef = doc(db, `feedback/${id}/votes`, user.uid);
      
      let upvoteDelta = 0;
      let downvoteDelta = 0;

      await runTransaction(db, async (transaction) => {
        const voteDoc = await transaction.get(voteRef);
        const existingVoteType = voteDoc.exists() ? voteDoc.data().type : null;
        const targetType = type === 'up' ? 'upvote' : 'downvote';

        if (existingVoteType === targetType) {
          // Taking vote back
          transaction.delete(voteRef);
          if (targetType === 'upvote') upvoteDelta -= 1;
          else downvoteDelta -= 1;
        } else if (existingVoteType) {
          // Changing vote
          transaction.update(voteRef, { type: targetType, updatedAt: serverTimestamp() });
          if (targetType === 'upvote') {
            upvoteDelta += 1;
            downvoteDelta -= 1;
          } else {
            downvoteDelta += 1;
            upvoteDelta -= 1;
          }
        } else {
          // New vote
          transaction.set(voteRef, {
            userId: user.uid,
            feedbackId: id,
            type: targetType,
            createdAt: serverTimestamp()
          });
          if (targetType === 'upvote') upvoteDelta += 1;
          else downvoteDelta += 1;
        }
        
        const updateObj: any = {};
        if (upvoteDelta !== 0) updateObj.upvotes = increment(upvoteDelta);
        if (downvoteDelta !== 0) updateObj.downvotes = increment(downvoteDelta);

        if (Object.keys(updateObj).length > 0) {
          transaction.update(feedbackRef, updateObj);
        }
      });

      // Optimistic update
      setFeedbacks(prev => prev.map(f => {
        if (f.id === id) {
          return { 
            ...f, 
            upvotes: Math.max(0, (f.upvotes || 0) + upvoteDelta),
            downvotes: Math.max(0, (f.downvotes || 0) + downvoteDelta) 
          };
        }
        return f;
      }));
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `feedback/${id}/votes`);
    }
  };

  const filtered = filter === 'All' ? feedbacks : feedbacks.filter(f => f.category === filter);

  return (
    <div className="space-y-gutter">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="font-headline-xl text-on-surface">Feedback Wall</h1>
          <p className="text-on-surface-variant max-w-2xl">
            Citizen voices shaping civic priorities. Explore current issues, vote on priorities, or share your own observations.
          </p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-primary text-on-primary px-6 py-3 rounded-xl font-label-md flex items-center gap-2 hover:brightness-110 shadow-lg shadow-primary/20 transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>Submit Feedback</span>
        </button>
      </div>

      {/* Community Polls Section */}
      <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-6">
        <h2 className="text-lg font-headline-md mb-4 flex items-center gap-2"><BarChart2 className="w-5 h-5 text-tertiary" /> Active Community Polls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {GENERIC_POLLS.map(poll => (
            <div key={poll.id} className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm">
               <h3 className="font-bold text-on-surface text-sm mb-4 leading-relaxed">{poll.question}</h3>
               <div className="space-y-3">
                 {poll.options.map((opt, i) => {
                   const isVoted = activePoll === `${poll.id}-${i}`;
                   return (
                     <button 
                       key={i}
                       onClick={() => setActivePoll(`${poll.id}-${i}`)}
                       disabled={activePoll !== null && !isVoted}
                       className={cn(
                         "w-full relative overflow-hidden rounded-lg border text-left p-3 transition-colors",
                         isVoted ? "border-primary bg-primary/5" : "border-outline-variant hover:border-primary/50",
                         activePoll !== null && !isVoted && "opacity-50 cursor-not-allowed"
                       )}
                     >
                       {/* Background Bar */}
                       {activePoll !== null && (
                         <div 
                           className="absolute left-0 top-0 bottom-0 bg-primary/10 transition-all duration-1000" 
                           style={{ width: `${opt.percentage}%` }}
                         />
                       )}
                       <div className="relative z-10 flex justify-between items-center text-sm font-medium text-on-surface">
                         <span>{opt.label}</span>
                         {activePoll !== null && <span className="font-bold text-primary">{opt.percentage}%</span>}
                       </div>
                     </button>
                   );
                 })}
               </div>
               <div className="mt-4 text-xs font-medium text-on-surface-variant flex justify-between">
                 <span>{poll.totalVotes} responses</span>
                 <span>Closes in 3 days</span>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {['All', 'Transport', 'Parks', 'Infrastructure', 'Safety'].map(cat => (
            <button
               key={cat}
               onClick={() => setFilter(cat)}
               className={cn(
                 "px-4 py-1.5 rounded-full text-sm font-label-md transition-all border",
                 filter === cat 
                   ? "bg-primary/20 text-primary border-primary/50" 
                   : "bg-surface-container-low text-on-surface-variant border-outline-variant hover:border-outline"
               )}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
          <input 
            type="text" 
            placeholder="Search feedback..." 
            className="w-full pl-10 pr-4 py-2 bg-surface-container border border-outline-variant rounded-lg focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
        <AnimatePresence mode="popLayout">
          {filtered.map((f, i) => (
            <motion.div
              layout
              key={f.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.05 }}
              className="bg-surface-container rounded-xl p-6 border border-outline-variant hover:border-primary/50 transition-all flex flex-col group"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-label-sm uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded">
                  {f.category}
                </span>
                <div className="flex items-center gap-1 text-secondary text-xs">
                  <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(78,222,163,0.8)]" />
                  <span>Active</span>
                </div>
              </div>

              <h3 className="text-xl font-headline-md text-on-surface mb-3 line-clamp-2">{f.title}</h3>
              <p className="text-on-surface-variant text-sm flex-grow mb-6 line-clamp-3">
                {f.description}
              </p>

              <div className="pt-4 border-t border-outline-variant/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleVote(f.id, 'up')}
                    className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary active:scale-95 transition-all bg-surface-container-high px-2 py-1 rounded"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-sm font-label-md">{f.upvotes}</span>
                  </button>
                  <button 
                    onClick={() => handleVote(f.id, 'down')}
                    className="flex items-center gap-1.5 text-on-surface-variant hover:text-error active:scale-95 transition-all bg-surface-container-high px-2 py-1 rounded"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span className="text-sm font-label-md">{f.downvotes}</span>
                  </button>
                </div>
                <button 
                  onClick={() => setActiveFeedback(f)}
                  className="text-on-surface-variant hover:text-on-surface transition-colors p-1.5 rounded-lg hover:bg-surface-variant active:scale-95"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Slide-over Form */}
      <AnimatePresence>
        {isFormOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-surface border-l border-outline-variant z-[101] p-8 shadow-2xl flex flex-col"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-headline-md">Submit Feedback</h2>
                <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-surface-variant rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form className="space-y-6 flex-grow" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-label-sm uppercase tracking-widest text-outline">Title</label>
                  <input 
                    required 
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Brief summary of your feedback" 
                    className="w-full bg-surface-container border border-outline-variant rounded-lg p-3 focus:outline-none focus:border-primary" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-label-sm uppercase tracking-widest text-outline">Category</label>
                  <select 
                    required 
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-surface-container border border-outline-variant rounded-lg p-3 focus:outline-none focus:border-primary appearance-none"
                  >
                    <option value="Transport">Transport</option>
                    <option value="Parks">Parks & Recreation</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Safety">Public Safety</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-label-sm uppercase tracking-widest text-outline">Description</label>
                  <textarea 
                    required 
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={5} 
                    placeholder="Provide detailed information or context..." 
                    className="w-full bg-surface-container border border-outline-variant rounded-lg p-3 focus:outline-none focus:border-primary resize-none" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-label-sm uppercase tracking-widest text-outline">Optional Image</label>
                  <div className="border-2 border-dashed border-outline-variant rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary transition-colors bg-surface-container/50">
                    <ImageIcon className="w-10 h-10 text-outline" />
                    <p className="text-sm text-on-surface-variant"><span className="text-primary font-bold">Upload</span> or drag & drop</p>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 shadow-lg shadow-primary/20 mt-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{submitting ? 'Sending...' : 'Send Feedback'}</span>
                  <Send className={cn("w-5 h-5", submitting && "animate-pulse")} />
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Comments Modal */}
      <AnimatePresence>
         {activeFeedback && (
           <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveFeedback(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:max-w-2xl w-full bg-surface border border-outline-variant z-[101] md:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
               <div className="p-6 border-b border-outline-variant/50 flex justify-between items-start bg-surface-container-lowest">
                 <div className="pr-8">
                   <h2 className="text-xl font-headline-md text-on-surface mb-2">{activeFeedback.title}</h2>
                   <p className="text-sm text-on-surface-variant font-medium leading-relaxed">{activeFeedback.description}</p>
                 </div>
                 <button onClick={() => setActiveFeedback(null)} className="p-2 hover:bg-surface-variant rounded-full transition-colors absolute right-4 top-4">
                   <X className="w-5 h-5 text-on-surface-variant" />
                 </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 bg-surface-container-lowest space-y-4">
                 {comments.length === 0 ? (
                   <div className="text-center py-8 text-on-surface-variant">
                     <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-20" />
                     <p className="text-sm font-medium">No comments yet. Be the first to share your thoughts!</p>
                   </div>
                 ) : (
                   comments.map(c => (
                     <div key={c.id} className="bg-surface-container rounded-2xl p-4 border border-outline-variant/30">
                       <div className="flex items-center gap-2 mb-2">
                         <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex justify-center items-center text-xs font-bold uppercase">
                           {c.authorId ? c.authorId.charAt(0) : 'U'}
                         </div>
                         <span className="text-xs font-bold text-on-surface-variant">
                           {c.authorId === user?.uid ? 'You' : 'Citizen'}
                         </span>
                       </div>
                       <p className="text-sm text-on-surface leading-relaxed pl-8">{c.text}</p>
                     </div>
                   ))
                 )}
               </div>

               <div className="p-5 border-t border-outline-variant/50 bg-surface">
                  <form onSubmit={handleCommentSubmit} className="flex gap-3">
                    <input 
                      type="text" 
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder={user ? "Write a comment..." : "Sign in to comment..."}
                      disabled={!user || submittingComment}
                      className="flex-1 bg-surface-container border border-outline-variant rounded-full px-5 py-3 text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                    />
                    <button 
                      type="submit"
                      disabled={!user || submittingComment || !newComment.trim()}
                      className="bg-primary text-on-primary w-12 h-12 rounded-full flex items-center justify-center hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 shadow-lg shadow-primary/20"
                    >
                      <Send className="w-5 h-5 -ml-0.5" />
                    </button>
                  </form>
               </div>
            </motion.div>
           </>
         )}
      </AnimatePresence>
    </div>
  );
}
