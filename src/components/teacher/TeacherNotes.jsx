// src/components/teacher/TeacherNotes.jsx
import React from 'react';
import { MessageSquare } from 'lucide-react';

export default function TeacherNotes({ teacherId, darkMode }) {
  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
      <h2 className="text-lg font-black flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-blue-400" />
        الملاحظات
      </h2>
      <p className="text-slate-400 text-sm mt-4">سيتم إضافة نظام الملاحظات هنا قريباً...</p>
    </div>
  );
}