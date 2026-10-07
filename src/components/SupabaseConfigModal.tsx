import React, { useState } from 'react';
import { X, Database, Check, Copy, ExternalLink, ShieldCheck, RefreshCw, Code2 } from 'lucide-react';
import { getStoredSupabaseConfig, saveSupabaseConfig, DEFAULT_SUPABASE_KEY } from '../lib/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ isOpen, onClose }) => {
  const currentConfig = getStoredSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [key, setKey] = useState(currentConfig.key || DEFAULT_SUPABASE_KEY);
  const [saved, setSaved] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(url, key);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      window.location.reload();
    }, 1000);
  };

  const sqlCode = `-- 1. جدول الفعاليات
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id TEXT NOT NULL DEFAULT 'org-default',
    organizer_name TEXT NOT NULL,
    title TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'entertainment',
    venue_name TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    logo_url TEXT,
    banner_url TEXT,
    total_capacity INTEGER NOT NULL DEFAULT 100,
    status TEXT NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. جدول فئات التذاكر
CREATE TABLE IF NOT EXISTS public.ticket_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    capacity INTEGER NOT NULL DEFAULT 50,
    sold_count INTEGER NOT NULL DEFAULT 0,
    perks JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. جدول التذاكر الصادرة
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_code TEXT NOT NULL UNIQUE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    tier_name TEXT NOT NULL,
    event_title TEXT NOT NULL,
    event_date TIMESTAMPTZ NOT NULL,
    event_venue TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    buyer_phone TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'valid',
    checked_in_at TIMESTAMPTZ,
    checked_in_by TEXT,
    qr_data TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-5 sm:p-6 my-auto text-slate-100 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">إعدادات قاعدة بيانات Supabase</h2>
              <p className="text-xs text-slate-400">ربط المنصة وحفظ التذاكر والفعاليات سحابياً</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="py-4 space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 text-xs text-emerald-300 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">المفتاح النشط (Publishable Key):</div>
              <div className="font-mono text-[11px] text-emerald-200 break-all mt-0.5">
                {DEFAULT_SUPABASE_KEY}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              رابط المشروع السحابي (Supabase Project URL):
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzprojectref.supabase.co"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono text-left"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              * في حال لم يتم إدخال الرابط، تعمل المنصة بكامل وظائفها التفاعلية والتخزين المحلي الموثوق تلقائياً.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              مفتاح النشر (Publishable Key / Anon Key):
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sb_publishable_..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono text-left"
            />
          </div>

          {/* SQL Schema Preview & Copy */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-indigo-400" />
                مخطط الجداول (SQL Schema):
              </span>
              <button
                type="button"
                onClick={copySqlToClipboard}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-bold"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSql ? 'تم نسخ SQL' : 'نسخ كود SQL'}
              </button>
            </div>
            <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-300 font-mono overflow-x-auto max-h-36">
              {sqlCode}
            </pre>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
            >
              {saved ? <Check className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
              <span>{saved ? 'تم الحفظ وإعادة التحميل!' : 'حفظ الإعدادات وتحديث الاتصال'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
