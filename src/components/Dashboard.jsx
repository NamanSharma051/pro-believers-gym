import React, { useState, useEffect, useCallback, memo } from 'react';
import { getMembers, getTransactions } from '../store';
import { Users, IndianRupee, TrendingUp, AlertTriangle, ChevronRight } from 'lucide-react';

export default function Dashboard({ setActiveTab }) {
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, revenue: 0 });

  const refresh = useCallback(async () => {
    const [members, transactions] = await Promise.all([getMembers(), getTransactions()]);
    const now = new Date();
    const active  = members.filter(m => m.expiryDate ? new Date(m.expiryDate) > now : m.status === 'active');
    const expired = members.filter(m => m.expiryDate ? new Date(m.expiryDate) <= now : m.status !== 'active');
    const revenue = transactions.filter(t => t.type === 'income').reduce((s, t) => s + parseInt(t.amount || 0), 0);
    setStats({ total: members.length, active: active.length, expired: expired.length, revenue });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="space-y-5 pb-32">
      <div className="glass-card p-5 bg-gradient-to-br from-orange-600/15 to-transparent border-orange-500/15">
        <p className="text-[10px] font-black text-orange-400 tracking-[0.3em] uppercase">Elite Management</p>
        <h2 className="text-2xl font-bold syne leading-tight mt-1">PRO BELIEVERS<br/>GYM 🏋️‍♂️</h2>
        <p className="text-xs text-[var(--text-dim)] mt-1">Industrial Management Suite</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DashCard label="TOTAL"    value={stats.total}                      icon={Users}         color="orange" onClick={() => setActiveTab('Members')}   />
        <DashCard label="ACTIVE"   value={stats.active}                     icon={TrendingUp}    color="orange" onClick={() => setActiveTab('Members')}   />
        <DashCard label="RENEWALS" value={stats.expired}                    icon={AlertTriangle} color="red"    onClick={() => setActiveTab('Expiry')}    />
        <DashCard label="INCOME"   value={`₹${stats.revenue.toLocaleString('en-IN')}`} icon={IndianRupee}   color="orange" onClick={() => setActiveTab('Financials')} />
      </div>

      <div className="space-y-2">
        <p className="text-[10px] text-[var(--text-dim)] font-black tracking-[0.2em] px-1 uppercase">Quick Actions</p>
        <QuickAction label="Member Enrollment"    sub="Add to Pro Believers Gym"    onClick={() => setActiveTab('Members')}   />
        <QuickAction label="Business Analytics"   sub="Revenue & Growth Stats"      onClick={() => setActiveTab('Analytics')} />
        <QuickAction label="Financial Log"        sub="Track income & expenses"     onClick={() => setActiveTab('Financials')}/>
      </div>
    </div>
  );
}

const DashCard = memo(function DashCard({ label, value, icon: Icon, color, onClick }) {
  const cls = color === 'orange' ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500';
  return (
    <button onClick={onClick} className="glass-card p-4 text-left space-y-2 border-[var(--card-border)] w-full active:opacity-75">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cls}`}><Icon size={16} /></div>
      <div>
        <p className="text-[9px] text-[var(--text-dim)] font-black uppercase tracking-widest mb-0.5">{label}</p>
        <h4 className="text-xl font-bold syne">{value}</h4>
      </div>
    </button>
  );
});

const QuickAction = memo(function QuickAction({ label, sub, onClick }) {
  return (
    <button onClick={onClick} className="w-full glass-card p-4 flex items-center justify-between border-[var(--card-border)] active:opacity-75">
      <div className="text-left">
        <p className="font-bold text-sm text-[var(--text-main)]">{label}</p>
        <p className="text-[10px] text-[var(--text-dim)] font-bold">{sub}</p>
      </div>
      <ChevronRight size={16} className="text-gray-600" />
    </button>
  );
});
