import React, { useState, useEffect, useCallback } from 'react';
import { getTransactions, addTransaction } from '../store';
import { IndianRupee, TrendingUp, TrendingDown, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Financials() {
  const [transactions, setTransactions] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle]     = useState('');
  const [amount, setAmount]   = useState('');
  const [type, setType]       = useState('income');
  const [method, setMethod]   = useState('Cash');
  const [date, setDate]       = useState(new Date().toISOString().split('T')[0]);

  const refresh = useCallback(async () => {
    setTransactions(await getTransactions());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const totals = transactions.reduce((acc, t) => {
    const amt = parseInt(t.amount || 0);
    t.type === 'income' ? acc.revenue += amt : acc.expenses += amt;
    return acc;
  }, { revenue: 0, expenses: 0 });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title || !amount) { toast.error('Fill all fields!'); return; }
    await addTransaction({ title, amount: parseInt(amount), type, method, date });
    toast.success('Saved! 💰');
    setShowAdd(false); setTitle(''); setAmount('');
    refresh();
  };

  return (
    <div className="space-y-4 pb-32">
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="REVENUE"  value={`₹${totals.revenue.toLocaleString('en-IN')}`}  color="orange" icon={TrendingUp}   />
        <SummaryCard label="EXPENSES" value={`₹${totals.expenses.toLocaleString('en-IN')}`} color="red"    icon={TrendingDown} />
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-bold syne text-base uppercase tracking-widest">Financial Logs</h3>
        <button onClick={() => setShowAdd(true)} className="w-9 h-9 glass-card flex items-center justify-center text-orange-400 border-orange-500/20">
          <Plus size={16} strokeWidth={3} />
        </button>
      </div>

      <div className="space-y-2">
        {transactions.length === 0
          ? <div className="text-center py-14 text-[var(--text-dim)] text-sm">No transactions yet.</div>
          : transactions.map(t => (
            <div key={t.id} className="glass-card p-3.5 flex items-center justify-between border-[var(--card-border)]">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type === 'income' ? 'bg-orange-500/10 text-orange-400' : 'bg-red-500/10 text-red-400'}`}>
                  {t.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                </div>
                <div>
                  <p className="font-bold text-sm truncate max-w-[140px]">{t.title}</p>
                  <p className="text-[10px] text-[var(--text-dim)] font-bold">{t.date} · {t.method}</p>
                </div>
              </div>
              <p className={`font-black text-sm ${t.type === 'income' ? 'text-orange-400' : 'text-red-400'}`}>
                {t.type === 'income' ? '+' : '-'}₹{parseInt(t.amount).toLocaleString('en-IN')}
              </p>
            </div>
          ))
        }
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-end justify-center">
          <div className="bg-[var(--bg)] w-full max-w-md p-6 rounded-t-3xl border-t border-[var(--card-border)] space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold syne">Log Entry</h3>
              <button onClick={() => setShowAdd(false)}><X size={18} className="text-gray-500" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <input className="w-full glass-card bg-transparent p-3.5 text-sm outline-none text-[var(--text-main)] rounded-xl" placeholder="Description" value={title} onChange={e => setTitle(e.target.value)} />
              <input className="w-full glass-card bg-transparent p-3.5 text-sm outline-none text-[var(--text-main)] rounded-xl" placeholder="Amount (₹)" type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} />
              <input className="w-full glass-card bg-transparent p-3.5 text-sm outline-none text-[var(--text-main)] rounded-xl" type="date" value={date} onChange={e => setDate(e.target.value)} />
              <div className="flex gap-2">
                {['Cash', 'UPI', 'Card'].map(m => (
                  <button key={m} type="button" onClick={() => setMethod(m)} className={`flex-1 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${method === m ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-white/10 text-gray-500'}`}>{m}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setType('income')} className={`flex-1 py-3 rounded-2xl font-black text-[10px] tracking-widest ${type === 'income' ? 'bg-orange-600 text-white' : 'glass-card text-[var(--text-dim)]'}`}>CREDIT (+)</button>
                <button type="button" onClick={() => setType('expense')} className={`flex-1 py-3 rounded-2xl font-black text-[10px] tracking-widest ${type === 'expense' ? 'bg-red-500 text-white' : 'glass-card text-[var(--text-dim)]'}`}>DEBIT (-)</button>
              </div>
              <button type="submit" className="w-full bg-orange-600 h-13 rounded-2xl font-black tracking-widest text-white shadow-xl shadow-orange-600/20">SAVE ENTRY</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, icon: Icon }) {
  const cls = color === 'orange' ? 'bg-orange-500/10 text-orange-400' : 'bg-red-500/10 text-red-400';
  return (
    <div className="glass-card p-4 space-y-2 border-[var(--card-border)]">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cls}`}><Icon size={16} /></div>
      <div>
        <p className="text-[9px] text-[var(--text-dim)] font-black uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-xl font-bold syne">{value}</p>
      </div>
    </div>
  );
}
