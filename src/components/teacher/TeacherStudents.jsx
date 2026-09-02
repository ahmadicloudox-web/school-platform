// src/components/teacher/TeacherStudents.jsx
import React, { useState, useMemo } from 'react';
import { Users, Search, UserCheck, Mail, Phone, Calendar, Filter } from 'lucide-react';

export default function TeacherStudents({ students, classes, subjects, darkMode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  // ✅ الحصول على معرفات الصفوف التي يدرسها المعلم
  const teacherClassIds = useMemo(() => {
    const ids = new Set();
    subjects.forEach(subject => {
      if (subject.classId) {
        ids.add(subject.classId);
      }
    });
    return ids;
  }, [subjects]);

  // ✅ الصفوف المتاحة للمعلم
  const availableClasses = useMemo(() => {
    return classes.filter(cls => teacherClassIds.has(cls.id));
  }, [classes, teacherClassIds]);

  // ✅ فلترة الطلاب - فقط طلاب الصفوف التي يدرسها المعلم
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      if (!teacherClassIds.has(student.classId)) return false;
      if (selectedClass && student.classId !== selectedClass) return false;
      if (searchQuery && !student.fullName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [students, teacherClassIds, selectedClass, searchQuery]);

  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => 
      a.fullName.localeCompare(b.fullName)
    );
  }, [filteredStudents]);

  const getClassName = (classId) => {
    const cls = classes.find(c => c.id === classId);
    return cls?.name || 'غير محدد';
  };

  if (sortedStudents.length === 0) {
    return (
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 text-center py-12">
        <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">لا يوجد طلاب في صفوفك</p>
        <p className="text-xs text-slate-500 mt-1">لم يتم تسجيل أي طالب في الصفوف التي تدرسها</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            طلابي
          </h2>
          <p className="text-xs text-slate-400">عرض جميع الطلاب المسجلين في صفوفك</p>
        </div>
        <span className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
          {sortedStudents.length} طالب
        </span>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-slate-900 rounded-xl border border-slate-800">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> تصفية حسب الصف
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">جميع الصفوف</option>
            {availableClasses.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[180px]">
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
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedStudents.map((student) => (
          <div
            key={student.id}
            className="bg-slate-900 rounded-xl border border-slate-800 p-4 hover:border-blue-500/50 transition-all cursor-pointer"
            onClick={() => setSelectedStudent(selectedStudent?.id === student.id ? null : student)}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {student.fullName?.charAt(0) || 'ط'}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{student.fullName}</h4>
                <p className="text-xs text-blue-400">{getClassName(student.classId)}</p>
              </div>
              <div className={`w-2 h-2 rounded-full ${student.active !== false ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            </div>

            {selectedStudent?.id === student.id && (
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{student.email || 'غير محدد'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{student.phone || 'غير محدد'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>تاريخ التسجيل: {student.createdAt ? new Date(student.createdAt).toLocaleDateString('ar') : 'غير محدد'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>الحالة: {student.active !== false ? 'نشط' : 'غير نشط'}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-slate-900 rounded-xl border border-slate-800">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-400">إجمالي الطلاب</p>
            <p className="text-lg font-bold text-white">{sortedStudents.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">الصفوف</p>
            <p className="text-lg font-bold text-white">
              {new Set(sortedStudents.map(s => s.classId).filter(Boolean)).size}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">نشطون</p>
            <p className="text-lg font-bold text-emerald-400">
              {sortedStudents.filter(s => s.active !== false).length}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">غير نشطون</p>
            <p className="text-lg font-bold text-rose-400">
              {sortedStudents.filter(s => s.active === false).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}