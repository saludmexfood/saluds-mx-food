'use client';

import { useEffect, useState } from 'react';
import { createCustomer, deleteCustomer, getCustomers, updateCustomer } from '../../src/lib/api';

interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  zip_code?: string | null;
  additional_phones: string[];
  additional_emails: string[];
  sms_opt_in: boolean;
  email_opt_in: boolean;
}

const blank = { name: '', phone: '', email: '', address: '', city: '', zip_code: '', additional_phones: [] as string[], additional_emails: [] as string[], sms_opt_in: true, email_opt_in: true };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<Record<number, Customer>>({});
  const [status, setStatus] = useState('');

  async function load() {
    const res = await getCustomers();
    if (res.ok) setCustomers(res.data as Customer[]);
  }

  useEffect(() => { if (!localStorage.getItem('access_token')) window.location.href = '/login'; load(); }, []);

  async function addCustomer() {
    const res = await createCustomer(form);
    if (!res.ok) return setStatus('Unable to add customer.');
    setStatus('Customer added.');
    setForm(blank);
    load();
  }

  async function saveCustomer(id: number) {
    const res = await updateCustomer(id, editing[id]);
    if (!res.ok) return setStatus('Unable to edit customer.');
    setStatus('Customer updated.');
    setEditing((prev) => { const next = { ...prev }; delete next[id]; return next; });
    load();
  }

  async function removeCustomer(id: number) {
    const res = await deleteCustomer(id);
    if (!res.ok) return setStatus('Unable to delete customer.');
    setStatus('Customer removed.');
    load();
  }

  return (
    <main className="stack">
      <section className="glass liquid-glass panel stack">
        <h1 className="page-title centered-text">Customers</h1>
        <div className="grid-form">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Street address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input placeholder="ZIP code" value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} />
        </div>
        <div className="row-wrap">
          <label><input type="checkbox" checked={form.sms_opt_in} onChange={(e) => setForm({ ...form, sms_opt_in: e.target.checked })} /> SMS opt-in</label>
          <label><input type="checkbox" checked={form.email_opt_in} onChange={(e) => setForm({ ...form, email_opt_in: e.target.checked })} /> Email opt-in</label>
          <button onClick={addCustomer}>Add new customer</button>
        </div>
        {status && <p className="centered-text muted">{status}</p>}
      </section>

      <section className="glass liquid-glass panel stack">
        <h3 className="centered-text">Customer list (including order-collected contacts)</h3>
        {customers.map((customer) => {
          const draft = editing[customer.id] || customer;
          return (
            <div key={customer.id} className="glass liquid-glass panel stack">
              <div className="grid-form">
                <input value={draft.name} onChange={(e) => setEditing({ ...editing, [customer.id]: { ...draft, name: e.target.value } })} />
                <input value={draft.phone} onChange={(e) => setEditing({ ...editing, [customer.id]: { ...draft, phone: e.target.value } })} />
                <input value={draft.email || ''} onChange={(e) => setEditing({ ...editing, [customer.id]: { ...draft, email: e.target.value } })} />
                <input value={draft.address || ''} onChange={(e) => setEditing({ ...editing, [customer.id]: { ...draft, address: e.target.value } })} placeholder="Address" />
                <input value={draft.city || ''} onChange={(e) => setEditing({ ...editing, [customer.id]: { ...draft, city: e.target.value } })} placeholder="City" />
                <input value={draft.zip_code || ''} onChange={(e) => setEditing({ ...editing, [customer.id]: { ...draft, zip_code: e.target.value } })} placeholder="ZIP" />
              </div>
              <input placeholder="Additional phone numbers (comma separated)" value={draft.additional_phones?.join(', ') || ''} onChange={(e) => setEditing({ ...editing, [customer.id]: { ...draft, additional_phones: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) } })} />
              <input placeholder="Additional emails (comma separated)" value={draft.additional_emails?.join(', ') || ''} onChange={(e) => setEditing({ ...editing, [customer.id]: { ...draft, additional_emails: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) } })} />
              <div className="row-wrap">
                <label><input type="checkbox" checked={draft.sms_opt_in} onChange={(e) => setEditing({ ...editing, [customer.id]: { ...draft, sms_opt_in: e.target.checked } })} /> SMS opt-in</label>
                <label><input type="checkbox" checked={draft.email_opt_in} onChange={(e) => setEditing({ ...editing, [customer.id]: { ...draft, email_opt_in: e.target.checked } })} /> Email opt-in</label>
                <button onClick={() => saveCustomer(customer.id)}>Edit</button>
                <button onClick={() => removeCustomer(customer.id)}>Delete customer</button>
              </div>
            </div>
          );
        })}
        {customers.length === 0 && <p className="centered-text">No customers yet.</p>}
      </section>
    </main>
  );
}
