// src/components/teacher/AIGenerator.jsx
import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

export default function AIGenerator({ darkMode }) {
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [result, setResult] = useState(null);

  const generateLesson = async () => {
    if (!topic || !subject) {
      alert('الرجاء إدخال الموضوع والمادة');
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setResult({
        title: `درس: ${topic}`,
        introduction: `مقدمة حول ${topic} في مادة ${subject}`,
        content: `هذا هو المحتوى التوليدي للدرس حول ${topic}...`,
        questions: ['سؤال 1', 'سؤال 2', 'سؤال 3']
      });
    } catch (error) {
      alert('خطأ في توليد المحتوى');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h2 className="text-lg font-black">مولد المحتوى بالذكاء الاصطناعي</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="المادة (مثال: رياضيات)"
          className="p-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
        />
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="الموضوع (مثال: الكسور)"
          className="p-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
        />
      </div>

      <button
        onClick={generateLesson}
        disabled={loading}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            جاري التوليد...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            توليد محتوى الدرس
          </>
        )}
      </button>

      {result && (
        <div className="mt-6 p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-purple-400">{result.title}</h3>
          <p className="text-sm text-slate-300">{result.introduction}</p>
          <div className="p-3 bg-slate-800 rounded-lg">
            <p className="text-sm text-slate-400">{result.content}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.questions.map((q, i) => (
              <span key={i} className="text-xs bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full border border-purple-500/20">
                {q}
              </span>
            ))}
          </div>
          <button className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-all">
            حفظ الدرس
          </button>
        </div>
      )}
    </div>
  );
}