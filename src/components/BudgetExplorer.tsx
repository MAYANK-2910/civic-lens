import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend, LineChart, Line, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { 
  Search, Filter, Download, ArrowUpRight, ArrowDownRight, 
  Landmark, TrendingUp, Layers, Activity, FileText, AlertCircle,
  MapPin, UserSquare2, MessageSquare, ThumbsUp, HelpCircle, Upload
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

// --- Types & Data Generation ---
type TransactionType = 'Revenue' | 'Expenditure';

interface Transaction {
  id: string;
  fiscalYear: string;
  type: TransactionType;
  category: string;
  amount: number; // in Crores INR
  description: string;
}

const REVENUE_CATEGORIES = [
  'Property Tax',
  'State Govt. Grants',
  'CFC Grants (Central)',
  'Water & Sewerage Charges',
  'Professional Tax',
  'Fines & Penalties',
  'Other Local Taxes'
];

const EXPENDITURE_CATEGORIES = [
  'Public Works (Roads & Bridges)',
  'Health & Solid Waste Management',
  'Water Supply Operations',
  'Administrative & Salaries',
  'Education (Municipal Schools)',
  'Parks & Urban Forestry',
  'Social Welfare'
];

const generateDummyData = (): Transaction[] => {
  const years = ['2015-2016', '2016-2017', '2017-2018', '2018-2019', '2019-2020', '2020-2021', '2021-2022', '2022-2023', '2023-2024', '2024-2025'];
  const data: Transaction[] = [];
  let txId = 1000;

  let baseRev = 1500;
  let baseExp = 1450;

  years.forEach(year => {
    // Determine a random growth/shrinkage factor between 1.02 to 1.15
    const growthRev = 1 + (Math.random() * 0.15);
    const growthExp = 1 + (Math.random() * 0.18);
    
    // Add pandemic shock
    const actualRevBase = year === '2020-2021' ? baseRev * 0.85 : baseRev * growthRev;
    const actualExpBase = year === '2020-2021' ? baseExp * 1.3 : baseExp * growthExp; // health expenses shot up

    REVENUE_CATEGORIES.forEach((cat, i) => {
      // make property tax and grants biggest
      let share = 0.1;
      if (cat === 'Property Tax') share = 0.35;
      if (cat === 'State Govt. Grants') share = 0.25;
      if (cat === 'CFC Grants (Central)') share = 0.20;
      
      data.push({
        id: `TX-${txId++}`,
        fiscalYear: year,
        type: 'Revenue',
        category: cat,
        amount: Math.round(actualRevBase * share * (1 + (Math.random() * 0.1 - 0.05))),
        description: `Annual collection/receipt for ${cat} in FY ${year}`
      });
    });

    EXPENDITURE_CATEGORIES.forEach((cat, i) => {
      let share = 0.1;
      if (cat === 'Public Works (Roads & Bridges)') share = 0.30;
      if (cat === 'Health & Solid Waste Management') share = year === '2020-2021' ? 0.40 : 0.25;
      if (cat === 'Administrative & Salaries') share = 0.20;
      if (cat === 'Water Supply Operations') share = 0.15;
      
      data.push({
        id: `TX-${txId++}`,
        fiscalYear: year,
        type: 'Expenditure',
        category: cat,
        amount: Math.round(actualExpBase * share * (1 + (Math.random() * 0.1 - 0.05))),
        description: `Allocated funds mapped to ${cat} in FY ${year}`
      });
    });

    baseRev = actualRevBase;
    baseExp = actualExpBase;
  });

  return data.sort((a,b) => b.fiscalYear.localeCompare(a.fiscalYear));
};

const ALL_INITIAL_DATA = generateDummyData();
const INITIAL_AVAILABLE_YEARS = [...new Set(ALL_INITIAL_DATA.map(d => d.fiscalYear))].sort().reverse();
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];

// --- Helper Components ---
const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')} Cr`;

export default function BudgetExplorer() {
  const [allData, setAllData] = useState<Transaction[]>(ALL_INITIAL_DATA);
  const availableYears = useMemo(() => {
    const years = [...new Set(allData.map(d => d.fiscalYear))].sort().reverse();
    return years.length > 0 ? years : ['2024-2025'];
  }, [allData]);

  const [activeYear, setActiveYear] = useState<string>(INITIAL_AVAILABLE_YEARS[0]);
  const [viewTab, setViewTab] = useState<'overview' | 'trends' | 'ledger'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeYear !== 'All' && !availableYears.includes(activeYear)) {
      setActiveYear(availableYears[0]);
    }
  }, [availableYears, activeYear]);

  // Filter Data
  const yearData = useMemo(() => allData.filter(d => d.fiscalYear === activeYear), [allData, activeYear]);
  
  // Year Summary Statistics
  const summaryOpts = useMemo(() => {
    const totalRev = yearData.filter(d => d.type === 'Revenue').reduce((s, d) => s + d.amount, 0);
    const totalExp = yearData.filter(d => d.type === 'Expenditure').reduce((s, d) => s + d.amount, 0);
    const net = totalRev - totalExp;
    return { totalRev, totalExp, net };
  }, [yearData]);

  // Breakdown Data for Charts
  const revenueBreakdown = useMemo(() => {
    return yearData.filter(d => d.type === 'Revenue')
      .sort((a, b) => b.amount - a.amount)
      .map(d => ({ ...d, percentage: summaryOpts.totalRev > 0 ? (d.amount / summaryOpts.totalRev) * 100 : 0 }));
  }, [yearData, summaryOpts.totalRev]);

  const expenditureBreakdown = useMemo(() => {
    return yearData.filter(d => d.type === 'Expenditure')
      .sort((a, b) => b.amount - a.amount)
      .map(d => ({ ...d, percentage: summaryOpts.totalExp > 0 ? (d.amount / summaryOpts.totalExp) * 100 : 0 }));
  }, [yearData, summaryOpts.totalExp]);

  // Historical Trends Data
  const trendData = useMemo(() => {
    return availableYears.slice().reverse().map(year => {
      const yrDat = allData.filter(d => d.fiscalYear === year);
      const rev = yrDat.filter(d => d.type === 'Revenue').reduce((s,d) => s + d.amount, 0);
      const exp = yrDat.filter(d => d.type === 'Expenditure').reduce((s,d) => s + d.amount, 0);
      return { fiscalYear: year, Revenue: rev, Expenditure: exp, Net: rev - exp };
    });
  }, [availableYears, allData]);

  // Ledger Filtered Data
  const ledgerData = useMemo(() => {
    return allData.filter(d => {
      if (viewTab === 'ledger' && activeYear !== 'All' && d.fiscalYear !== activeYear) return false;
      if (viewTab !== 'ledger' && d.fiscalYear !== activeYear) return false;
      if (searchQuery) {
        return d.category.toLowerCase().includes(searchQuery.toLowerCase()) || d.description.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [allData, activeYear, searchQuery, viewTab]);

  const handleExportCSV = () => {
    if (ledgerData.length === 0) return;
    
    const headers = ['ID', 'Fiscal Year', 'Type', 'Category', 'Description', 'Amount (Cr INR)'];
    const csvContent = [
      headers.join(','),
      ...ledgerData.map(tx => [
        tx.id,
        tx.fiscalYear,
        tx.type,
        `"${tx.category.replace(/"/g, '""')}"`,
        `"${tx.description.replace(/"/g, '""')}"`,
        tx.amount
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `municipal_budget_export_${activeYear !== 'All' ? activeYear : 'All'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) return;
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        if (lines.length <= 1) return; // Has header but no data
        
        const newData: Transaction[] = [];
        
        // Very basic CSV parsing for demo 
        // Assumes format: ID, Fiscal Year, Type, Category, Description, Amount (Cr INR)
        for (let i = 1; i < lines.length; i++) {
          const rawLine = lines[i];
          // Regex to parse comma separated values handling quotes
          const match = rawLine.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
          if (match && match.length >= 6) {
            const row = match.map(val => {
              let clean = val.startsWith(',') ? val.substr(1) : val;
              if (clean.startsWith('"') && clean.endsWith('"')) {
                clean = clean.substring(1, clean.length - 1).replace(/""/g, '"');
              }
              return clean.trim();
            });
            
            newData.push({
              id: row[0],
              fiscalYear: row[1],
              type: row[2] as TransactionType,
              category: row[3],
              description: row[4],
              amount: parseFloat(row[5]) || 0
            });
          }
        }
        
        if (newData.length > 0) {
          setAllData(newData);
          alert(`Successfully loaded ${newData.length} records.`);
        }
      } catch (err: any) {
        alert('Error parsing CSV file: ' + err.message);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const generateInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Act as an expert financial auditor for an Indian Municipal Corporation. 
      Analyze this fiscal year summary for ${activeYear}:
      Total Revenue: ₹${summaryOpts.totalRev} Crore. Total Expenditure: ₹${summaryOpts.totalExp} Crore. Net: ₹${summaryOpts.net} Crore.
      Top 2 Revenues: ${revenueBreakdown.slice(0,2).map(r => r.category + ' (₹' + r.amount + 'Cr)').join(', ')}.
      Top 2 Expenditures: ${expenditureBreakdown.slice(0,2).map(r => r.category + ' (₹' + r.amount + 'Cr)').join(', ')}.
      
      Write a highly analytical 3-sentence summary meant for public transparency and accountability. Call out if they are overspending or depending too much on external grants. Use formatting for numbers.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      setAiInsight(response.text || 'Insight generation failed.');
    } catch (e: any) {
      console.error(e);
      setAiInsight("Unable to generate AI auditor summary at this time. Please check your API configuration.");
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-container-high border border-outline-variant p-3 rounded-xl shadow-xl text-sm min-w-[200px]">
          <p className="font-bold text-on-surface mb-2 border-b border-outline-variant/50 pb-1">{label || payload[0]?.payload?.name || payload[0]?.name}</p>
          {payload.map((p: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center gap-4 py-0.5">
              <span className="text-on-surface-variant flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }}></span>
                {p.dataKey || p.name}
              </span>
              <span className="font-mono font-bold text-on-surface">{formatCurrency(p.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-outline-variant/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/10 text-primary p-1.5 rounded-lg shadow-sm ring-1 ring-primary/20">
              <Landmark className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Municipal Open Data</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface bg-clip-text text-transparent bg-gradient-to-br from-on-surface to-on-surface-variant">
            Financial Transparency Portal
          </h1>
          <p className="text-sm md:text-base text-on-surface-variant mt-2 max-w-2xl font-medium leading-relaxed">
            Track where your municipal taxes go. Ensuring civil accountability through open, accessible financial reporting and trend analysis.
          </p>
        </div>
        
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <div className="flex bg-surface-container p-1 rounded-xl shadow-inner border border-outline-variant/40">
            {(['overview', 'trends', 'ledger'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setViewTab(tab)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg capitalize transition-all duration-200 ${
                  viewTab === tab 
                    ? 'bg-surface-bright text-primary shadow border border-outline-variant/40' 
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <select 
            value={activeYear}
            onChange={(e) => setActiveYear(e.target.value)}
            className="w-full md:w-auto bg-surface border border-outline-variant text-on-surface text-sm font-bold rounded-lg px-4 py-2.5 shadow-sm appearance-none cursor-pointer hover:border-primary/50 transition-colors focus:ring-2 focus:ring-primary/20 focus:outline-none"
            style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', paddingRight: '2.5rem' }}
          >
            {availableYears.map(yr => (
              <option key={yr} value={yr}>FY {yr}</option>
            ))}
            {viewTab === 'ledger' && <option value="All">All Years</option>}
          </select>
        </div>
      </header>

      {/* KPI ROW */}
      {(viewTab === 'overview' || viewTab === 'ledger') && activeYear !== 'All' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm hover:border-outline transition-colors relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 text-tertiary/5 group-hover:text-tertiary/10 transition-colors">
              <ArrowDownRight className="w-32 h-32" />
            </div>
            <p className="text-xs font-bold text-outline-variant mb-1 uppercase tracking-wider flex items-center gap-1.5"><ArrowDownRight className="w-4 h-4 text-tertiary" /> Total Revenue (Receipts)</p>
            <h3 className="text-3xl font-extrabold text-on-surface mb-1">{formatCurrency(summaryOpts.totalRev)}</h3>
            <p className="text-xs font-medium text-tertiary">From taxes, grants, and charges</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm hover:border-outline transition-colors relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 text-error/5 group-hover:text-error/10 transition-colors">
              <ArrowUpRight className="w-32 h-32" />
            </div>
            <p className="text-xs font-bold text-outline-variant mb-1 uppercase tracking-wider flex items-center gap-1.5"><ArrowUpRight className="w-4 h-4 text-error" /> Total Expenditure (Outgo)</p>
            <h3 className="text-3xl font-extrabold text-on-surface mb-1">{formatCurrency(summaryOpts.totalExp)}</h3>
            <p className="text-xs font-medium text-error">Spent on public infra & services</p>
          </div>
          <div className={`border rounded-2xl p-5 shadow-sm relative overflow-hidden transition-colors ${summaryOpts.net >= 0 ? 'bg-tertiary-container/30 border-tertiary/20' : 'bg-error/10 border-error/20'}`}>
            <p className={`text-xs font-bold mb-1 uppercase tracking-wider flex items-center gap-1.5 ${summaryOpts.net >= 0 ? 'text-tertiary' : 'text-error'}`}>
              <Activity className="w-4 h-4" /> Fiscal Balance
            </p>
            <h3 className={`text-3xl font-extrabold mb-1 ${summaryOpts.net >= 0 ? 'text-tertiary' : 'text-error'}`}>
              {summaryOpts.net > 0 ? '+' : ''}{formatCurrency(summaryOpts.net)}
            </h3>
            <p className={`text-xs font-medium ${summaryOpts.net >= 0 ? 'text-tertiary' : 'text-error'}`}>
              {summaryOpts.net >= 0 ? 'Surplus for reserve funds' : 'Deficit requiring borrowing'}
            </p>
          </div>
        </div>
      )}

      {/* AI INSIGHT */}
      {(viewTab === 'overview' && activeYear !== 'All') && (
        <div className="bg-[#f0f4ff] dark:bg-[#1e293b] border border-blue-200 dark:border-blue-900/50 rounded-2xl p-5 lg:p-6 shadow-sm flex flex-col md:flex-row gap-5 items-start">
          <div className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 p-3 rounded-xl shrink-0">
            <UserSquare2 className="w-6 h-6" />
          </div>
          <div className="flex-1 w-full">
            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100 uppercase tracking-widest mb-2 flex items-center justify-between">
              AI Independent Auditor
              {!aiInsight && !isGeneratingInsights && (
                <button onClick={generateInsights} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-colors capitalize tracking-normal flex items-center gap-1.5">
                  Request Report
                </button>
              )}
            </h4>
            {isGeneratingInsights ? (
              <div className="animate-pulse flex flex-col gap-2">
                <div className="h-4 bg-blue-200/50 dark:bg-blue-800/50 rounded w-full"></div>
                <div className="h-4 bg-blue-200/50 dark:bg-blue-800/50 rounded w-5/6"></div>
              </div>
            ) : aiInsight ? (
              <p className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed font-medium">
                {aiInsight}
              </p>
            ) : (
              <p className="text-blue-600/70 dark:text-blue-400/70 text-sm italic">
                Generate an independent AI analysis for the {activeYear} fiscal performance to review dependency and overspending.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TABS CONTENT */}
      
      {/* 1. OVERVIEW TAB */}
      {viewTab === 'overview' && (
        <div className="flex flex-col gap-6 w-full">
          {/* Revenue Breakdown */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col xl:flex-row gap-8">
            <div className="flex-1">
               <h3 className="text-xl font-bold text-on-surface mb-1 flex items-center gap-2">
                 <ArrowDownRight className="w-6 h-6 text-tertiary" /> Where Money Comes From
               </h3>
               <p className="text-sm text-on-surface-variant font-medium mb-6">Detailed revenue breakdown and sources for {activeYear}</p>
               
               <div className="flex flex-col gap-4">
                 {revenueBreakdown.map((item, idx) => (
                   <div key={item.id} className="bg-surface-container/50 p-4 rounded-2xl border border-outline-variant/30 hover:border-outline-variant transition-colors">
                     <div className="flex justify-between items-center mb-2">
                       <div className="flex items-center gap-3">
                         <span className="w-3 h-3 rounded-full shrink-0" style={{backgroundColor: COLORS[idx % COLORS.length]}}></span>
                         <span className="font-bold text-sm text-on-surface">{item.category}</span>
                       </div>
                       <div className="text-right flex items-center gap-2">
                         <span className="font-mono text-sm font-bold text-on-surface">{formatCurrency(item.amount)}</span>
                         <span className="text-xs text-on-surface-variant font-bold bg-surface-variant px-1.5 py-0.5 rounded w-12 text-center">
                           {item.percentage?.toFixed(1)}%
                         </span>
                       </div>
                     </div>
                     <div className="w-full bg-surface-variant rounded-full h-1.5 overflow-hidden">
                       <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.percentage}%`, backgroundColor: COLORS[idx % COLORS.length] }}></div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
            
            <div className="xl:w-[450px] flex flex-col items-center justify-center relative bg-surface-container-low/30 rounded-3xl border border-outline-variant/50 p-6 min-h-[350px]">
              <div className="h-[300px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={90}
                      outerRadius={130}
                      paddingAngle={3}
                      dataKey="amount"
                      nameKey="category"
                      stroke="none"
                    >
                      {revenueBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs font-bold text-outline-variant uppercase tracking-wider mb-1">Total Receipts</span>
                  <span className="text-2xl font-extrabold text-tertiary">{formatCurrency(summaryOpts.totalRev)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Expenditure Breakdown */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col xl:flex-row gap-8">
            <div className="xl:w-[450px] flex flex-col items-center justify-center bg-surface-container-low/30 rounded-3xl border border-outline-variant/50 p-6 min-h-[350px] order-2 xl:order-1">
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenditureBreakdown} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.05} horizontal={true} vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="category" type="category" width={140} tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)', fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-surface-container)', opacity: 0.4 }} />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={32}>
                      {expenditureBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-center">
                 <span className="text-xs font-bold text-outline-variant uppercase tracking-wider mb-1 block">Total Expenditure</span>
                 <span className="text-2xl font-extrabold text-error">{formatCurrency(summaryOpts.totalExp)}</span>
              </div>
            </div>
            
            <div className="flex-1 order-1 xl:order-2">
               <h3 className="text-xl font-bold text-on-surface mb-1 flex items-center gap-2">
                 <ArrowUpRight className="w-6 h-6 text-error" /> Where Money Goes
               </h3>
               <p className="text-sm text-on-surface-variant font-medium mb-6">Detailed expenditure allocation across active sectors.</p>
               
               <div className="flex flex-col gap-4">
                 {expenditureBreakdown.map((item, idx) => (
                   <div key={item.id} className="bg-surface-container/50 p-4 rounded-2xl border border-outline-variant/30 hover:border-outline-variant transition-colors flex items-center gap-4">
                     <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-surface shrink-0 border border-outline-variant/50">
                        <span className="text-lg font-bold" style={{color: COLORS[idx % COLORS.length]}}>
                          {idx + 1}
                        </span>
                     </div>
                     <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-center mb-1">
                         <span className="font-bold text-sm text-on-surface truncate pr-2">{item.category}</span>
                         <span className="font-mono text-sm font-bold text-on-surface shrink-0">{formatCurrency(item.amount)}</span>
                       </div>
                       <div className="flex items-center gap-3">
                         <div className="flex-1 bg-surface-variant rounded-full h-1.5 overflow-hidden">
                           <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.percentage}%`, backgroundColor: COLORS[idx % COLORS.length] }}></div>
                         </div>
                         <span className="text-xs text-on-surface-variant font-bold w-10 text-right">
                           {item.percentage?.toFixed(1)}%
                         </span>
                       </div>
                       <p className="text-xs text-on-surface-variant mt-2 truncate max-w-md">{item.description}</p>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TRENDS TAB */}
      {viewTab === 'trends' && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-on-surface mb-1 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Multi-Year Fiscal Trajectory
            </h3>
            <p className="text-xs text-on-surface-variant font-medium">Tracking Income vs Expenditure over a decade to identify structural deficits.</p>
          </div>
          <div className="w-full h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-tertiary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-tertiary)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-error)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-error)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
                <XAxis dataKey="fiscalYear" stroke="var(--color-outline)" tick={{ fontSize: 12, fill: 'var(--color-on-surface-variant)', fontWeight: 500}} axisLine={false} tickLine={false} dy={10} />
                <YAxis tickFormatter={(val) => `₹${val}Cr`} stroke="var(--color-outline)" tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)'}} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                <Area type="monotone" dataKey="Revenue" stroke="var(--color-tertiary)" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="Expenditure" stroke="var(--color-error)" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 flex items-start gap-3 bg-surface-container p-4 rounded-xl border border-outline-variant/50">
            <AlertCircle className="w-5 h-5 text-on-surface-variant shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-on-surface-variant leading-relaxed">
              <strong>Accountability Note:</strong> Notice how the gap between lines (Deficit/Surplus) varies. Spikes in expenditure during 2020-2021 are indicative of emergency health and sanitation spending during pandemic periods. Consistently keeping Revenue above Expenditure ensures municipal self-reliance without heavy debt.
            </p>
          </div>
        </div>
      )}

      {/* 3. LEDGER TAB */}
      {viewTab === 'ledger' && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-6 border-b border-outline-variant/60 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface/50">
            <div>
              <h3 className="text-lg font-bold text-on-surface mb-1 flex items-center gap-2">
                <FileText className="w-5 h-5 text-secondary" /> Detailed Activity Ledger
              </h3>
              <p className="text-xs text-on-surface-variant font-medium">Line-item accountability. Search for specific programs or categories.</p>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto relative">
              <Search className="w-4 h-4 text-outline absolute left-3" />
              <input 
                type="text" 
                placeholder="Search ledger..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-full md:w-64 bg-surface text-on-surface border border-outline-variant rounded-lg text-sm font-medium focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto w-full max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-surface-container border-b border-outline-variant/50 sticky top-0 z-10">
                <tr>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest w-24">ID</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest w-32">Year</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest w-32">Type</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Category & Purpose</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right w-32">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {ledgerData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-on-surface-variant font-medium">
                      No matching records found for "{searchQuery}"
                    </td>
                  </tr>
                ) : (
                  ledgerData.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-container-low transition-colors group">
                      <td className="p-4 text-xs font-mono text-outline-variant group-hover:text-on-surface transition-colors">{tx.id}</td>
                      <td className="p-4 text-sm font-medium text-on-surface">{tx.fiscalYear}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 flex w-fit items-center gap-1 text-[10px] uppercase tracking-wider font-bold rounded-lg border ${
                          tx.type === 'Revenue' 
                            ? 'bg-tertiary/10 text-tertiary border-tertiary/20' 
                            : 'bg-error/10 text-error border-error/20'
                        }`}>
                          {tx.type === 'Revenue' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-on-surface mb-0.5">{tx.category}</p>
                        <p className="text-xs text-on-surface-variant max-w-lg truncate">{tx.description}</p>
                      </td>
                      <td className={`p-4 text-sm font-bold text-right font-mono ${tx.type === 'Revenue' ? 'text-tertiary' : 'text-on-surface'}`}>
                        {formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-surface-container border-t border-outline-variant/60 flex items-center justify-between text-xs font-medium text-on-surface-variant flex-wrap gap-4">
            <span>Showing {ledgerData.length} records</span>
            <div className="flex gap-4 items-center">
              <div>
                <input 
                  type="file" 
                  accept=".csv" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  id="csv-upload" 
                />
                <label 
                  htmlFor="csv-upload" 
                  className="flex items-center gap-1.5 cursor-pointer text-primary hover:underline underline-offset-4"
                >
                  <Upload className="w-4 h-4" /> Import CSV
                </label>
              </div>
              <button 
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 text-secondary hover:underline underline-offset-4"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
