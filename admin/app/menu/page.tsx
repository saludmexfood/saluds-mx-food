'use client';

import { useEffect, useMemo, useState } from 'react';
import { createMenuItem, createMenuWeek, getMenuWeeks, getWeekItems, updateMenuWeek } from '../../src/lib/api';

type WeekStatus = 'OPEN' | 'CLOSED';
interface MenuWeek { id:number; selling_days:string; status:WeekStatus; published:boolean; starts_at:string }
interface MenuItem { id:number; name:string; description?:string; photo_url?:string; price_cents:number; available:boolean }

const BASE_PRESETS = [
  { name: 'Enchiladas Verdes', description: 'Plate with rice and beans', price_dollars: '10.00', photo_url: '/static/menu_photos/enchiladas-verdes.svg', category: 'food' },
  { name: 'Flan', description: 'Classic caramel flan', price_dollars: '6.00', photo_url: '/static/menu_photos/placeholder.svg', category: 'dessert' },
  { name: 'Tres Leches Cake', description: 'Creamy milk cake slice', price_dollars: '5.50', photo_url: '/static/menu_photos/placeholder.svg', category: 'dessert' }
];

const dollars = (c:number)=>`$${(c/100).toFixed(2)}`;
const cents = (s:string)=>Math.round(Number(s||0)*100);

