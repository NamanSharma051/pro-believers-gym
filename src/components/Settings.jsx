import React, { useState, useEffect, useCallback } from 'react';
import { getConfig, saveConfig, getPlans, addPlan, deletePlan, updatePlan, getMembers, backupData, restoreData } from '../store';
import { CreditCard, Download, Trash2, ChevronRight, Save, X, Edit2, RotateCcw, Database, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings({ onNameChange }) {
  const [gymName, setGymName]           = useState('Pro Believer');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName]         = useState('');
  const [showPlans, setShowPlans]       = useState(false);
  const [plans, setPlans]               = useState([]);
  const [newPlan, setNewPlan]           = useState({ name: '', price: '', duration: '30' });
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [theme, setTheme]               = useState('dark');

  const refresh = useCallback(async () => {
    const [config, p] = await Promise.all([getConfig(), getPlans()]);
    setGymName(config.name);
    setPlans(p);
    setTheme(config.theme || 'dark');
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSaveName = async () => {
    if (!tempName.trim()) return;
    await saveConfig({ name: tempName });
    setGymName(tempName);
    onNameChange?.(tempName);
    setIsEditingName(false);
    toast.success('Name updated!');
  };

  const handleAddPlan = async () => {
    if (!newPlan.name || !newPlan.price) { toast.error('Fill all fields!'); return; }
    const data = { name: newPlan.name, price: parseInt(newPlan.price), duration: parseInt(newPlan.duration) };
    if (editingPlanId) { await updatePlan(editingPlanId, data); setEditingPlanId(null); toast.success('Updated!'); }
    else { await addPlan(data); toast.success('Plan added!'); }
    setNewPlan({ name: '', price: '', duration: '30' });
    refresh();
  };

  const handleExport = async () => {
    const members = await getMembers();
    if (!members.length) { toast.error('No data!'); return; }
    const csv = [['Name', 'Phone', 'Plan', 'Batch', 'Expiry', 'Paid'], ...members.map(m => [m.name, m.phone, m.plan, m.batch, m.expiryDate, m.final])].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'GymPro_Export.csv'; a.click();
    toast.success('Exported!');
  };

  const handleBackup = async () => {
    const data = await backupData();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    a.download = `GymPro_Backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
    toast.success('Backup downloaded! 📁');
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (confirm('This will replace ALL current data. Continue?')) {
          await restoreData(data); toast.success('Restored! 🔄'); setTimeout(() => location.reload(), 800);
        }
      } catch { toast.error('Invalid backup file!'); }
    };
    reader.readAsText(file);
  };

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    await saveConfig({ theme: next }); setTheme(next);
    document.documentElement.classList.toggle('light', next === 'light');
    toast.success(`${next === 'light' ? 'Light' : 'Dark'} mode!`);
  };

  return (
    <div className="space-y-6 pb-32">
      <div className="flex flex-col items-center gap-3 py-3">
        <div className="w-18 h-18 bg-orange-600 rounded-3xl flex items-center justify-center font-bold text-2xl shadow-xl shadow-orange-600/20 w-[72px] h-[72px]">
          {gymName.charAt(0)}
        </div>
        {isEditingName ? (
          <div className="flex gap-2 items-center">
            <input className="glass-card bg-transparent px-4 py-2 text-center font-bold outline-none border-orange-500 rounded-xl" value={tempName} onChange={e => setTempName(e.target.value)} autoFocus />
            <button onClick={handleSaveName} className="text-emerald-400"><Save size={18} /></button>
            <button onClick={() => setIsEditingName(false)} className="text-gray-500"><X size={18} /></button>
          </div>
        ) : (
          <div className="text-center cursor-pointer" onClick={() => { setTempName(gymName); setIsEditingName(true); }}>
            <h2 className="text-xl font-bold syne">{gymName}</h2>
            <p className="text-orange-500 text-[10px] font-black tracking-widest uppercase mt-0.5">Tap to edit name</p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] text-gray-500 font-black tracking-[0.2em] px-1">GYM CONFIG</p>
        <SettingItem icon={theme === 'dark' ? Sun : Moon} title="App Theme"         sub={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`} color="orange" onClick={toggleTheme} />
        <SettingItem icon={CreditCard}                    title="Membership Plans"  sub={`${plans.length} configured`}                           color="orange" onClick={() => setShowPlans(true)} />
        <SettingItem icon={Download}                      title="Export CSV"        sub="Download member data"                                   color="teal"   onClick={handleExport} />
        <SettingItem icon={Database}                      title="System Backup"     sub="Save all data to JSON"                                  color="orange" onClick={handleBackup} />
        <label className="block w-full cursor-pointer">
          <input type="file" className="hidden" accept=".json" onChange={handleRestore} />
          <SettingItem icon={RotateCcw} title="Restore Data" sub="Upload backup file" color="teal" />
        </label>
      </div>

      {showPlans && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f0f] w-full max-w-md p-5 rounded-3xl border border-white/5 space-y-4 max-h-[80vh] overflow-y-auto hide-scrollbar">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold syne">Membership Plans</h3>
              <button onClick={() => setShowPlans(false)}><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="space-y-2">
              {plans.map(p => (
                <div key={p.id} className="glass-card p-3.5 flex justify-between items-center border-white/5">
                  <div><p className="font-bold text-sm">{p.name}</p><p className="text-[10px] text-gray-500">₹{p.price} · {p.duration} days</p></div>
                  <div className="flex gap-3">
                    <button onClick={() => { setNewPlan({ name: p.name, price: p.price.toString(), duration: p.duration.toString() }); setEditingPlanId(p.id); }} className="text-orange-500/60"><Edit2 size={15} /></button>
                    <button onClick={async () => { await deletePlan(p.id); refresh(); toast.success('Deleted'); }} className="text-red-500/60"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 pt-3 space-y-3">
              <p className="text-[9px] font-black text-orange-500 tracking-widest uppercase">{editingPlanId ? 'Edit Plan' : 'Add Plan'}</p>
              <div className="grid grid-cols-3 gap-2">
                <input className="glass-card bg-transparent p-3 text-xs outline-none border-white/10 rounded-xl" placeholder="Name" value={newPlan.name} onChange={e => setNewPlan(p => ({ ...p, name: e.target.value }))} />
                <input className="glass-card bg-transparent p-3 text-xs outline-none border-white/10 rounded-xl" placeholder="Price" type="number" inputMode="numeric" value={newPlan.price} onChange={e => setNewPlan(p => ({ ...p, price: e.target.value }))} />
                <input className="glass-card bg-transparent p-3 text-xs outline-none border-white/10 rounded-xl" placeholder="Days" type="number" inputMode="numeric" value={newPlan.duration} onChange={e => setNewPlan(p => ({ ...p, duration: e.target.value }))} />
              </div>
              <button onClick={handleAddPlan} className="w-full bg-orange-600 py-3 rounded-xl font-black text-xs text-white">{editingPlanId ? 'SAVE' : 'ADD PLAN'}</button>
              {editingPlanId && <button onClick={() => { setEditingPlanId(null); setNewPlan({ name: '', price: '', duration: '30' }); }} className="w-full text-gray-500 font-bold text-xs uppercase tracking-widest py-1">Cancel Edit</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingItem({ icon: Icon, title, sub, color, onClick }) {
  const cls = { orange: 'bg-orange-500/10 text-orange-500', teal: 'bg-teal-500/10 text-teal-500' }[color];
  return (
    <button onClick={onClick} className="w-full glass-card p-3.5 flex items-center justify-between border-white/5 active:opacity-70 w-full">
      <div className="flex items-center gap-3 text-left">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cls}`}><Icon size={18} /></div>
        <div><p className="font-bold text-sm">{title}</p><p className="text-[10px] text-gray-500 font-bold">{sub}</p></div>
      </div>
      <ChevronRight size={16} className="text-gray-700" />
    </button>
  );
}
