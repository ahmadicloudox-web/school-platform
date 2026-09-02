// src/components/teacher/TeacherClasses.jsx
import React, { useState, useMemo } from 'react';
import { School, BookOpen, Users, ChevronDown, ChevronUp } from 'lucide-react';

export default function TeacherClasses({ classes, subjects, teacherId, darkMode }) {
  const [expandedClass, setExpandedClass] = useState(null);

  // ✅ تجميع المواد حسب الصف
  const classesWithSubjects = useMemo(() => {
    const classMap = {};
    
    subjects.forEach(subject => {
      const classId = subject.classId;
      if (!classId) return;
      
      if (!classMap[classId]) {
        const classData = classes.find(c => c.id === classId);
        classMap[classId] = {
          id: classId,
          name: classData?.name || 'غير محدد',
          subjects: []
        };
      }
      classMap[classId].subjects.push({
        id: subject.id,
        name: subject.name,
        teacherId: subject.teacherId
      });
    });
    
    return Object.values(classMap);
  }, [classes, subjects]);

  const toggleExpand = (classId) => {
    setExpandedClass(expandedClass === classId ? null : classId);
  };

  if (classesWithSubjects.length === 0) {
    return (
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 text-center py-12">
        <School className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">لا توجد صفوف مسندة لك</p>
        <p className="text-xs text-slate-500 mt-1">لم يتم تخصيص أي مادة لك في أي صف</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-black flex items-center gap-2">
            <School className="w-5 h-5 text-blue-400" />
            صفوفي
          </h2>
          <p className="text-xs text-slate-400">المواد التي تدرسها في كل صف</p>
        </div>
        <span className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
          {classesWithSubjects.length} صف
        </span>
      </div>

      <div className="space-y-4">
        {classesWithSubjects.map((classItem) => (
          <div
            key={classItem.id}
            className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
          >
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/50 transition-all"
              onClick={() => toggleExpand(classItem.id)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                  <School className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{classItem.name}</h3>
                  <p className="text-xs text-slate-400">
                    {classItem.subjects.length} مادة
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                  {expandedClass === classItem.id ? 'إخفاء' : 'عرض المواد'}
                </span>
                {expandedClass === classItem.id ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {expandedClass === classItem.id && (
              <div className="p-4 pt-0 border-t border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  {classItem.subjects.map((subject) => (
                    <div
                      key={subject.id}
                      className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-blue-500/50 transition-all"
                    >
                      <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-white">{subject.name}</h4>
                        <p className="text-[10px] text-slate-400">
                          {subject.teacherId === teacherId ? '🔵 أدرسها' : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-slate-900 rounded-xl border border-slate-800">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-400">إجمالي الصفوف</p>
            <p className="text-lg font-bold text-white">{classesWithSubjects.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">إجمالي المواد</p>
            <p className="text-lg font-bold text-purple-400">
              {classesWithSubjects.reduce((acc, c) => acc + c.subjects.length, 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">متوسط المواد لكل صف</p>
            <p className="text-lg font-bold text-emerald-400">
              {(classesWithSubjects.reduce((acc, c) => acc + c.subjects.length, 0) / classesWithSubjects.length).toFixed(1)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}