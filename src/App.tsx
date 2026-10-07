import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Ticket as TicketIcon,
  Calendar,
  MapPin,
  Flame,
  ShieldCheck,
  Building,
  LogIn
} from 'lucide-react';
import { EventItem, Organizer, Ticket } from './types';
import { dbService, getCurrentOrganizerSession, setCurrentOrganizerSession } from './lib/database';
import { getEventSalesStatus } from './lib/salesUtils';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { EventCard } from './components/EventCard';
import { EventBookingModal } from './components/EventBookingModal';
import { TicketModal } from './components/TicketModal';
import { EventDetailsModal } from './components/EventDetailsModal';
import { CreateEventModal } from './components/CreateEventModal';
import { OrganizerDashboard } from './components/OrganizerDashboard';
import { AuthModal } from './components/AuthModal';

export const App: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'events' | 'organizer'>('events');

  // Organizer Authentication Session
  const [currentOrganizer, setCurrentOrganizer] = useState<Organizer | null>(getCurrentOrganizerSession());

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');

  // Modals & Active state
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<EventItem | null>(null);
  const [bookingEvent, setBookingEvent] = useState<EventItem | null>(null);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const handleOpenAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // Load events
  const loadEvents = async () => {
    setLoading(true);
    const data = await dbService.getEvents();
    setEvents(data);
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleStartBooking = (event: EventItem) => {
    setBookingEvent(event);
    setIsBookingOpen(true);
  };

  const handleOpenDetails = (event: EventItem) => {
    setSelectedEventForDetails(event);
    setIsDetailsOpen(true);
  };

  const handleBookingSuccess = (newTickets: Ticket[]) => {
    if (newTickets.length > 0) {
      setActiveTicket(newTickets[0]);
      setIsTicketModalOpen(true);
      loadEvents();
    }
  };

  const handleEventCreated = (newEvent: EventItem) => {
    setEvents((prev) => [newEvent, ...prev]);
    setCurrentTab('organizer');
  };

  const handleSelectTab = (tab: 'events' | 'organizer') => {
    if (tab === 'organizer' && !currentOrganizer) {
      handleOpenAuthModal('login');
      return;
    }
    setCurrentTab(tab);
  };

  const handleAuthSuccess = (organizer: Organizer) => {
    setCurrentOrganizer(organizer);
    setCurrentTab('organizer');
    loadEvents();
  };

  const handleLogoutOrganizer = () => {
    setCurrentOrganizerSession(null);
    setCurrentOrganizer(null);
    setCurrentTab('events');
  };

  // Filter events
  const filteredEvents = events.filter((evt) => {
    const matchesSearch =
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.venue_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.organizer_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || evt.category === categoryFilter;
    const matchesCity = cityFilter === 'all' || evt.city === cityFilter;

    return matchesSearch && matchesCategory && matchesCity;
  });

  const featuredEvent = events.find((e) => e.featured) || events[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white font-cairo">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenAuthModal={handleOpenAuthModal}
        currentOrganizer={currentOrganizer}
        onLogout={handleLogoutOrganizer}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* ======================= 1. EVENTS EXPLORE TAB (CUSTOMER VIEW) ======================= */}
        {currentTab === 'events' && (
          <div className="space-y-8 pb-12">
            {/* Hero Banner with Search */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-500/20 p-6 sm:p-10 shadow-2xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تيك تاك | منصة حجز وتدقيق تذاكر الفعاليات الذكية</span>
                </div>

                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
                  احجز تذكرتك واستمتع بأقوى الفعاليات والمؤتمرات
                </h1>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                  تذاكر رقمية مخصصة برمز QR لكل مشترٍ، دخول فوري عند البوابات، ودفع مباشر لحسابات منظمي الفعاليات.
                </p>

                {/* Search Bar */}
                <div className="pt-2">
                  <div className="relative flex items-center bg-slate-900/90 border border-slate-700/80 rounded-2xl p-1.5 shadow-xl focus-within:border-indigo-500">
                    <Search className="w-5 h-5 text-indigo-400 mr-3 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث عن اسم الفعالية، المدينة، أو المنظم..."
                      className="w-full bg-transparent border-none text-xs sm:text-sm text-white placeholder:text-slate-400 px-2 py-2 focus:outline-none"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-xs text-slate-400 hover:text-white px-2 py-1"
                      >
                        مسح
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {[
                { id: 'all', label: '🌟 جميع الفعاليات' },
                { id: 'technology', label: '💻 تقنية وذكاء اصطناعي' },
                { id: 'business', label: '💼 أعمال وريادة' },
                { id: 'music', label: '🎵 موسيقى وحفلات' },
                { id: 'sports', label: '⚽ رياضة ولياقة' },
                { id: 'arts', label: '🎨 فنون ومسرح' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition border ${
                    categoryFilter === cat.id
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Featured Event Spotlight */}
            {featuredEvent && categoryFilter === 'all' && !searchQuery && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>الفعالية المميزة هذا الأسبوع</span>
                </div>

                <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 grid grid-cols-1 lg:grid-cols-12 shadow-2xl group">
                  <div className="lg:col-span-7 relative h-64 lg:h-auto overflow-hidden">
                    <img
                      src={featuredEvent.banner_url}
                      alt={featuredEvent.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-slate-900 via-transparent to-transparent" />
                  </div>

                  <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        الأكثر طلباً 🔥
                      </span>
                      <h2
                        onClick={() => handleOpenDetails(featuredEvent)}
                        className="text-xl sm:text-2xl font-black text-white cursor-pointer hover:text-indigo-300 transition"
                      >
                        {featuredEvent.title}
                      </h2>
                      <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                        {featuredEvent.description}
                      </p>

                      <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-slate-800">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-indigo-400" />
                          <span>{new Date(featuredEvent.start_date).toLocaleDateString('ar-SA')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-rose-400" />
                          <span>{featuredEvent.venue_name} ({featuredEvent.city})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                      <div>
                        <div className="text-[10px] text-slate-400">سعر التذكرة</div>
                        <div className="text-lg font-black text-white">
                          {featuredEvent.ticket_tiers.length > 0
                            ? `${Math.min(...featuredEvent.ticket_tiers.map((t) => t.price))} ${featuredEvent.currency || 'ر.س'}`
                            : 'مجاناً'}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenDetails(featuredEvent)}
                          className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition"
                        >
                          التفاصيل
                        </button>

                        {getEventSalesStatus(featuredEvent).isOpen ? (
                          <button
                            onClick={() => handleStartBooking(featuredEvent)}
                            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition active:scale-95"
                          >
                            احجز الآن
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 text-xs font-bold cursor-not-allowed opacity-80"
                          >
                            {getEventSalesStatus(featuredEvent).buttonLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Events Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <TicketIcon className="w-5 h-5 text-indigo-400" />
                  <span>الفعاليات المتاحة للحجز ({filteredEvents.length})</span>
                </h2>
              </div>

              {loading ? (
                <div className="py-20 text-center text-slate-400 text-xs">جاري تحميل الفعاليات...</div>
              ) : filteredEvents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredEvents.map((evt) => (
                    <EventCard
                      key={evt.id}
                      event={evt}
                      onBook={handleStartBooking}
                      onSelect={handleOpenDetails}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-3">
                  <div className="text-3xl">🔍</div>
                  <h3 className="font-bold text-white text-sm">لا توجد فعاليات مطابقة للبحث</h3>
                  <p className="text-xs text-slate-400">جرب البحث بكلمات أخرى أو تغيير التصنيف المحدد</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================= 2. ORGANIZER PRIVATE DASHBOARD ======================= */}
        {currentTab === 'organizer' && currentOrganizer && (
          <OrganizerDashboard
            organizer={currentOrganizer}
            events={events}
            onCreateEvent={() => setIsCreateEventOpen(true)}
            onLogout={handleLogoutOrganizer}
            onViewTicket={(ticket) => {
              setActiveTicket(ticket);
              setIsTicketModalOpen(true);
            }}
            onBrowseAsCustomer={() => setCurrentTab('events')}
          />
        )}
      </main>

      {/* Sticky Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenAuthModal={() => handleOpenAuthModal('login')}
        currentOrganizer={currentOrganizer}
      />

      {/* Modals */}
      <EventBookingModal
        event={bookingEvent}
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onSuccess={handleBookingSuccess}
      />

      <TicketModal
        ticket={activeTicket}
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
      />

      <EventDetailsModal
        event={selectedEventForDetails}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onBook={handleStartBooking}
      />

      <CreateEventModal
        isOpen={isCreateEventOpen}
        onClose={() => setIsCreateEventOpen(false)}
        onEventCreated={handleEventCreated}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        initialMode={authModalMode}
      />
    </div>
  );
};

export default App;
