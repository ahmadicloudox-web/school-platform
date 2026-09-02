// src/components/admin/AnnouncementSender.jsx
import React, { useState } from 'react';
import { Send, Loader2, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { notifyAnnouncement } from '../../services/notificationService';

export default function AnnouncementSender({ darkMode }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setResult({ type: 'error', text: 'الرجاء إدخال العنوان والرسالة' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const targets = target === 'all' ? ['teacher', 'student', 'admin'] : [target];
      await notifyAnnouncement(title, message, targets);
      setResult({ type: 'success', text: '✅ تم إرسال الإشعار بنجاح!' });
      setTitle('');
      setMessage('');
    } catch (error) {
      setResult({ type: 'error', text: '❌ خطأ في إرسال الإشعار: ' + error.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <h3 className="text-lg font-black flex items-center gap-2">
        <Send className="w-5 h-5 text-blue-400" />
        إشعار عام
      </h3>
      <p className="text-xs text-slate-400 mt-1">إرسال إشعار لجميع المستخدمين أو فئة محددة</p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">العنوان</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان الإشعار"
            className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">الرسالة</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="محتوى الإشعار..."
            rows={4}
            className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">الفئة المستهدفة</label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">الجميع (معلمين + طلاب + إدارة)</option>
            <option value="teacher">المعلمين فقط</option>
            <option value="student">الطلاب فقط</option>
            <option value="admin">الإدارة فقط</option>
          </select>
        </div>

        {result && (
          <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
            result.type === 'success' 
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}>
            {result.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{result.text}</span>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
        >
          {sending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</>
          ) : (
            <><Send className="w-4 h-4" /> إرسال الإشعار</>
          )}
        </button>
      </div>
    </div>
  );
}