export default function MenuPage(){
  const [weeks,setWeeks]=useState<MenuWeek[]>([]); const [selectedWeekId,setSelectedWeekId]=useState<number|''>('');
  const [items,setItems]=useState<MenuItem[]>([]); const [err,setErr]=useState(''); const [status,setStatus]=useState('');
  const [weekForm,setWeekForm]=useState({starts_at:''});
  const [itemForm,setItemForm]=useState({name:'',description:'',photo_url:'/static/menu_photos/placeholder.svg',price_dollars:'',available:true});
  const [presets, setPresets] = useState(BASE_PRESETS);

  const selectedWeek = useMemo(()=>weeks.find(w=>w.id===selectedWeekId),[weeks,selectedWeekId]);

  async function loadWeeks(){ const res=await getMenuWeeks(); if(!res.ok) throw new Error('Failed to load weeks'); setWeeks(res.data as MenuWeek[]); }
  async function loadItems(weekId:number){ const res=await getWeekItems(weekId); if(!res.ok) throw new Error('Failed to load items'); setItems(res.data as MenuItem[]); }

  useEffect(()=>{
    if(!localStorage.getItem('access_token')) window.location.href='/login';
    loadWeeks().catch(e=>setErr(String(e)));
    const localPresets = localStorage.getItem('salud_menu_presets');
    if (localPresets) setPresets(JSON.parse(localPresets));
  },[]);
  useEffect(()=>{ if(selectedWeekId) loadItems(Number(selectedWeekId)).catch(e=>setErr(String(e))); else setItems([]); },[selectedWeekId]);

  async function createWeek(){
    if(!weekForm.starts_at) return setErr('Date is required.');
    const payload = { selling_days: 'Fridays', status:'OPEN', published:false, starts_at: new Date(`${weekForm.starts_at}T00:00:00`).toISOString() };
    setErr(''); const res=await createMenuWeek(payload);
    if(!res.ok) return setErr(`Could not create week: ${(res.data as any)?.detail || 'Invalid request'}`);
    await loadWeeks(); setSelectedWeekId(res.data.id); setStatus('Week posted draft is ready.');
  }

  async function addItem(){
    if(!selectedWeekId) return setErr('Select a week first.');
    const payload={menu_week_id:Number(selectedWeekId),name:itemForm.name,description:itemForm.description,photo_url:itemForm.photo_url,price_cents:cents(itemForm.price_dollars),available:itemForm.available};
    const res=await createMenuItem(payload); if(!res.ok) return setErr('Could not create item');
    const saved = [{ name: itemForm.name, description: itemForm.description, price_dollars: itemForm.price_dollars, photo_url: itemForm.photo_url, category: 'food' }, ...presets];
    setPresets(saved);
    localStorage.setItem('salud_menu_presets', JSON.stringify(saved));
    setItemForm({name:'',description:'',photo_url:'/static/menu_photos/placeholder.svg',price_dollars:'',available:true});
    await loadItems(Number(selectedWeekId));
  }

  async function togglePublish(next:boolean){
    if(!selectedWeekId) return;
    if(next){ for(const week of weeks.filter(w=>w.published && w.id!==selectedWeekId)){ await updateMenuWeek(week.id,{published:false}); } }
    await updateMenuWeek(Number(selectedWeekId),{published:next}); await loadWeeks();
  }

  function handleUpload(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setItemForm((prev) => ({ ...prev, photo_url: String(reader.result || prev.photo_url) }));
    reader.readAsDataURL(file);
  }

  function sendMenuPlaceholder() {
    const queue = JSON.parse(localStorage.getItem('salud_menu_send_queue') || '[]');
    queue.push({ week_id: selectedWeekId || null, created_at: new Date().toISOString() });
    localStorage.setItem('salud_menu_send_queue', JSON.stringify(queue));
    setStatus('Menu send queued. SMS/email sending will be enabled when integrations are connected.');
  }

  return <main className="stack">
    <h1 className="page-title centered-text">Menu Management</h1>{err && <p className="err centered-text">{err}</p>}
    {status && <p className="muted centered-text">{status}</p>}
    <div className="twocol menu-grid">
      <section className="glass liquid-glass panel stack">
        <h3 className="centered-text">Which day will the food be ready?</h3>
        <label>Date picker <input type="date" value={weekForm.starts_at} onChange={e=>setWeekForm({...weekForm,starts_at:e.target.value})}/></label>

        <h3 className="centered-text">Add Item</h3>
        <label>Food for this week <input value={itemForm.name} onChange={e=>setItemForm({...itemForm,name:e.target.value})}/></label>
        <label>Description <textarea rows={2} value={itemForm.description} placeholder="What ingredients/sides are in the Food for this week" onChange={e=>setItemForm({...itemForm,description:e.target.value})}/></label>
        <label>Price ($) <input value={itemForm.price_dollars} onChange={e=>setItemForm({...itemForm,price_dollars:e.target.value})}/></label>
        <label>Upload image file <input type="file" accept="image/*" onChange={e=>handleUpload(e.target.files?.[0])}/></label>
        <label>Take a picture <input type="file" accept="image/*" capture="environment" onChange={e=>handleUpload(e.target.files?.[0])}/></label>

        <div className="stack">
          <button className="primary pill-btn" onClick={addItem}>Add item to week</button>
          <button className="primary pill-btn" onClick={createWeek}>Post Menu</button>
          <button className="pill-btn" onClick={sendMenuPlaceholder}>Send Menu</button>
        </div>

        <h3 className="centered-text">Select Week</h3>
        <select value={selectedWeekId} onChange={e=>setSelectedWeekId(Number(e.target.value) || '')}>
          <option value="">Choose a week</option>
          {weeks.map(w=><option key={w.id} value={w.id}>#{w.id} · {new Date(w.starts_at).toLocaleDateString()}</option>)}
        </select>
        {selectedWeek && <p className="centered-text"><span className="badge">{selectedWeek.published ? 'Published' : 'Draft'}</span> <button onClick={()=>togglePublish(!selectedWeek.published)}>{selectedWeek.published?'Unpublish':'Publish'} Week</button></p>}

        <h4 className="centered-text">Quick presets (food + dessert)</h4>
        <div className="preset-wrap">
          {presets.map((preset)=><button key={`${preset.name}-${preset.price_dollars}`} onClick={()=>setItemForm({name:preset.name,description:preset.description,price_dollars:preset.price_dollars,photo_url:preset.photo_url,available:true})}>{preset.name} · ${preset.price_dollars}</button>)}
        </div>
      </section>

      <section className="glass liquid-glass panel">
        <h3 className="centered-text">Live Preview</h3>
        <div className="preview-card glass liquid-glass">
          <h4 className="centered-text">This Week&apos;s Menu</h4>
          <p className="centered-text muted">{selectedWeek ? new Date(selectedWeek.starts_at).toLocaleDateString() : 'Select a week to preview'}</p>
          {(items || []).map(item=><div key={item.id} className="preview-item"><span>{item.name} {!item.available && '(hidden)'}</span><strong>{dollars(item.price_cents)}</strong></div>)}
          {!items.length && <p className="centered-text">No items yet.</p>}
        </div>
      </section>
    </div>
  </main>
}
