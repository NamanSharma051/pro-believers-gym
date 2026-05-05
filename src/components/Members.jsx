import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { getMembers, addMember, deleteMember, updateMember, getPlans, compressImage, addTransaction } from '../store';
import { Search, Plus, Camera, X, Wallet, Trash2, Check, Edit3, RefreshCcw, Eye, User } from 'lucide-react';
import toast from 'react-hot-toast';

const INITIAL_FORM = {
  name: '', phone: '', gender: 'Male',
  selectedPlan: null, batch: 'Morning',
  startDate: new Date().toISOString().split('T')[0],
  paymentDate: new Date().toISOString().split('T')[0],
  expiryDate: '', paymentMethod: 'Cash',
  price: 0, discount: 0, final: 0, due: 0, notes: ''
};

export default function Members({ onMemberChange }) {
  const [members, setMembers]             = useState([]);
  const [plans, setPlans]                 = useState([]);
  const [search, setSearch]               = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory]           = useState('All');
  const [showAdd, setShowAdd]             = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [form, setForm]                   = useState(INITIAL_FORM);
  const [imageFile, setImageFile]         = useState(null);
  const [imagePreview, setImagePreview]   = useState(null);
  const [showImageSource, setShowImageSource] = useState(false);
  const [showLiveCamera, setShowLiveCamera]   = useState(false);
  const [showProfile, setShowProfile]     = useState(false);
  const [selectedMember, setSelectedMember]   = useState(null);
  const [loading, setLoading]             = useState(true);

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Debounce search — avoid filtering on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 150);
    return () => clearTimeout(t);
  }, [search]);

  const refresh = useCallback(async () => {
    const [m, p] = await Promise.all([getMembers(), getPlans()]);
    setMembers(m);
    setPlans(p);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Memoized filtering — only recalculates when members/search/category change
  const filtered = useMemo(() => {
    const s = debouncedSearch.toLowerCase();
    return members.filter(m => {
      const matchesSearch = !s || m.name.toLowerCase().includes(s) || m.phone.includes(s);
      const matchesCategory = category === 'All' || (m.plan && m.plan.toLowerCase().includes(category.toLowerCase()));
      return matchesSearch && matchesCategory;
    });
  }, [members, debouncedSearch, category]);

  const categories = ['All', '1 Month', '3 Months', '6 Months', '12 Months'];

  // Camera
  const startCamera = async () => {
    setShowImageSource(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } } });
      streamRef.current = stream;
      setShowLiveCamera(true);
    } catch {
      toast.error('Camera access denied!');
    }
  };

  useEffect(() => {
    if (showLiveCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [showLiveCamera]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setShowLiveCamera(false);
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    canvas.width = 300; canvas.height = 300;
    canvas.getContext('2d').drawImage(video, sx, sy, size, size, 0, 0, 300, 300);
    setImagePreview(canvas.toDataURL('image/webp', 0.7));
    setImageFile(null);
    stopCamera();
  }, [stopCamera]);

  const updateField = useCallback((field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'selectedPlan' && value !== 'CUSTOM') {
        next.plan = value.name;
        next.price = parseInt(value.price || 0);
        next.final = next.price - (prev.discount || 0);
        next.due = next.final;
        const start = new Date(next.startDate);
        start.setDate(start.getDate() + parseInt(value.duration || 30));
        next.expiryDate = start.toISOString().split('T')[0];
      }
      if (field === 'startDate' && prev.selectedPlan && prev.selectedPlan !== 'CUSTOM') {
        const start = new Date(value);
        start.setDate(start.getDate() + parseInt(prev.selectedPlan.duration || 30));
        next.expiryDate = start.toISOString().split('T')[0];
      }
      if (field === 'price' || field === 'discount') {
        const p = field === 'price' ? parseInt(value || 0) : next.price;
        const d = field === 'discount' ? parseInt(value || 0) : next.discount;
        next.final = p - d; next.due = next.final;
      }
      return next;
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) { toast.error('Required fields missing!'); return; }
    const tid = toast.loading('Saving...');
    let profileImage = imagePreview;
    if (imageFile) profileImage = await compressImage(imageFile);
    const data = {
      ...form,
      plan: form.selectedPlan === 'CUSTOM' ? 'Custom' : (form.selectedPlan?.name || form.plan || 'Manual'),
      profileImage,
      status: 'active'
    };
    delete data.selectedPlan;
    if (editingMember) {
      await updateMember(editingMember, data);
    } else {
      await addMember(data);
      if (data.final > 0) {
        await addTransaction({ title: `Enroll: ${data.name}`, amount: data.final, type: 'income', method: data.paymentMethod || 'Cash', date: data.paymentDate || new Date().toISOString().split('T')[0] });
      }
    }
    toast.dismiss(tid);
    toast.success('Saved! ✅');
    setShowAdd(false); setEditingMember(null); setForm(INITIAL_FORM); setImagePreview(null); setImageFile(null);
    refresh();
    onMemberChange?.();
  };

  const handleEdit = useCallback((m) => {
    setEditingMember(m.id);
    const planObj = plans.find(p => p.name === m.plan) || 'CUSTOM';
    setForm({ ...m, selectedPlan: planObj });
    setImagePreview(m.profileImage);
    setShowAdd(true);
  }, [plans]);

  const handleRenew = useCallback(async (m) => {
    const today = new Date().toISOString().split('T')[0];
    const planObj = plans.find(p => p.name === m.plan);
    const duration = planObj ? parseInt(planObj.duration) : 30;
    const expiry = new Date(); expiry.setDate(expiry.getDate() + duration);
    await updateMember(m.id, { startDate: today, paymentDate: today, expiryDate: expiry.toISOString().split('T')[0], status: 'active' });
    if (planObj?.price > 0) {
      await addTransaction({ title: `Renew: ${m.name}`, amount: planObj.price, type: 'income', method: 'Cash', date: today });
    }
    toast.success('Renewed! 🚀'); refresh(); onMemberChange?.();
  }, [plans, refresh, onMemberChange]);

  const handleDelete = useCallback(async (m) => {
    if (!confirm(`Delete ${m.name}?`)) return;
    await deleteMember(m.id); refresh(); toast.success('Removed'); onMemberChange?.();
  }, [refresh, onMemberChange]);

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex gap-2">
        <div className="flex-1 glass-card h-11 flex items-center px-3 gap-2">
          <Search size={16} className="text-gray-500 flex-shrink-0" />
          <input
            type="text" placeholder="Search members..."
            className="bg-transparent outline-none text-sm w-full text-[var(--text-main)]"
            value={search} onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="text-gray-500"><X size={14} /></button>}
        </div>
        <button
          onClick={() => { setEditingMember(null); setForm(INITIAL_FORM); setImagePreview(null); setShowAdd(true); }}
          className="w-11 h-11 glass-card flex items-center justify-center text-orange-500"
        ><Plus size={22} /></button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar">
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest flex-shrink-0 ${
              category === cat ? 'bg-orange-600 text-white' : 'glass-card text-[var(--text-dim)]'
            }`}
          >{cat.toUpperCase()}</button>
        ))}
      </div>

      {/* Members List — no framer-motion, just render */}
      <div className="space-y-2 pb-32">
        {loading ? (
          <div className="py-16 text-center text-orange-500 font-bold uppercase tracking-widest text-[10px] animate-pulse">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-dim)] text-xs font-bold uppercase tracking-widest">No members found</div>
        ) : (
          filtered.map(m => (
            <MemberCard key={m.id} member={m}
              onView={() => { setSelectedMember(m); setShowProfile(true); }}
              onEdit={() => handleEdit(m)}
              onRenew={() => handleRenew(m)}
              onDelete={() => handleDelete(m)}
            />
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-end justify-center">
          <div className="bg-[var(--bg)] w-full max-w-xl rounded-t-3xl border-t border-[var(--card-border)] shadow-2xl max-h-[95vh] flex flex-col">
            <div className="px-6 pt-5 pb-4 flex justify-between items-center border-b border-[var(--card-border)] flex-shrink-0">
              <h3 className="text-lg font-bold syne">{editingMember ? 'Edit Details' : 'New Enrollment'}</h3>
              <button onClick={() => setShowAdd(false)}><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="overflow-y-auto hide-scrollbar flex-1 px-6 pb-10">
              <form onSubmit={handleSave} className="space-y-4 pt-4">
                {/* Profile Photo */}
                <div className="flex justify-center">
                  <div onClick={() => setShowImageSource(true)}
                    className="w-20 h-20 rounded-full glass-card flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed border-orange-500/30">
                    {imagePreview
                      ? <img src={imagePreview} className="w-full h-full object-cover" loading="lazy" />
                      : <Camera size={22} className="text-orange-500/50" />
                    }
                  </div>
                </div>
                <input id="galleryInput" type="file" className="hidden" accept="image/*" onChange={async e => { const f = e.target.files[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); setShowImageSource(false); } }} />

                <div className="grid grid-cols-2 gap-3">
                  <FInput label="FULL NAME *" value={form.name} onChange={v => updateField('name', v)} colSpan2 />
                  <FInput label="PHONE *" value={form.phone} onChange={v => updateField('phone', v)} inputMode="tel" />
                  <FSelect label="GENDER" options={['Male', 'Female', 'Other']} value={form.gender} onChange={v => updateField('gender', v)} />
                </div>

                {/* Plan Select */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-[var(--text-dim)] tracking-widest uppercase ml-1">Select Plan</p>
                  <div className="flex flex-wrap gap-2">
                    {plans.map(p => (
                      <button key={p.id} type="button" onClick={() => updateField('selectedPlan', p)}
                        className={`px-4 py-2 rounded-xl border-2 text-xs font-bold ${form.selectedPlan?.id === p.id ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-[var(--card-border)] text-[var(--text-dim)]'}`}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FInput label="START DATE" type="date" value={form.startDate} onChange={v => updateField('startDate', v)} />
                  <FInput label="PAYMENT DATE" type="date" value={form.paymentDate} onChange={v => updateField('paymentDate', v)} />
                  <FInput label="EXPIRY DATE" type="date" value={form.expiryDate} onChange={v => updateField('expiryDate', v)} colSpan2 />
                </div>

                {/* Batch */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">Batch</p>
                  <div className="flex gap-2">
                    {['Morning', 'Evening', 'Flexible'].map(b => (
                      <button key={b} type="button" onClick={() => updateField('batch', b)}
                        className={`flex-1 py-2 rounded-xl border-2 text-[10px] font-black tracking-widest uppercase ${form.batch === b ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-white/5 bg-white/5 text-gray-500'}`}>
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">Payment</p>
                  <div className="flex gap-2">
                    {['Cash', 'UPI', 'Card'].map(m => (
                      <button key={m} type="button" onClick={() => updateField('paymentMethod', m)}
                        className={`flex-1 py-2 rounded-xl border-2 text-[10px] font-black tracking-widest uppercase ${form.paymentMethod === m ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-white/5 bg-white/5 text-gray-500'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <FInput label="PRICE (₹)" type="number" inputMode="numeric" value={form.price} onChange={v => updateField('price', v)} />
                  <FInput label="DISCOUNT (₹)" type="number" inputMode="numeric" value={form.discount} onChange={v => updateField('discount', v)} />
                  <FInput label="FINAL (₹)" type="number" value={form.final} readOnly />
                </div>
                <FInput label="DUE (₹)" type="number" inputMode="numeric" value={form.due} onChange={v => updateField('due', v)} />

                <div className="space-y-1">
                  <p className="text-[9px] font-black text-[var(--text-dim)] tracking-widest uppercase ml-1">NOTES</p>
                  <textarea
                    className="w-full glass-card bg-transparent p-3 text-sm outline-none text-[var(--text-main)] rounded-xl min-h-[70px] resize-none"
                    placeholder="Health conditions, goals..."
                    value={form.notes} onChange={e => updateField('notes', e.target.value)}
                  />
                </div>

                <button type="submit" className="w-full bg-orange-600 h-13 rounded-2xl font-black tracking-widest shadow-xl shadow-orange-600/20 text-white">
                  {editingMember ? 'SAVE CHANGES' : 'ENROLL NOW'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Image Source */}
      {showImageSource && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-6">
          <div className="bg-[var(--bg)] w-full max-w-xs rounded-3xl p-6 border border-[var(--card-border)] space-y-3">
            <h4 className="text-center font-bold text-sm text-[var(--text-dim)]">Photo Source</h4>
            <button onClick={startCamera} className="w-full bg-orange-600/20 text-orange-400 border border-orange-500/30 py-3 rounded-xl font-bold text-xs uppercase tracking-widest">📷 Take Photo</button>
            <button onClick={() => document.getElementById('galleryInput').click()} className="w-full bg-white/5 text-gray-300 border border-white/10 py-3 rounded-xl font-bold text-xs uppercase tracking-widest">🖼️ From Gallery</button>
            <button onClick={() => setShowImageSource(false)} className="w-full text-gray-500 font-bold text-xs uppercase tracking-widest py-2">Cancel</button>
          </div>
        </div>
      )}

      {/* Camera */}
      {showLiveCamera && (
        <div className="fixed inset-0 bg-black z-[70] flex flex-col">
          <div className="relative flex-1 overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-2 border-orange-500/60 rounded-full" />
            </div>
          </div>
          <div className="h-36 bg-[var(--bg)] flex items-center justify-around px-10">
            <button onClick={stopCamera} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center"><X size={22} /></button>
            <button onClick={capturePhoto} className="w-18 h-18 rounded-full border-4 border-orange-500 flex items-center justify-center p-1.5">
              <div className="w-full h-full bg-orange-500 rounded-full" />
            </button>
            <div className="w-12" />
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && selectedMember && (
        <div className="fixed inset-0 bg-black/95 z-[80] flex items-center justify-center p-4">
          <div className="bg-[#0f0f0f] w-full max-w-sm rounded-[32px] overflow-hidden border border-white/5 shadow-2xl relative">
            <button onClick={() => setShowProfile(false)} className="absolute top-5 right-5 z-10 w-9 h-9 glass-card flex items-center justify-center rounded-full text-orange-500 bg-orange-600/10">
              <X size={18} strokeWidth={3} />
            </button>
            <div className="h-56 bg-orange-600 relative overflow-hidden">
              {selectedMember.profileImage
                ? <img src={selectedMember.profileImage} className="w-full h-full object-cover" loading="lazy" />
                : <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-white/20">{selectedMember.name.charAt(0)}</div>
              }
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent" />
            </div>
            <div className="px-6 pb-8 -mt-12 relative">
              <h3 className="text-2xl font-bold syne">{selectedMember.name}</h3>
              <p className="text-orange-500 font-black tracking-widest text-[10px] uppercase mt-0.5">Member</p>
              <div className="grid grid-cols-2 gap-3 mt-6">
                {[
                  ['Plan', selectedMember.plan],
                  ['Batch', selectedMember.batch],
                  ['Expiry', selectedMember.expiryDate],
                  ['Phone', selectedMember.phone],
                ].map(([label, val]) => (
                  <div key={label} className="glass-card p-3">
                    <p className="text-[8px] text-[var(--text-dim)] font-black uppercase tracking-widest mb-0.5">{label}</p>
                    <p className="text-sm font-bold">{val}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 p-4 glass-card border-orange-500/20 bg-orange-500/5 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-[9px] text-orange-500/50 font-black uppercase tracking-widest">Fees</p>
                  <h4 className="text-lg font-bold syne text-orange-500">₹{selectedMember.final}</h4>
                </div>
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Check size={20} strokeWidth={3} className="text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Memoized card — won't re-render unless member data changes
const MemberCard = memo(function MemberCard({ member, onView, onEdit, onRenew, onDelete }) {
  const expiryDate = member.expiryDate ? new Date(member.expiryDate) : null;
  const diffDays   = expiryDate ? Math.ceil((expiryDate - new Date()) / 86400000) : null;
  const isExpired  = diffDays !== null && diffDays <= 0;

  return (
    <div className={`glass-card p-3.5 flex items-center gap-3 border-2 ${isExpired ? 'border-red-500/25 bg-red-500/4' : 'border-[var(--card-border)]'}`}>
      <div onClick={onView} className="w-12 h-12 bg-orange-600 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-lg overflow-hidden cursor-pointer shadow-lg shadow-orange-600/15">
        {member.profileImage
          ? <img src={member.profileImage} className="w-full h-full object-cover" loading="lazy" decoding="async" />
          : <span className="text-white">{member.name.charAt(0)}</span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p onClick={onView} className="font-bold text-sm text-[var(--text-main)] truncate cursor-pointer">{member.name}</p>
          <span className={`px-2 py-0.5 rounded-md text-[8px] font-black flex-shrink-0 ${isExpired ? 'bg-red-500 text-white' : 'bg-orange-500/10 text-orange-400'}`}>
            {isExpired ? 'EXPIRED' : `${diffDays}D`}
          </span>
        </div>
        <p className="text-xs text-[var(--text-dim)]">{member.phone}</p>
        <div className="flex gap-3 mt-2">
          <Btn label="EDIT"   icon={<Edit3 size={10} />}    color="text-orange-500"  onClick={onEdit}   />
          <Btn label="RENEW"  icon={<RefreshCcw size={10} />} color="text-emerald-500" onClick={onRenew}  />
          <Btn label="REMOVE" icon={<Trash2 size={10} />}   color="text-red-500"     onClick={onDelete} />
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[10px] text-gray-500 font-bold">{member.plan}</p>
        <p className="text-sm font-black text-orange-400">₹{member.final}</p>
      </div>
    </div>
  );
});

function Btn({ label, icon, color, onClick }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ${color}`}>
      {icon} {label}
    </button>
  );
}

function FInput({ label, value, onChange, colSpan2, ...props }) {
  return (
    <div className={`space-y-1 ${colSpan2 ? 'col-span-2' : ''}`}>
      <p className="text-[9px] font-black text-[var(--text-dim)] tracking-widest uppercase ml-1">{label}</p>
      <input
        className="w-full glass-card bg-transparent p-3 text-sm outline-none text-[var(--text-main)] rounded-xl"
        value={value} onChange={e => onChange?.(e.target.value)} {...props}
      />
    </div>
  );
}

function FSelect({ label, options, value, onChange }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-black text-[var(--text-dim)] tracking-widest uppercase ml-1">{label}</p>
      <select
        className="w-full glass-card bg-[var(--card-bg)] p-3 text-sm outline-none text-[var(--text-main)] appearance-none rounded-xl"
        value={value} onChange={e => onChange(e.target.value)}
      >
        {options.map(o => <option key={o} value={o} className="bg-[var(--bg)]">{o}</option>)}
      </select>
    </div>
  );
}
