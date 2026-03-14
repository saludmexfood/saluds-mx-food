'use client';

import { useEffect, useState } from 'react';
import { createCustomer, deleteCustomer, getCustomers } from '../../src/lib/api';

interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  sms_opt_in: boolean;
  email_opt_in: boolean;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState({ name: '', phone: '', email: '', sms_opt_in: true, email_opt_in: true });
  const [status, setStatus] = useState('');

  async function load() {
    const res = await getCustomers();
    if (res.ok) setCustomers(res.data as Customer[]);
  }

  useEffect(() => {
    if (!localStorage.getItem('access_token')) window.location.href = '/login';
    load();
  }, []);

  async function addCustomer() {
    const res = await createCustomer(form);
    if (!res.ok) return setStatus('Unable to add customer.');
    setStatus('Customer added.');
    setForm({ name: '', phone: '', email: '', sms_opt_in: true, email_opt_in: true });
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
        <label>Name <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Phone number <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label>Email <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label><input type="checkbox" checked={form.sms_opt_in} onChange={(e) => setForm({ ...form, sms_opt_in: e.target.checked })} /> SMS opt-in</label>
        <label><input type="checkbox" checked={form.email_opt_in} onChange={(e) => setForm({ ...form, email_opt_in: e.target.checked })} /> Email opt-in</label>
        <button onClick={addCustomer}>Add new customer</button>
        {status && <p className="centered-text muted">{status}</p>}
      </section>

      <section className="glass liquid-glass panel stack">
        <h3 className="centered-text">Customer list (including order-collected contacts)</h3>
        {customers.map((customer) => (
          <div key={customer.id} className="row-wrap">
            <span>{customer.name} · {customer.phone} · {customer.email || 'No email'} · SMS {customer.sms_opt_in ? 'IN' : 'OUT'} · Email {customer.email_opt_in ? 'IN' : 'OUT'}</span>
            <button onClick={() => removeCustomer(customer.id)}>Delete customer</button>
          </div>
        ))}
        {customers.length === 0 && <p className="centered-text">No customers yet.</p>}
      </section>
    </main>
  );
}
