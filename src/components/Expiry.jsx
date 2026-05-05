import React, { useEffect, useState, useCallback, memo } from 'react';
import { getMembers } from '../store';
import { Bell } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Expiry() {
  const [overdue, setOverdue]             = useState([]);
  const [expiring2, setExpiring2]         = useState([]);
  const [expiringWeek, setExpiringWeek]   = useState([]);

  const refresh = useCallback(async () => {
    const members = await getMembers();
    const now = new Date();
    const in2  = new Date(now.getTime() + 2  * 86400000);
    const in7  = new Date(now.getTime() + 7  * 86400000);
    const od = [], e2 = [], e7 = [];
    members.forEach(m => {
      if (!m.expiryDate) return;
      const exp = new Date(m.expiryDate);
      const d = Math.ceil((exp - now) / 86400000);
      if (d <= 0)      od.push({ ...m, daysLeft: d });
      else if (d <= 2) e2.push({ ...m, daysLeft: d });
      else if (d <= 7) e7.push({ ...m, daysLeft: d });
    });
    setOverdue(od.sort((a, b) => a.daysLeft - b.daysLeft));
    setExpiring2(e2.sort((a, b) => a.daysLeft - b.daysLeft));
    setExpiringWeek(e7.sort((a, b) => a.daysLeft - b.daysLeft));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const notify = () => {
    if (!('Notification' in window)) { toast.error('Not supported'); return; }
    Notification.requestPermission().then(perm => {
      if (perm !== 'granted') { toast.error('Permission denied'); return; }
      const all = [...expiring2, ...expiringWeek];
      if (!all.length) { toast.success('No expiring members!'); return; }
      all.forEach(m => new Notification(`⚠️ ${m.name}`, { body: `Expires in ${m.daysLeft} day(s).` }));
      toast.success(`${all.length} alerts sent!`);
    });
  };

  const total = overdue.length + expiring2.length + expiringWeek.length;

  return (
    <div className="space-y-5 pb-32">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold syne tracking-tight">Expiry Alerts</h2>
          <p className="text-orange-500 text-[10px] font-black tracking-widest uppercase mt-0.5">{total} members need attention</p>
        </div>
        <button onClick={notify} className="w-10 h-10 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/30"><Bell size={18} /></button>
      </div>

      {total === 0
        ? <div className="glass-card p-10 text-center text-[var(--text-dim)] text-sm border-[var(--card-border)]">All members are up to date! ✅</div>
        : <div className="space-y-5">
            <AlertList title="OVERDUE"      members={overdue}      color="red"    />
            <AlertList title="IN 2 DAYS"    members={expiring2}    color="orange" />
            <AlertList title="THIS WEEK"    members={expiringWeek} color="yellow" />
          </div>
      }
    </div>
  );
}

const AlertList = memo(function AlertList({ title, members, color }) {
  if (!members.length) return null;
  const badge = { red: 'bg-red-500', orange: 'bg-orange-500', yellow: 'bg-yellow-500' }[color];
  const label = { red: 'text-red-400 bg-red-500/10', orange: 'text-orange-400 bg-orange-500/10', yellow: 'text-yellow-400 bg-yellow-500/10' }[color];
  return (
    <div className="space-y-2">
      <div className={`px-3 py-1.5 rounded-xl font-black text-[10px] tracking-widest border border-white/5 ${label}`}>{title} ({members.length})</div>
      {members.map(m => (
        <div key={m.id} className="glass-card p-3.5 flex justify-between items-center border-[var(--card-border)]">
          <div>
            <p className="font-bold text-sm">{m.name}</p>
            <p className="text-[10px] text-[var(--text-dim)]">{m.phone}</p>
          </div>
          <span className={`text-[10px] font-black px-2 py-1 rounded-lg text-white ${badge}`}>
            {m.daysLeft <= 0 ? 'EXPIRED' : `${m.daysLeft}D`}
          </span>
        </div>
      ))}
    </div>
  );
});
