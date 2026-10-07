import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';
import { Ticket } from '../types';

export const downloadTicketAsImage = async (elementId: string, filename: string = 'ticket.png') => {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    // Wait for fonts to be ready
    if (document.fonts) {
      await document.fonts.ready;
    }

    const dataUrl = await htmlToImage.toPng(element, {
      quality: 1.0,
      pixelRatio: 3, // High-DPI crisp export
      backgroundColor: '#0f172a',
      cacheBust: true,
      style: {
        transform: 'none',
      },
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Error generating ticket image with html-to-image:', error);
  }
};

export const downloadTicketAsPDF = async (elementId: string, filename: string = 'ticket.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    if (document.fonts) {
      await document.fonts.ready;
    }

    const dataUrl = await htmlToImage.toPng(element, {
      quality: 1.0,
      pixelRatio: 3,
      backgroundColor: '#0f172a',
      cacheBust: true,
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [105, 180], // Mobile ticket proportion
    });

    const imgProps = pdf.getImageProperties(dataUrl);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating ticket PDF:', error);
  }
};

export const shareTicketOnWhatsApp = (ticket: Ticket) => {
  const text = `🎟️ تذكرة فعالية: ${ticket.event_title}\n👤 الاسم: ${ticket.buyer_name}\n🎫 الفئة: ${ticket.tier_name}\n🔖 رمز التذكرة: ${ticket.ticket_code}\n📅 الموعد: ${new Date(ticket.event_date).toLocaleDateString('ar-SA')}\n📍 المكان: ${ticket.event_venue}`;
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};
