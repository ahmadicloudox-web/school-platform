// src/components/teacher/components/TeacherGradeFilters.jsx
import React, { memo } from 'react';
import { Search, Calendar, Users, BookOpen, AlertCircle } from 'lucide-react';

const TeacherGradeFilters = memo(({
  selectedClass,
  setSelectedClass,
  selectedSubject,
  setSelectedSubject,
  selectedSemester,
  setSelectedSemester,
  academicYear,
  searchQuery,
  setSearchQuery,
  classes,
  subjects,
  isSemesterClosed
}) => {
  const hasClasses = classes.length > 0;
  const hasSubjects = subjects.length > 0;

  return (
    <div className="flex flex-wrap gap-3 mb-6 p-4 bg-slate-900 rounded-xl border border-slate-800">
      <div className="flex-1 min-w-[150px]">
        <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
          <Users className="w-3 h-3" /> الصف
        </label>
        <select
          value={selectedClass}
          onChange={(e) => {
            setSelectedClass(e.target.value);
            setSelectedSubject('');
          }}
          className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          disabled={!hasClasses}
        >
          <option value="">{hasClasses ? 'اختر الصف' : 'لا توجد صفوف'}</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
        {!hasClasses && (
          <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            لم يتم تخصيص صفوف لك
          </p>
        )}
      </div>

      <div className="flex-1 min-w-[150px]">
        <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
          <BookOpen className="w-3 h-3" /> المادة *
        </label>
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          disabled={!selectedClass || !hasSubjects}
        >
          <option value="">{selectedClass ? (hasSubjects ? 'اختر مادة' : 'لا توجد مواد') : 'اختر صف أولاً'}</option>
          {subjects.map(sub => (
            <option key={sub.id} value={sub.id}>{sub.name}</option>
          ))}
        </select>
        {selectedClass && !hasSubjects && (
          <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            لا توجد مواد في هذا الصف
          </p>
        )}
      </div>

      <div className="min-w-[120px]">
        <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
          <Calendar className="w-3 h-3" /> الفصل
        </label>
        <select
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(Number(e.target.value))}
          className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value={1}>الفصل الأول</option>
          <option value={2}>الفصل الثاني</option>
        </select>
      </div>

      <div className="min-w-[150px]">
        <label className="block text-xs text-slate-400 mb-1">العام الدراسي</label>
        <div className="relative">
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={academicYear || 'غير محدد'}
            disabled
            className="w-full p-2.5 pr-10 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm cursor-not-allowed opacity-70"
          />
        </div>
        <p className="text-[9px] text-slate-500 mt-1">🔒 مثبت للعام الحالي</p>
      </div>

      <div className="flex-1 min-w-[150px]">
        <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
          <Search className="w-3 h-3" /> بحث
        </label>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن طالب..."
            className="w-full p-2.5 pr-10 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            disabled={!selectedClass || !selectedSubject}
          />
        </div>
      </div>

      {isSemesterClosed && (
        <div className="w-full text-center text-rose-400 text-xs bg-rose-500/10 p-2 rounded-lg border border-rose-500/30">
          ⚠️ الفصل الدراسي مغلق من قبل الإدارة - لا يمكن التعديل
        </div>
      )}
    </div>
  );
});

TeacherGradeFilters.displayName = 'TeacherGradeFilters';

export default TeacherGradeFilters;