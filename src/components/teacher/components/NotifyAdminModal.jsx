// src/components/teacher/components/NotifyAdminModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle } from 'lucide-react';

const NotifyAdminModal = ({ 
  onConfirm, 
  onCancel, 
  darkMode,
  subjectName 
}) => {
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  }, []);

  const handleSubmit = async () => {
    if (!note.trim()) {
      setError('الرجاء كتابة ملاحظة توضيحية للإدارة');
      return;
    }
    
    try {
      setSending(true);
      setError('');
      await onConfirm(note);
    } catch (err) {
      setError('❌ ' + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 max-w-md w-full mx-4 border ${darkMode ? 'border-slate-700' : 'border-slate-200'} shadow-2xl`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
            <Send className="w-5 h-5" />
          </div>
          <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            إشعار الإدارة
          </h3>
        </div>
        
        <div className="space-y-4">
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            سيتم إرسال إشعار للإدارة بأنك قمت بإدخال العلامات 
            {subjectName && ` لمادة ${subjectName}`}.
            <br />
            <span className="text-xs text-amber-400">✏️ يمكنك إضافة ملاحظة توضيحية للإدارة</span>
          </p>
          
          <div>
            <label className={`block text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>
              ملاحظة للإدارة *
            </label>
            <textarea
              ref={textareaRef}
              value={note}
              onChange={(e) => { setNote(e.target.value); setError(''); }}
              placeholder="اكتب ملاحظة للإدارة حول العلامات التي أدخلتها..."
              className={`w-full p-3 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                darkMode 
                  ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500/20' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-500/20'
              }`}
              rows={4}
            />
            {error && (
              <p className="text-xs text-rose-400 mt-1">{error}</p>
            )}
          </div>
          
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSubmit}
              disabled={sending}
              className={`flex-1 py-2.5 text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                sending ? 'bg-slate-600' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</>
              ) : (
                <><Send className="w-4 h-4" /> إرسال الإشعار</>
              )}
            </button>
            <button
              onClick={onCancel}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                darkMode 
                  ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
              disabled={sending}
            >
              إلغاء
            </button>
          </div>
          
          <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
            darkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>سيتم إرسال إشعار فوري للإدارة. يمكنهم مراجعة العلامات ثم إغلاق الفصل الدراسي.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotifyAdminModal;