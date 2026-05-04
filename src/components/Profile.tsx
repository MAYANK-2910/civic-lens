import React, { useState } from 'react';
import { useUser } from '../lib/UserContext';
import { ShieldCheck, User as UserIcon, LogOut, CheckCircle, Smartphone, Mail, MapPin } from 'lucide-react';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, profile } = useUser();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="relative bg-surface-container rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden">
        <div className="h-32 bg-[url('https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&q=80')] bg-cover bg-center">
          <div className="absolute inset-0 bg-primary/40 mix-blend-multiply" />
        </div>
        <div className="px-6 md:px-10 pb-8 pt-0 relative">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-12">
            <div className="h-28 w-28 rounded-full border-4 border-surface-lowest bg-surface-container-high flex items-center justify-center overflow-hidden shadow-lg relative z-10 shrink-0">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-12 h-12 text-outline" />
              )}
            </div>
            <div className="flex-grow pb-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-on-surface">
                  {profile?.displayName || (user?.isAnonymous ? 'Guest Citizen' : (user?.email || 'Citizen Profile'))}
                </h1>
                <span className="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border border-primary/20 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  VERIFIED Identity
                </span>
              </div>
              <p className="text-sm text-on-surface-variant font-medium mt-1">
                Unified Portal Access ID: {user?.uid.substring(0, 12).toUpperCase() || 'UNREGISTERED'}
              </p>
            </div>
            <div className="pb-2">
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-error bg-error/10 border border-error/20 rounded-lg hover:bg-error/20 transition-colors active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                Sign Out / Terminate Session
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="flex bg-surface-container-lowest p-1 rounded-xl border border-outline-variant/50 w-full md:w-auto overflow-x-auto shadow-inner">
            <button 
              onClick={() => setActiveTab('details')}
              className={`flex-1 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${activeTab === 'details' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
            >
              Identity Details
            </button>
            <button 
              onClick={() => setActiveTab('activity')}
              className={`flex-1 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${activeTab === 'activity' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
            >
              Civic Engagements
            </button>
          </div>

          {activeTab === 'details' ? (
            <div className="bg-surface-container rounded-2xl p-6 md:p-8 border border-outline-variant/60 shadow-sm">
              <h3 className="text-lg font-bold tracking-tight text-on-surface mb-6 border-b border-outline-variant/50 pb-4">Demographic Record</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-outline">Registered Email</label>
                  <p className="mt-1 flex items-center gap-2 text-sm font-medium text-on-surface">
                    <Mail className="w-4 h-4 text-primary" />
                    {user?.email || 'Not Provided'}
                    {user?.emailVerified && <CheckCircle className="w-3.5 h-3.5 text-secondary" />}
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-outline">Mobile Number</label>
                  <p className="mt-1 flex items-center gap-2 text-sm font-medium text-on-surface">
                    <Smartphone className="w-4 h-4 text-primary" />
                    {user?.phoneNumber || '+91 - Not Linked'}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-outline">Registered Address Unit</label>
                  <p className="mt-1 flex items-start gap-2 text-sm font-medium text-on-surface">
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    Pending e-KYC Verification (Upload Aadhaar / Voter ID via the Document Center to populate your permanent municipal record).
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-outline-variant/50">
                <button className="text-sm font-medium text-primary hover:underline hover:text-primary-container transition-colors">
                  Update KYC Documents →
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container rounded-2xl p-6 md:p-8 border border-outline-variant/60 shadow-sm">
              <h3 className="text-lg font-bold tracking-tight text-on-surface mb-6 border-b border-outline-variant/50 pb-4">Recent Feedback & Reports</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl border border-outline-variant/40 bg-surface-container-low">
                  <div className="w-2 h-2 rounded-full bg-secondary shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-on-surface">Pothole reported on Sector 4 road</h4>
                    <p className="text-xs text-on-surface-variant">Ticket ID: #NDMC-2023-8842</p>
                  </div>
                  <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2.5 py-1 rounded-md border border-secondary/20">RESOLVED</span>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl border border-outline-variant/40 bg-surface-container-low">
                  <div className="w-2 h-2 rounded-full bg-tertiary shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-on-surface">Voted on Smart City Master Plan 2025</h4>
                    <p className="text-xs text-on-surface-variant">Poll Participation</p>
                  </div>
                  <span className="text-[10px] font-bold text-tertiary bg-tertiary/10 px-2.5 py-1 rounded-md border border-tertiary/20">RECORDED</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status Column */}
        <div className="space-y-6">
          <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/60 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-[40px] pointer-events-none" />
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-outline mb-4 relative z-10">Citizen Rating</h3>
            <div className="flex items-end gap-2 relative z-10">
              <span className="text-4xl font-bold text-on-surface tracking-tight">Level 4</span>
              <span className="text-sm font-semibold text-secondary pb-1 block">Active</span>
            </div>
            <div className="w-full bg-surface-variant h-2 rounded-full mt-4 relative z-10 overflow-hidden">
              <div className="bg-secondary h-full rounded-full w-[70%]" />
            </div>
            <p className="mt-3 text-xs font-medium text-on-surface-variant relative z-10">
              Your consistent civic participation builds trust. Keep up the good work.
            </p>
          </div>

          <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/60 shadow-sm">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-outline mb-4">Official Links</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="flex items-center text-sm font-medium text-primary hover:underline hover:text-primary-container transition-colors">
                  Pay Property Tax
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center text-sm font-medium text-primary hover:underline hover:text-primary-container transition-colors">
                  Water Bill Portal
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center text-sm font-medium text-primary hover:underline hover:text-primary-container transition-colors">
                  Request Birth/Death Certificate
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
