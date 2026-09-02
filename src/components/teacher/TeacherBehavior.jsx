// src/components/teacher/TeacherBehavior.jsx
import React from 'react';
import { Award } from 'lucide-react';

export default function TeacherBehavior({ teacherId, darkMode }) {
  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
      <h2 className="text-lg font-black flex items-center gap-2">
        <Award className="w-5 h-5 text-blue-400" />
        إدارة السلوك
      </h2>
      <p className="text-slate-400 text-sm mt-4">سيتم إضافة نظام تقييم السلوك هنا قريباً...</p>
    </div>
  );
}