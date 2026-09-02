// src/components/teacher/LiveTeaching.jsx
import React from 'react';
import { Video } from 'lucide-react';

export default function LiveTeaching({ teacherData, classes, subjects, darkMode }) {
  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
      <h2 className="text-lg font-black flex items-center gap-2">
        <Video className="w-5 h-5 text-blue-400" />
        البث المباشر
      </h2>
      <p className="text-slate-400 text-sm mt-4">سيتم إضافة نظام البث المباشر هنا قريباً...</p>
    </div>
  );
}