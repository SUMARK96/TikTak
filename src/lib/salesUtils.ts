import { EventItem } from '../types';

export interface SalesStatusInfo {
  isOpen: boolean;
  status: 'upcoming' | 'open' | 'ended' | 'sold_out' | 'paused';
  message: string;
  badgeLabel: string;
  buttonLabel: string;
}

export function getEventSalesStatus(event: EventItem): SalesStatusInfo {
  if (event.status === 'paused' || event.status === 'draft') {
    return {
      isOpen: false,
      status: 'paused',
      message: 'الفعالية متوقفة مؤقتاً من قبل المنظم',
      badgeLabel: 'متوقفة مؤقتاً',
      buttonLabel: 'الحجز متوقف مؤقتاً',
    };
  }

  const totalCapacity = event.ticket_tiers.reduce((acc, t) => acc + t.capacity, 0);
  const totalSold = event.ticket_tiers.reduce((acc, t) => acc + t.sold_count, 0);
  if (totalCapacity > 0 && totalSold >= totalCapacity) {
    return {
      isOpen: false,
      status: 'sold_out',
      message: 'نفدت جميع تذاكر الفعالية بالكامل',
      badgeLabel: 'نفدت التذاكر',
      buttonLabel: 'نفدت جميع التذاكر',
    };
  }

  const now = Date.now();

  // 1. Check sales start date & time
  if (event.sales_start_date) {
    const startTime = new Date(event.sales_start_date).getTime();
    if (now < startTime) {
      const formattedStartDate = new Date(event.sales_start_date).toLocaleDateString('ar-SA', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      return {
        isOpen: false,
        status: 'upcoming',
        message: `يبدأ بيع التذاكر رسمياً في: ${formattedStartDate}`,
        badgeLabel: 'قريباً',
        buttonLabel: `يبدأ البيع: ${formattedStartDate}`,
      };
    }
  }

  // 2. Check sales end date & time
  if (event.sales_end_date) {
    const endTime = new Date(event.sales_end_date).getTime();
    if (now > endTime) {
      return {
        isOpen: false,
        status: 'ended',
        message: 'انتهت الفترة المحددة لشراء وحجز التذاكر',
        badgeLabel: 'مغلق',
        buttonLabel: 'انتهى وقت الحجز',
      };
    }
  }

  return {
    isOpen: true,
    status: 'open',
    message: 'الحجز متاح الآن',
    badgeLabel: 'متاح للحجز',
    buttonLabel: 'حجز التذكرة',
  };
}
