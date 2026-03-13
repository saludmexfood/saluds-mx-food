'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Locale, copy } from '../lib/public-content';

const CHATBOT_ENDPOINT = process.env.NEXT_PUBLIC_CHATBOT_ENDPOINT || '';

type Message = { role: 'user' | 'bot'; text: string };

export default function PublicShell({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');
  const [chatOpen, setChatOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [socialOpen, setSocialOpen] = useState(false);
  const t = copy[locale];

  useEffect(() => {
    const saved = window.localStorage.getItem('salud_locale');
    if (saved === 'en' || saved === 'es') setLocale(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('salud_locale', locale);
  }, [locale]);

  useEffect(() => {
    const updatePointer = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth) * 100;
      const y = (event.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty('--pointer-x', `${x.toFixed(2)}%`);
      document.documentElement.style.setProperty('--pointer-y', `${y.toFixed(2)}%`);
    };
    window.addEventListener('pointermove', updatePointer, { passive: true });
    return () => window.removeEventListener('pointermove', updatePointer);
  }, []);

  const helper = useMemo(
    () =>
      locale === 'en'
        ? 'Hi! I can help with menu items, ingredients, ordering, pickup/delivery, and contact info.'
        : '¡Hola! Te ayudo con el menú, ingredientes, pedidos, entrega/recoger y contacto.',
    [locale]
  );

  async function sendMessage() {
    const question = input.trim();
    if (!question) return;
    setInput('');
    const lower = question.toLowerCase();
    const relevant = ['menu', 'ingredient', 'order', 'pickup', 'delivery', 'contact', 'hours', 'menú', 'pedido', 'horario'];
    const focused = relevant.some((k) => lower.includes(k));
    const response = focused
      ? helper
      : locale === 'en'
        ? "I can best help with Salud's menu, orders, pickup, delivery, and contact details."
        : 'Te puedo ayudar mejor con el menú, pedidos, entrega, recoger y contacto de Salud.';

    setMessages((prev) => [...prev, { role: 'user', text: question }, { role: 'bot', text: response }]);

    const payload = { question, locale, created_at: new Date().toISOString() };
    if (!CHATBOT_ENDPOINT) {
      const pending = JSON.parse(window.localStorage.getItem('salud_chat_requests') || '[]');
      pending.push(payload);
      window.localStorage.setItem('salud_chat_requests', JSON.stringify(pending));
      return;
    }

    try {
      const res = await fetch(CHATBOT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const pending = JSON.parse(window.localStorage.getItem('salud_chat_requests') || '[]');
        pending.push(payload);
        window.localStorage.setItem('salud_chat_requests', JSON.stringify(pending));
      }
    } catch {
      const pending = JSON.parse(window.localStorage.getItem('salud_chat_requests') || '[]');
      pending.push(payload);
      window.localStorage.setItem('salud_chat_requests', JSON.stringify(pending));
    }
  }

  return (
    <div className="public-bg">
      <div className="bg-overlay" />
      <div className="bg-noise" />
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="orb orb-c" />
      <div className="orbital-ring orbital-1" />
      <div className="orbital-ring orbital-2" />

      <header className="top-nav glass liquid-glass">
        <p className="wordmark">{t.wordmark}</p>
        <nav>
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
        </nav>
        <button className="locale-toggle" onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}>
          {locale.toUpperCase()} / {locale === 'en' ? 'ES' : 'EN'}
        </button>
      </header>
      {children}

      <footer className="glass liquid-glass site-footer">
        <p>{t.disclaimer}</p>
        <div className={`social-orbit ${socialOpen ? 'open' : ''}`}>
          <button className="orbit-toggle" onClick={() => setSocialOpen((v) => !v)} aria-label="Toggle contact options">◎</button>
          <a href="https://instagram.com" target="_blank" rel="noreferrer">IG</a>
          <a href="https://facebook.com" target="_blank" rel="noreferrer">FB</a>
          <a href="https://wa.me/16202621073" target="_blank" rel="noreferrer">WA</a>
          <a href="tel:+16202621073">Call</a>
          <a href="sms:+16202621073">SMS</a>
          <a href="mailto:parrasalud@gmail.com">Email</a>
        </div>
      </footer>

      <button className={`chat-launcher glass liquid-glass ${chatOpen ? '' : 'attract'}`} onClick={() => setChatOpen((v) => !v)} aria-label="Toggle Salud's Helper">
        {chatOpen ? '×' : '✦'}
      </button>
      {chatOpen && (
        <aside className="chat-panel glass liquid-glass">
          <h3>{t.chatTitle}</h3>
          <p>{t.chatNudge}</p>
          <div className="chat-messages">
            {messages.map((m, idx) => (
              <p key={idx} className={m.role === 'user' ? 'user' : 'bot'}>{m.text}</p>
            ))}
          </div>
          <div className="chat-input-row">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.chatPlaceholder} />
            <button onClick={sendMessage}>Send</button>
          </div>
        </aside>
      )}
    </div>
  );
}
