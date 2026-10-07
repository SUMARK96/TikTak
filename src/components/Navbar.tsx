import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  LogIn,
  UserPlus,
  Calendar,
  ChevronDown,
  Sparkles,
  LayoutDashboard,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Organizer } from '../types';

interface NavbarProps {
  currentTab: 'events' | 'organizer';
  onSelectTab: (tab: 'events' | 'organizer') => void;
  onOpenAuthModal: (mode?: 'login' | 'register') => void;
  currentOrganizer: Organizer | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenAuthModal,
  currentOrganizer,
  onLogout,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNavigateToEvents = () => {
    onSelectTab('events');
    setIsDropdownOpen(false);
  };

  const handleOrganizerLogin = () => {
    setIsDropdownOpen(false);
    onOpenAuthModal('login');
  };

  const handleOrganizerRegister = () => {
    setIsDropdownOpen(false);
    onOpenAuthModal('register');
  };

  const handleOrganizerDashboard = () => {
    setIsDropdownOpen(false);
    onSelectTab('organizer');
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
        {/* Brand Logo & Platform Name */}
        <div
          onClick={handleNavigateToEvents}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <div className="h-10 sm:h-12 w-auto flex items-center justify-center">
            <img
              src="/logo.png"
              alt="TikTak"
              className="h-9 sm:h-11 w-auto object-contain group-hover:scale-105 transition duration-300"
            />
          </div>
        </div>

        {/* Header Navigation with Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3" ref={dropdownRef}>
          {/* Main Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-100 border border-slate-700/80 hover:border-indigo-500/50 shadow-lg text-xs sm:text-sm font-bold transition active:scale-95"
              aria-expanded={isDropdownOpen}
            >
              <Menu className="w-4 h-4 text-indigo-400" />
              <span>القائمة</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180 text-indigo-400' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu Modal / Popover */}
            {isDropdownOpen && (
              <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 sm:w-80 bg-slate-900/95 border border-slate-700/90 rounded-3xl shadow-2xl backdrop-blur-xl p-2.5 z-50 animate-fadeIn space-y-1.5">
                {/* 1. الفعاليات */}
                <button
                  type="button"
                  onClick={handleNavigateToEvents}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl text-right transition ${
                    currentTab === 'events'
                      ? 'bg-indigo-600/15 border border-indigo-500/40 text-white'
                      : 'hover:bg-slate-800/80 text-slate-200'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-xs sm:text-sm text-white">الفعاليات</div>
                    <div className="text-[11px] text-slate-400">استكشاف وحجز تذاكر جميع الفعاليات</div>
                  </div>
                </button>

                {/* If Organizer is logged in */}
                {currentOrganizer ? (
                  <>
                    <button
                      type="button"
                      onClick={handleOrganizerDashboard}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl text-right transition ${
                        currentTab === 'organizer'
                          ? 'bg-emerald-600/15 border border-emerald-500/40 text-white'
                          : 'hover:bg-slate-800/80 text-slate-200'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <LayoutDashboard className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-xs sm:text-sm text-white">لوحة المنظم ({currentOrganizer.organization_name})</div>
                        <div className="text-[11px] text-slate-400">إدارة فعالياتك، التذاكر، والماسح الضوئي</div>
                      </div>
                    </button>

                    {onLogout && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl text-right hover:bg-rose-500/10 text-rose-300 transition"
                      >
                        <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                          <LogOut className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-xs sm:text-sm">تسجيل الخروج</div>
                          <div className="text-[11px] text-rose-400/70">الخروج من حساب المنظم الحالي</div>
                        </div>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {/* 2. تسجيل دخول منظم */}
                    <button
                      type="button"
                      onClick={handleOrganizerLogin}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl text-right hover:bg-slate-800/80 text-slate-200 transition"
                    >
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                        <LogIn className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-xs sm:text-sm text-white">تسجيل دخول منظم</div>
                        <div className="text-[11px] text-slate-400">الدخول إلى لوحة التحكم والماسح الضوئي</div>
                      </div>
                    </button>

                    {/* 3. إنشاء حساب منظم */}
                    <button
                      type="button"
                      onClick={handleOrganizerRegister}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl text-right hover:bg-slate-800/80 text-slate-200 transition"
                    >
                      <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-xs sm:text-sm text-white">إنشاء حساب منظم</div>
                        <div className="text-[11px] text-slate-400">انضم إلينا وابدأ بيع تذاكر فعاليتك فوراً</div>
                      </div>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Quick Direct Button */}
          {currentOrganizer ? (
            <button
              onClick={() => onSelectTab('organizer')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition ${
                currentTab === 'organizer'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="max-w-[120px] sm:max-w-[150px] truncate">{currentOrganizer.organization_name}</span>
            </button>
          ) : (
            <button
              onClick={() => onOpenAuthModal('login')}
              className="flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-xl shadow-indigo-600/30 transition active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>دخول المنظمين</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
