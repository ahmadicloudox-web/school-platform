// src/components/teacher/TeacherSchedule.jsx
import React from 'react';
import { Calendar } from 'lucide-react';

export default function TeacherSchedule({ teacherId, darkMode }) {
  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
      <h2 className="text-lg font-black flex items-center gap-2">
        <Calendar className="w-5 h-5 text-blue-400" />
        جدول الحصص
      </h2>
      <p className="text-slate-400 text-sm mt-4">سيتم عرض جدول الحصص هنا قريباً...</p>
    </div>
  );
}