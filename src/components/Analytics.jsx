import React, { useState, useEffect, useCallback, memo } from 'react';
import { getMembers, getTransactions } from '../store';
import { Users, IndianRupee, X, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#ea580c', '#c2410c'];

export default function Analytics() {
  const [members, setMembers]         = useState([]);
  const [planDist, setPlanDist]       = useState([]);
  const [totals, setTotals]           = useState({ income: 0, expense: 0 });
  const [selectedPlan, setSelectedPlan] = useState(null);

  const refresh = useCallback(async () => {
    const [m, t] = await Promise.all([getMembers(), getTransactions()]);
    setMembers(m);
    const counts = {};
    m.forEach(mem => { const p = mem.plan || 'Manual'; counts[p] = (counts[p] || 0) + 1; });
    setPlanDist(Object.entries(counts).map(([name, value]) => ({ name, value })));
    const tot = t.reduce((acc, tx) => {
      const amt = parseInt(tx.amount || 0);
      tx.type === 'income' ? acc.income += amt : acc.expense += amt;
      return acc;
    }, { income: 0, expense: 0 });
    setTotals(tot);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const planMembers = selectedPlan ? members.filter(m => (m.plan || 'Manual') === selectedPlan) : [];

  return (
    <div className="space-y-5 pb-32">
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Users}       label="TOTAL"      value={members.length} color="orange" />
        <StatCard icon={IndianRupee} label="NET PROFIT" value={`₹${(totals.income - totals.expense).toLocaleString('en-IN')}`} color="green" />
      </div>

      <div className="glass-card p-5 space-y-4 border-[var(--card-border)]">
        <h3 className="font-bold syne text-sm uppercase tracking-widest">Plan Distribution</h3>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={planDist} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value" stroke="none">
                {planDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--card-border)', borderRadius: 10 }} itemStyle={{ color: 'var(--text-main)', fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2 pt-3 border-t border-white/5">
          {planDist.map((p, i) => (
            <button key={p.name} onClick={() => setSelectedPlan(p.name)} className="w-full flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <p className="text-xs font-bold text-[var(--text-dim)]">{p.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-black">{p.value}</p>
                <ChevronRight size={12} className="text-gray-600" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedPlan && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-end justify-center">
          <div className="bg-[var(--bg)] w-full max-w-md rounded-t-3xl p-6 border-t border-[var(--card-border)] max-h-[75vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="text-lg font-bold syne">{selectedPlan}</h3>
              <button onClick={() => setSelectedPlan(null)}><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="space-y-2 overflow-y-auto hide-scrollbar">
              {planMembers.map(m => (
                <div key={m.id} className="glass-card p-4 flex justify-between items-center border-[var(--card-border)]">
                  <div><p className="font-bold text-sm">{m.name}</p><p className="text-[10px] text-[var(--text-dim)]">{m.phone}</p></div>
                  <p className="text-sm font-black text-orange-500">₹{m.final}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const StatCard = memo(function StatCard({ icon: Icon, label, value, color }) {
  const cls = color === 'orange' ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500';
  return (
    <div className="glass-card p-4 space-y-2 border-[var(--card-border)]">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cls}`}><Icon size={16} /></div>
      <div>
        <p className="text-[9px] text-[var(--text-dim)] font-black uppercase tracking-widest mb-0.5">{label}</p>
        <h4 className="text-xl font-bold syne">{value}</h4>
      </div>
    </div>
  );
});
