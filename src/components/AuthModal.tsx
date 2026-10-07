import React, { useState } from 'react';
import { X, Lock, Mail, User, Building, Phone, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { Organizer } from '../types';
import { dbService, getLocalOrganizers } from '../lib/database';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (organizer: Organizer) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const demoOrganizers = getLocalOrganizers();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const org = await dbService.loginOrganizer(email, password);
      if (org) {
        onSuccess(org);
        onClose();
      } else {
        setError('البريد الإلكتروني غير مسجل، أو يمكنك اختيار حساب تجريبي أدناه.');
      }
    } catch {
      setError('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const newOrg = await dbService.registerOrganizer({
        name,
        organization_name: organizationName,
        email,
        phone,
        logo_url: '/logo.png',
      });
      onSuccess(newOrg);
      onClose();
    } catch {
      setError('حدث خطأ أثناء إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  const selectDemoAccount = (org: Organizer) => {
    dbService.loginOrganizer(org.email);
    onSuccess(org);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 text-slate-100 my-auto">
        {/* Header with Logo */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="TikTak Logo" className="w-10 h-10 object-contain" />
            <div>
              <h2 className="text-lg font-black text-white">
                {mode === 'login' ? 'بوابة دخول المنظمين' : 'تسجيل منظم جديد'}
              </h2>
              <p className="text-xs text-slate-400">إدارة الفعاليات وطرق الدفع والماسح</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-950 p-1 rounded-2xl my-4 border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-xl transition ${
              mode === 'login' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-2 rounded-xl transition ${
              mode === 'register' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            إنشاء حساب منظم
          </button>
        </div>

        {error && (
          <div className="p-3 mb-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                البريد الإلكتروني:
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@organization.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                كلمة المرور:
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2"
            >
              <span>{loading ? 'جاري التحقق...' : 'دخول إلى لوحة التحكم'}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-indigo-400" />
                اسم المنشأة / الجهة المنظمة:
              </label>
              <input
                type="text"
                required
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="مثال: مؤسسة قمة الفعاليات"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                اسم المسؤول:
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="الاسم الثلاثي"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                البريد الإلكتروني:
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="org@domain.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-indigo-400" />
                رقم الجوال:
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+966 5X XXX XXXX"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                كلمة المرور:
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2 mt-2"
            >
              <span>{loading ? 'جاري الإنشاء...' : 'تسجيل وتفعيل حساب المنظم'}</span>
              <Sparkles className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Demo Organizer Switcher */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <div className="text-[11px] text-slate-400 font-bold mb-2">⚡ تجربة سريعة بحساب منظم جاهز:</div>
          <div className="space-y-1.5">
            {demoOrganizers.map((org) => (
              <button
                key={org.id}
                type="button"
                onClick={() => selectDemoAccount(org)}
                className="w-full text-right p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700/80 hover:border-indigo-500/50 text-slate-200 flex items-center justify-between text-xs transition"
              >
                <div>
                  <div className="font-bold text-white">{org.organization_name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{org.email}</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  دخول فوري
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
