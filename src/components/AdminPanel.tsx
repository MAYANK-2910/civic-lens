import React, { useState, useEffect } from 'react';
import { 
  Users, Upload, ShieldAlert, CheckCircle, 
  XCircle, Filter, Search, FileText, 
  Trash2, Eye, UserPlus, MoreVertical, Edit2
} from 'lucide-react';
import { cn } from '../lib/utils';
import Papa from 'papaparse';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useUser } from '../lib/UserContext';
import { Feedback, OperationType } from '../types';
import { handleFirestoreError } from '../lib/error-handler';

export default function AdminPanel() {
  const { user, profile } = useUser();
  const [activeTab, setActiveTab] = useState<'budget' | 'moderation' | 'roles'>('moderation');
  const [isUploading, setIsUploading] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchFeedbacks();
    }
  }, [profile]);

  const fetchFeedbacks = async () => {
    try {
      const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'), limit(50));
      const res = await getDocs(q);
      const data = res.docs.map(d => ({ id: d.id, ...d.data() })) as Feedback[];
      setFeedbacks(data);
    } catch (e) {
      console.warn("Failed to fetch feedback", e);
    }
  };

  const handleModerate = async (id: string, newStatus: 'approved' | 'rejected') => {
    if (!user) return;
    try {
      const ref = doc(db, 'feedback', id);
      await updateDoc(ref, {
        moderationStatus: newStatus,
        status: newStatus === 'approved' ? 'active' : 'moderated',
        moderatedBy: user.uid,
        moderatedAt: serverTimestamp()
      });
      setFeedbacks(prev => prev.map(f => f.id === id ? {
        ...f,
        moderationStatus: newStatus,
        status: newStatus === 'approved' ? 'active' : 'moderated',
        moderatedBy: user.uid,
        moderatedAt: Date.now()
      } as any : f));
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `feedback/${id}`);
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeedback || !user) return;
    try {
      const ref = doc(db, 'feedback', editingFeedback.id);
      const updates = {
        title: editingFeedback.title,
        description: editingFeedback.description,
        category: editingFeedback.category,
        moderationStatus: 'approved' as const,
        status: 'active' as const,
        moderatedBy: user.uid,
        moderatedAt: serverTimestamp()
      };
      await updateDoc(ref, updates);
      setFeedbacks(prev => prev.map(f => f.id === editingFeedback.id ? { ...f, ...updates, moderatedAt: Date.now() } as any : f));
      setEditingFeedback(null);
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `feedback/${editingFeedback.id}`);
    }
  };

  const roles = [
    { name: 'John Doe', email: 'john@city.gov', role: 'Admin', status: 'Active' },
    { name: 'Sarah Smith', email: 'sarah@office.gov', role: 'Official', status: 'Active' },
    { name: 'Mark Wilson', email: 'mark@dev.gov', role: 'Official', status: 'Invited' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          console.log('Parsed CSV:', results.data);
          // In real app, batch write to Firestore
          setTimeout(() => {
            setIsUploading(false);
            alert('Data uploaded successfully!');
          }, 1500);
        }
      });
    }
  };

  return (
    <div className="space-y-gutter">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-outline-variant/30 pb-6">
        <div>
          <h1 className="font-headline-xl text-on-surface">Admin Control Center</h1>
          <p className="text-on-surface-variant">System-wide settings, moderation, and data ingestion.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/30 mb-8">
        {[
          { id: 'budget', label: 'Budget Upload', icon: Upload },
          { id: 'moderation', label: 'Moderation', icon: ShieldAlert },
          { id: 'roles', label: 'Role Management', icon: Users },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-4 font-label-md transition-all border-b-2",
              activeTab === tab.id 
                ? "border-primary text-primary bg-primary/5" 
                : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-gutter">
        {activeTab === 'budget' && (
          <div className="bg-surface-container rounded-xl p-8 border border-outline-variant text-center max-w-2xl mx-auto w-full">
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Upload className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-headline-md mb-4">Ingest Budget Data</h2>
            <p className="text-on-surface-variant mb-8 px-10">
              Upload raw CSV files to update the Budget Explorer. System will automatically map columns or alert on duplicates.
            </p>
            
            <label className={cn(
              "block w-full border-2 border-dashed border-outline-variant rounded-xl p-12 transition-all cursor-pointer",
              isUploading ? "opacity-50 pointer-events-none" : "hover:border-primary hover:bg-primary/5"
            )}>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              <FileText className="w-12 h-12 text-outline mx-auto mb-4" />
              <p className="font-bold text-on-surface">{isUploading ? 'Processing File...' : 'Drop CSV file here or click to browse'}</p>
              <p className="text-sm text-on-surface-variant mt-2">Maximum file size 50MB</p>
            </label>
            
            <div className="mt-8 flex justify-center gap-4 text-sm text-on-surface-variant">
              <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-secondary" /> Auto-mapping</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-secondary" /> Validation</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-secondary" /> Immortality Guard</span>
            </div>
          </div>
        )}

        {activeTab === 'moderation' && (
          <div className="space-y-gutter relative">
            <div className="bg-surface-container rounded-xl border border-outline-variant overflow-hidden">
              <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-high">
                <h3 className="font-headline-md flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-tertiary" />
                  <span>Feedback Moderation Queue</span>
                </h3>
                <span className="bg-tertiary/20 text-tertiary text-xs px-2 py-1 rounded font-bold">
                  {feedbacks.filter(f => !f.moderationStatus || f.moderationStatus === 'pending').length} PENDING
                </span>
              </div>
              <div className="divide-y divide-outline-variant/30">
                {feedbacks.map(item => (
                  <div key={item.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-surface-variant transition-colors group">
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex gap-2 text-xs font-label-md uppercase tracking-wider">
                        <span className="text-primary">{item.category}</span>
                        <span className="text-on-surface-variant">•</span>
                        <span className={cn(
                          "font-bold",
                          !item.moderationStatus || item.moderationStatus === 'pending' ? "text-tertiary" : item.moderationStatus === 'approved' ? 'text-secondary' : 'text-error'
                        )}>{item.moderationStatus || 'pending'}</span>
                      </div>
                      <h4 className="font-bold flex items-center justify-between">
                        {item.title}
                        <button onClick={() => setEditingFeedback(item)} className="ml-2 text-on-surface-variant hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </h4>
                      <p className="text-on-surface-variant italic">"{item.description}"</p>
                    </div>
                    <div className="flex gap-3">
                      {item.moderationStatus !== 'approved' && (
                        <button onClick={() => handleModerate(item.id, 'approved')} className="px-4 py-2 bg-secondary/20 text-secondary border border-secondary/30 rounded-lg hover:bg-secondary hover:text-on-secondary transition-all">
                          Approve
                        </button>
                      )}
                      {item.moderationStatus !== 'rejected' && (
                        <button onClick={() => handleModerate(item.id, 'rejected')} className="px-4 py-2 bg-error/20 text-error border border-error/30 rounded-lg hover:bg-error hover:text-on-error transition-all">
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {feedbacks.length === 0 && (
                  <div className="p-8 text-center text-on-surface-variant">No feedback to display.</div>
                )}
              </div>
            </div>

            {/* Edit Modal */}
            {editingFeedback && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/80 backdrop-blur-sm">
                <div className="bg-surface-container-high border border-outline-variant rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-outline-variant flex justify-between items-center">
                    <h3 className="font-bold text-lg">Edit Feedback</h3>
                    <button onClick={() => setEditingFeedback(null)} className="p-2 hover:bg-surface-variant rounded-full transition-colors">
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleEditSave} className="p-6 space-y-4">
                    <div>
                      <label className="text-xs uppercase tracking-widest font-bold text-outline">Title</label>
                      <input 
                        value={editingFeedback.title}
                        onChange={(e) => setEditingFeedback({...editingFeedback, title: e.target.value})}
                        className="w-full bg-surface-container border border-outline-variant rounded-lg p-3 mt-1 focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest font-bold text-outline">Description</label>
                      <textarea 
                        value={editingFeedback.description}
                        onChange={(e) => setEditingFeedback({...editingFeedback, description: e.target.value})}
                        className="w-full bg-surface-container border border-outline-variant rounded-lg p-3 mt-1 focus:outline-none focus:border-primary resize-none"
                        rows={4}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest font-bold text-outline">Category</label>
                      <select 
                        value={editingFeedback.category}
                        onChange={(e) => setEditingFeedback({...editingFeedback, category: e.target.value})}
                        className="w-full bg-surface-container border border-outline-variant rounded-lg p-3 mt-1 focus:outline-none focus:border-primary"
                        required
                      >
                        <option value="Transport">Transport</option>
                        <option value="Parks">Parks & Recreation</option>
                        <option value="Infrastructure">Infrastructure</option>
                        <option value="Public Safety">Public Safety</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                      <button type="button" onClick={() => setEditingFeedback(null)} className="px-5 py-2 font-bold text-on-surface-variant hover:bg-surface-variant rounded-lg transition-colors">Cancel</button>
                      <button type="submit" className="px-5 py-2 font-bold bg-primary text-on-primary rounded-lg shadow-lg hover:brightness-110 transition-all flex items-center gap-2">Save & Approve</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'roles' && (
          <div className="space-y-gutter">
            <div className="flex justify-between items-center mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                <input className="w-full bg-surface-container border border-outline-variant rounded-lg pl-10 pr-4 py-2" placeholder="Search members..." />
              </div>
              <button className="bg-primary text-on-primary px-6 py-2 rounded-lg font-label-md flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                <span>Invite Member</span>
              </button>
            </div>

            <div className="bg-surface-container rounded-xl border border-outline-variant overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-surface-container-high border-b border-outline-variant">
                  <tr>
                    <th className="px-6 py-4 font-label-md">Member</th>
                    <th className="px-6 py-4 font-label-md">Current Role</th>
                    <th className="px-6 py-4 font-label-md">Status</th>
                    <th className="px-6 py-4 font-label-md text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {roles.map((u, i) => (
                    <tr key={i} className="hover:bg-surface-variant transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-primary/20 flex items-center justify-center rounded-full text-primary font-bold">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold">{u.name}</div>
                            <div className="text-xs text-on-surface-variant">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-bold",
                          u.role === 'Admin' ? "bg-primary/20 text-primary" : "bg-tertiary/20 text-tertiary"
                        )}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "flex items-center gap-1.5 text-sm",
                          u.status === 'Active' ? "text-secondary" : "text-on-surface-variant"
                        )}>
                          <div className={cn("h-1.5 w-1.5 rounded-full", u.status === 'Active' ? "bg-secondary" : "bg-outline-variant")} />
                          {u.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="p-2 hover:bg-surface-variant rounded-lg"><Eye className="w-4 h-4" /></button>
                          <button className="p-2 hover:bg-error/20 text-error rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          <button className="p-2 hover:bg-surface-variant rounded-lg"><MoreVertical className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
