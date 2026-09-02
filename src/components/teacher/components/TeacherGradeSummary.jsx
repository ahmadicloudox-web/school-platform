// src/components/teacher/components/TeacherGradeSummary.jsx
import React, { memo, useMemo } from 'react';
import { GRADE_FIELDS } from '../../admin/GradesManager/constants/gradeFields';

const TeacherGradeSummary = memo(({ 
  students, 
  grades, 
  selectedSubject, 
  selectedSemester,
  academicYear,
  gradingConfig,
  getSubjectMaxTotal
}) => {
  const summary = useMemo(() => {
    if (!selectedSubject || students.length === 0) {
      return { count: students.length, average: 0, max: 0, min: 0, maxTotal: 0 };
    }

    const maxTotal = getSubjectMaxTotal();
    const totals = students.map(student => {
      const grade = grades.find(g => 
        g.studentId === student.id && 
        g.subjectId === selectedSubject && 
        g.semester === selectedSemester &&
        g.academicYear === academicYear
      );
      
      let total = 0;
      if (grade) {
        GRADE_FIELDS.forEach(f => {
          total += (grade[f.key] || 0);
        });
      }
      return total;
    });

    const validTotals = totals.filter(t => t > 0);
    const average = validTotals.length > 0 
      ? (validTotals.reduce((sum, t) => sum + t, 0) / validTotals.length).toFixed(1)
      : 0;

    return {
      count: students.length,
      average,
      max: validTotals.length > 0 ? Math.max(...validTotals) : 0,
      min: validTotals.length > 0 ? Math.min(...validTotals) : 0,
      maxTotal: maxTotal,
      percentage: maxTotal > 0 ? (average / maxTotal * 100).toFixed(1) : 0
    };
  }, [students, grades, selectedSubject, selectedSemester, academicYear, getSubjectMaxTotal]);

  if (!selectedSubject || students.length === 0) return null;

  return (
    <div className="mt-6 p-4 bg-slate-900 rounded-xl border border-slate-800">
      <h4 className="text-xs font-bold text-slate-400 mb-3">📊 ملخص العلامات</h4>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="text-center">
          <p className="text-xs text-slate-400">عدد الطلاب</p>
          <p className="text-lg font-bold text-white">{summary.count}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400">المعدل العام</p>
          <p className="text-lg font-bold text-emerald-400">
            {summary.average}
            <span className="text-xs text-slate-500 block">من {summary.maxTotal}</span>
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400">النسبة المئوية</p>
          <p className="text-lg font-bold text-emerald-400">{summary.percentage}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400">أعلى علامة</p>
          <p className="text-lg font-bold text-emerald-400">{summary.max}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400">أدنى علامة</p>
          <p className="text-lg font-bold text-rose-400">{summary.min}</p>
        </div>
      </div>
    </div>
  );
});

TeacherGradeSummary.displayName = 'TeacherGradeSummary';

export default TeacherGradeSummary;