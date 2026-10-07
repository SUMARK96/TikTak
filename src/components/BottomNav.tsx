import React from 'react';
import { Home, Layers, LogIn } from 'lucide-react';
import { Organizer } from '../types';

interface BottomNavProps {
  currentTab: 'events' | 'organizer';
  onSelectTab: (tab: 'events' | 'organizer') => void;
  onOpenAuthModal: () => void;
  currentOrganizer: Organizer | null;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenAuthModal,
  currentOrganizer,
}) => {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-3 py-2 safe-area-pb">
      <div className="grid grid-cols-2 gap-2">
        {/* 1. Explore Events */}
        <button
          onClick={() => onSelectTab('events')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-2xl transition text-xs ${
            currentTab === 'events'
              ? 'text-indigo-400 bg-indigo-600/15 font-bold border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>استكشاف الفعاليات</span>
        </button>

        {/* 2. Organizer Portal */}
        {currentOrganizer ? (
          <button
            onClick={() => onSelectTab('organizer')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-2xl transition text-xs ${
              currentTab === 'organizer'
                ? 'text-emerald-400 bg-emerald-600/15 font-bold border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>لوحة المنظم</span>
          </button>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-2xl text-slate-300 bg-slate-900 border border-slate-800 hover:text-white transition text-xs font-bold"
          >
            <LogIn className="w-4 h-4 text-indigo-400" />
            <span>دخول المنظم</span>
          </button>
        )}
      </div>
    </div>
  );
};
