// src/components/teacher/TeacherAttendance.jsx
import React from 'react';
import { UserCheck } from 'lucide-react';

export default function TeacherAttendance({ teacherId, darkMode }) {
  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
      <h2 className="text-lg font-black flex items-center gap-2">
        <UserCheck className="w-5 h-5 text-blue-400" />
        إدارة الحضور
      </h2>
      <p className="text-slate-400 text-sm mt-4">سيتم إضافة نظام حضور الطلاب هنا قريباً...</p>
    </div>
  );
}