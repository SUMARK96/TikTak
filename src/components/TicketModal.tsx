import React, { useState } from 'react';
import { X, Download, FileText, Share2, Printer, Check, Copy } from 'lucide-react';
import { Ticket } from '../types';
import { TicketCard } from './TicketCard';
import { downloadTicketAsImage, downloadTicketAsPDF, shareTicketOnWhatsApp } from '../lib/exportUtils';

interface TicketModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({ ticket, isOpen, onClose }) => {
  const [downloadingImg, setDownloadingImg] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !ticket) return null;

  const cardElementId = `ticket-export-${ticket.id}`;

  const handleDownloadImage = async () => {
    setDownloadingImg(true);
    await downloadTicketAsImage(cardElementId, `Ticket-${ticket.ticket_code}.png`);
    setDownloadingImg(false);
  };

  const handleDownloadPDF = async () => {
    setDownloadingPdf(true);
    await downloadTicketAsPDF(cardElementId, `Ticket-${ticket.ticket_code}.pdf`);
    setDownloadingPdf(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(ticket.ticket_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-4 sm:p-6 my-auto text-slate-100 max-h-[95vh] overflow-y-auto">
        {/* Header with Close */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🎟️</span> تذكرتك الإلكترونية
            </h2>
            <p className="text-xs text-slate-400">جاهزة للعرض والمسح عند البوابة</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* The Visual Ticket */}
        <div className="py-4 flex justify-center">
          <TicketCard ticket={ticket} id={cardElementId} />
        </div>

        {/* Action Buttons Grid */}
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleDownloadImage}
              disabled={downloadingImg}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm text-white shadow-lg shadow-indigo-600/30 transition active:scale-[0.98] disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloadingImg ? 'جاري الحفظ...' : 'تحميل صورة (PNG)'}
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPdf}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-600 font-bold text-sm text-slate-100 transition active:scale-[0.98] disabled:opacity-50"
            >
              <FileText className="w-4 h-4 text-rose-400" />
              {downloadingPdf ? 'جاري الإنشاء...' : 'تحميل مستند PDF'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => shareTicketOnWhatsApp(ticket)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition active:scale-[0.98]"
            >
              <Share2 className="w-3.5 h-3.5" />
              واتساب
            </button>

            <button
              onClick={handleCopyCode}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition active:scale-[0.98]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'تم النسخ' : 'نسخ الرمز'}
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition active:scale-[0.98]"
            >
              <Printer className="w-3.5 h-3.5" />
              طباعة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
