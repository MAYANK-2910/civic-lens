import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, Users, MessageSquare, AlertCircle, 
  ArrowRight, Download, Filter, Search,
  Calendar, MapPin, Star
} from 'lucide-react';
import { collection, query, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useUser } from '../lib/UserContext';
import { BudgetItem, Feedback } from '../types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const spring = { type: 'spring' as const, stiffness: 300, damping: 25, mass: 0.8 };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 18, filter: 'blur(4px)' },
  visible: { 
    opacity: 1, 
    y: 0, 
    filter: 'blur(0px)',
    transition: spring
  }
};

export default function Dashboard() {
  const { profile } = useUser();
  const [loading, setLoading] = useState(true);
  const [stats] = useState({
    totalBudget: 12000000000, // 1200 Cr
    feedbackCount: 1420,
    activePolls: 5,
    budgetUtilization: 72
  });

  const formatShortCurrency = (val: number) => {
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(1)} Cr`;
    } else if (val >= 100000) {
      return `₹${(val / 100000).toFixed(1)} L`;
    } else {
      return `₹${val}`;
    }
  };

  const budgetData = [
    { name: 'Municipal Schools', value: 4500000000 },
    { name: 'Public Safety', value: 3000000000 },
    { name: 'Roads & Bridges', value: 2500000000 },
    { name: 'Health Centers', value: 1500000000 },
    { name: 'Solid Waste', value: 500000000 },
  ];

  const feedbackTrends = [
    { month: 'Jan', count: 120 },
    { month: 'Feb', count: 210 },
    { month: 'Mar', count: 450 },
    { month: 'Apr', count: 320 },
    { month: 'May', count: 540 },
  ];

  const handleExportView = () => {
    // Generate CSV representing dashboard overview
    const lines = [
      'CIVIC LENS - DASHBOARD REPORT',
      `Generated on: ${new Date().toLocaleDateString()}`,
      `Generated for: ${profile?.displayName || 'Guest User'}`,
      '',
      '--- OVERVIEW STATS ---',
      `Total Budget (Approved): ${formatShortCurrency(stats.totalBudget)}`,
      `Citizen Feedbacks: ${stats.feedbackCount}`,
      `Active Polls: ${stats.activePolls}`,
      `Budget Utilization: ${stats.budgetUtilization}%`,
      '',
      '--- DEPARTMENTAL ALLOCATION ---',
      'Department,Allocated Amount (INR)',
      ...budgetData.map(b => `"${b.name}",${b.value}`),
      '',
      '--- FEEDBACK TRENDS ---',
      'Month,Count',
      ...feedbackTrends.map(t => `${t.month},${t.count}`),
    ];
    
    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `dashboard_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    // Simulate loading for smoother entrance
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-12 gap-4">
        <motion.div 
          className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
        />
        <motion.p 
          className="text-sm font-medium text-outline"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          Loading Dashboard...
        </motion.p>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-12"
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-surface-container/50 p-6 sm:p-8 rounded-2xl border border-outline-variant/50 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest mb-2">
            <Star className="w-3 h-3 fill-current" />
            Citizen Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface leading-tight tracking-tight">
            Welcome back, <span className="text-primary">{profile?.displayName?.split(' ')[0] || 'Friend'}</span>
          </h1>
          <p className="text-on-surface-variant max-w-xl mt-1.5 text-sm sm:text-base leading-relaxed">
            Stay informed on your city's progress with real-time budget insights and governance updates.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <motion.div 
              className="flex items-center gap-1.5 text-[11px] font-semibold text-outline bg-surface-container-high px-2.5 py-1 rounded-md border border-outline-variant/30"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <MapPin className="w-3 h-3" />
              NDMC
            </motion.div>
            <motion.div 
              className="flex items-center gap-1.5 text-[11px] font-semibold text-outline bg-surface-container-high px-2.5 py-1 rounded-md border border-outline-variant/30"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <Calendar className="w-3 h-3" />
              FY 2023-24
            </motion.div>
          </div>
        </div>
        <div className="flex gap-3 relative z-10 shrink-0">
          <motion.button 
            onClick={handleExportView}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-lg hover:brightness-110 shadow-md font-semibold text-sm btn-ripple"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Download className="w-4 h-4" />
            <span>Export View</span>
          </motion.button>
        </div>
      </motion.div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Total Budget (Approved)', value: formatShortCurrency(stats.totalBudget), icon: TrendingUp, trend: '+4.2%', color: 'text-primary', sub: 'Projected Growth' },
          { label: 'Citizen Feedbacks', value: '1,420', icon: MessageSquare, trend: '+12%', color: 'text-secondary', sub: 'Engagement Up' },
          { label: 'Active Polls', value: '5', icon: Filter, trend: 'Ongoing', color: 'text-tertiary', sub: 'Strategy Shift' },
          { label: 'Spend Utilization', value: '72%', icon: Users, trend: 'Q3 Target', color: 'text-primary', sub: 'Within Margin' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            variants={itemVariants}
            className="bg-surface-container rounded-2xl p-6 border border-outline-variant/50 transition-shadow duration-300 group shadow-sm hover:shadow-lg cursor-default"
            whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
          >
            <div className="flex justify-between items-start mb-4">
              <motion.div 
                className={`p-2.5 rounded-xl bg-surface-container-high border border-outline-variant/30 ${stat.color} shadow-sm`}
                whileHover={{ scale: 1.12, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              >
                <stat.icon className="w-5 h-5" />
              </motion.div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 bg-primary/10 rounded">{stat.trend}</span>
                <span className="text-[9px] text-outline mt-1 font-semibold uppercase">{stat.sub}</span>
              </div>
            </div>
            <h3 className="text-outline font-bold text-[10px] uppercase tracking-widest">{stat.label}</h3>
            <p className="text-2xl sm:text-3xl font-bold text-on-surface mt-1 tracking-tight">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Budget Distribution */}
        <motion.div variants={itemVariants} className="bg-surface-container rounded-2xl p-6 sm:p-8 border border-outline-variant/50 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold tracking-tight text-on-surface">Departmental Allocation</h2>
            <motion.button 
              className="p-1.5 hover:bg-surface-container-high rounded-md"
              whileHover={{ rotate: 90 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            >
              <Filter className="w-4 h-4 text-outline" />
            </motion.button>
          </div>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={budgetData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  {budgetData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `₹${new Intl.NumberFormat('en-IN').format(value)}`}
                  contentStyle={{ backgroundColor: 'rgba(25, 28, 35, 0.95)', border: 'none', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', padding: '8px 12px', fontSize: '12px' }}
                  itemStyle={{ color: '#fff', fontWeight: '600' }}
                  animationDuration={200}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Feedback Activity */}
        <motion.div variants={itemVariants} className="bg-surface-container rounded-2xl p-6 sm:p-8 border border-outline-variant/50 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold tracking-tight text-on-surface">Citizen Activity</h2>
            <div className="flex gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="w-1.5 h-1.5 rounded-full bg-outline/20" />
            </div>
          </div>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feedbackTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.05} vertical={false} />
                <XAxis dataKey="month" stroke="currentColor" strokeOpacity={0.4} fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="currentColor" strokeOpacity={0.4} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'currentColor', opacity: 0.02, radius: 4 }}
                  contentStyle={{ backgroundColor: 'rgba(25, 28, 35, 0.95)', border: 'none', borderRadius: '12px', padding: '8px 12px', fontSize: '12px', color: '#fff' }}
                  animationDuration={200}
                />
                <Bar dataKey="count" fill="currentColor" fillOpacity={0.8} className="fill-primary" radius={[6, 6, 0, 0]} barSize={32} animationDuration={1200} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Recent Feedback List - Quick View */}
      <motion.div variants={itemVariants} className="bg-surface-container rounded-2xl p-6 sm:p-8 border border-outline-variant/50 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-on-surface">High-Priority Concerns</h2>
            <p className="text-[11px] text-outline font-semibold mt-0.5 uppercase tracking-wider">Trending Issues</p>
          </div>
          <motion.button 
            className="text-primary flex items-center gap-1.5 hover:gap-2.5 font-semibold text-xs border border-primary/20 bg-primary/5 px-3 py-1.5 rounded-md hover:bg-primary/10"
            whileHover={{ x: 2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { tag: 'Roads & Bridges', title: 'Potholes on MG Road after Monsoons', votes: 124, status: 'Active', color: 'bg-secondary/10 text-secondary' },
            { tag: 'Transport', title: 'Bus Delayed Frequency Route 42', votes: 89, status: 'Reviewed', color: 'bg-tertiary/10 text-tertiary' },
            { tag: 'Solid Waste', title: 'Garbage not collected in Ward 12', votes: 67, status: 'Active', color: 'bg-primary/10 text-primary' },
          ].map((item, i) => (
            <motion.div 
              key={i} 
              className="flex flex-col p-5 bg-surface-container-low rounded-xl border border-outline-variant/50 hover:border-outline/50 group relative overflow-hidden cursor-pointer"
              whileHover={{ y: -2, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
              <div className="flex justify-between items-center mb-3 relative z-10">
                <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md ${item.color}`}>
                  {item.tag}
                </span>
                <div className="flex items-center gap-1 text-on-surface font-semibold text-xs">
                  <TrendingUp className="w-3 h-3 text-secondary" />
                  {item.votes}
                </div>
              </div>
              <h4 className="font-semibold text-on-surface text-sm leading-snug mb-4 relative z-10">{item.title}</h4>
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-outline-variant/30 relative z-10">
                <span className="text-[10px] text-outline font-medium">{item.status}</span>
                <div className="flex -space-x-1.5">
                  {[1, 2, 3].map(j => (
                     <div key={j} className="h-5 w-5 rounded-full border border-surface-container bg-surface-variant flex items-center justify-center text-[7px] font-bold text-on-surface-variant">U{j}</div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
