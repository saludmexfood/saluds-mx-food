'use client';

import { useEffect, useMemo, useState } from 'react';
import { createMenuItem, createMenuWeek, getMenuWeeks, getWeekItems, updateMenuItem, updateMenuWeek } from '../../src/lib/api';

type WeekStatus = 'OPEN' | 'CLOSED';
interface MenuWeek { id:number; selling_days:string; status:WeekStatus; published:boolean; starts_at:string }
interface MenuItem { id:number; name:string; description?:string; photo_url?:string; price_cents:number; available:boolean }

const PRESETS = [
  ['Flan', 'Classic caramel flan', '6.00', '/static/menu_photos/placeholder.svg'],
  ['Mini Cakes', 'Assorted mini cakes', '4.50', '/static/menu_photos/placeholder.svg'],
  ['Enchiladas Verdes', 'Plate with rice and beans', '10.00', '/static/menu_photos/enchiladas-verdes.svg']
];

const dollars = (c:number)=>`$${(c/100).toFixed(2)}`;
const cents = (s:string)=>Math.round(Number(s||0)*100);

export default function MenuPage(){
  const [weeks,setWeeks]=useState<MenuWeek[]>([]); const [selectedWeekId,setSelectedWeekId]=useState<number|''>('');
  const [items,setItems]=useState<MenuItem[]>([]); const [err,setErr]=useState('');
  const [weekForm,setWeekForm]=useState({starts_at:'',selling_days:'Fridays',status:'OPEN' as WeekStatus,published:false});
  const [itemForm,setItemForm]=useState({name:'',description:'',photo_url:'/static/menu_photos/placeholder.svg',price_dollars:'',available:true});

  const selectedWeek = useMemo(()=>weeks.find(w=>w.id===selectedWeekId),[weeks,selectedWeekId]);
  const publishedWeek = useMemo(()=>weeks.find(w=>w.published),[weeks]);

  const ensureAuth = ()=>{ if(!localStorage.getItem('access_token')) window.location.href='/login'; };
  async function loadWeeks(){ const res=await getMenuWeeks(); if(!res.ok) throw new Error('Failed to load weeks'); setWeeks(res.data as MenuWeek[]); }
  async function loadItems(weekId:number){ const res=await getWeekItems(weekId); if(!res.ok) throw new Error('Failed to load items'); setItems(res.data as MenuItem[]); }

  useEffect(()=>{ ensureAuth(); loadWeeks().catch(e=>setErr(String(e))); },[]);
  useEffect(()=>{ if(selectedWeekId) loadItems(Number(selectedWeekId)).catch(e=>setErr(String(e))); else setItems([]); },[selectedWeekId]);

  async function createWeek(){
    if(!weekForm.starts_at) return setErr('Start date is required.');
    const payload = { ...weekForm, starts_at: new Date(`${weekForm.starts_at}T00:00:00`).toISOString() };
    setErr(''); const res=await createMenuWeek(payload); if(!res.ok) return setErr(`Could not create week: ${(res.data as any)?.detail || 'Invalid request'}`); await loadWeeks(); setSelectedWeekId(res.data.id);
  }

  async function addItem(){
    if(!selectedWeekId) return setErr('Select a week first.');
    const payload={menu_week_id:Number(selectedWeekId),name:itemForm.name,description:itemForm.description,photo_url:itemForm.photo_url,price_cents:cents(itemForm.price_dollars),available:itemForm.available};
    const res=await createMenuItem(payload); if(!res.ok) return setErr('Could not create item');
    setItemForm({name:'',description:'',photo_url:'/static/menu_photos/placeholder.svg',price_dollars:'',available:true});
    await loadItems(Number(selectedWeekId));
  }

  async function togglePublish(next:boolean){
    if(!selectedWeekId) return;
    if(next){ for(const week of weeks.filter(w=>w.published && w.id!==selectedWeekId)){ await updateMenuWeek(week.id,{published:false}); } }
    await updateMenuWeek(Number(selectedWeekId),{published:next}); await loadWeeks();
  }

  async function updateItem(item:MenuItem){
    const name = prompt('Item name', item.name) || item.name;
    await updateMenuItem(item.id,{name});
    await loadItems(Number(selectedWeekId));
  }

  function handleUpload(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setItemForm((prev) => ({ ...prev, photo_url: String(reader.result || prev.photo_url) }));
    reader.readAsDataURL(file);
  }

  return <main>
    <h1 className="page-title">Menu Management</h1>{err && <p className="err">{err}</p>}
    <div className="twocol">
      <section className="glass liquid-glass panel stack orbit-panel">
        <h3>Create Week</h3>
        <label>Starts at <input type="date" value={weekForm.starts_at} onChange={e=>setWeekForm({...weekForm,starts_at:e.target.value})}/></label>
        <label>Selling days <input value={weekForm.selling_days} onChange={e=>setWeekForm({...weekForm,selling_days:e.target.value})}/></label>
        <label>Status <select value={weekForm.status} onChange={e=>setWeekForm({...weekForm,status:e.target.value as WeekStatus})}><option>OPEN</option><option>CLOSED</option></select></label>
        <label><input type="checkbox" checked={weekForm.published} onChange={e=>setWeekForm({...weekForm,published:e.target.checked})}/> Publish week now</label>
        <button className="primary" onClick={createWeek}>Create week</button>

        <h3>Select Week</h3>
        <select value={selectedWeekId} onChange={e=>setSelectedWeekId(Number(e.target.value) || '')}>
          <option value="">Choose a week</option>
          {weeks.map(w=><option key={w.id} value={w.id}>#{w.id} · {new Date(w.starts_at).toLocaleDateString()} · {w.selling_days}</option>)}
        </select>
        {selectedWeek && <p><span className="badge">{selectedWeek.published ? 'Published' : 'Draft'}</span> <button onClick={()=>togglePublish(!selectedWeek.published)}>{selectedWeek.published?'Unpublish':'Publish'} Week</button></p>}

        <h3>Add Item</h3>
        <div className="stack">
          <label>Name <input value={itemForm.name} onChange={e=>setItemForm({...itemForm,name:e.target.value})}/></label>
          <label>Description <textarea rows={2} value={itemForm.description} onChange={e=>setItemForm({...itemForm,description:e.target.value})}/></label>
          <label>Price ($) <input value={itemForm.price_dollars} onChange={e=>setItemForm({...itemForm,price_dollars:e.target.value})}/></label>
          <label>Preset image URL <input value={itemForm.photo_url} onChange={e=>setItemForm({...itemForm,photo_url:e.target.value})}/></label>
          <label>Upload image <input type="file" accept="image/*" onChange={e=>handleUpload(e.target.files?.[0])}/></label>
          <label><input type="checkbox" checked={itemForm.available} onChange={e=>setItemForm({...itemForm,available:e.target.checked})}/> Available</label>
          <button className="primary" onClick={addItem}>Create item</button>
        </div>

        <h4>Quick presets</h4>
        <div className="stack">
          {PRESETS.map(([name,description,price_dollars,photo_url])=><button key={name} onClick={()=>setItemForm({name,description,price_dollars,photo_url,available:true})}>{name} · ${price_dollars}</button>)}
        </div>
      </section>

      <section className="glass liquid-glass panel">
        <h3>Live Preview {publishedWeek ? <span className="badge">Public week #{publishedWeek.id}</span> : <span className="badge">No published week</span>}</h3>
        <div className="preview-card glass liquid-glass">
          <h4>This Week's Menu</h4>
          <p>{selectedWeek?.selling_days || 'Fridays'}</p>
          {(items || []).map(item=><div key={item.id} className="preview-item"><span>{item.name} {!item.available && '(hidden)'}</span><strong>{dollars(item.price_cents)}</strong><button onClick={()=>updateItem(item)}>Edit</button></div>)}
          {!items.length && <p>No items yet.</p>}
        </div>
      </section>
    </div>
  </main>
}
