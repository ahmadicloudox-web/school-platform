// src/components/teacher/components/TeacherGradeRow.jsx
import React, { memo, useMemo } from 'react';
import { GRADE_FIELDS } from '../../admin/GradesManager/constants/gradeFields';
import TeacherGradeCell from './TeacherGradeCell';

const TeacherGradeRow = memo(({
  student,
  getFieldValue,
  startEdit,
  updateTempGrade,
  editingCell,
  editingValue,
  setEditingValue,
  inputRef,
  handleKeyDown,
  handleBlur,
  isSemesterClosed,
  tempGrades,
  selectedSubject,
  gradingConfig,
  getSubjectMaxTotal,
  getFieldMax,
  dynamicGradeFields
}) => {
  // ✅ استخدام الحقول الديناميكية
  const fieldsToRender = dynamicGradeFields || GRADE_FIELDS;

  // ✅ الحصول على قيم الحقول للطالب
  const fields = useMemo(() => {
    const result = {};
    fieldsToRender.forEach(f => {
      result[f.key] = getFieldValue(student.id, f.key);
    });
    return result;
  }, [student.id, getFieldValue, fieldsToRender]);

  const maxTotal = getSubjectMaxTotal();
  
  // ✅ حساب المجموع
  const total = useMemo(() => {
    let sum = 0;
    fieldsToRender.forEach(f => {
      sum += (fields[f.key] || 0);
    });
    return sum;
  }, [fields, fieldsToRender]);

  // ✅ حساب النسبة المئوية والتقدير
  const gradeInfo = useMemo(() => {
    const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
    if (percentage >= 90) return { label: 'ممتاز', key: 'A', color: 'text-emerald-400 bg-emerald-500/10' };
    if (percentage >= 80) return { label: 'جيد جداً', key: 'B', color: 'text-blue-400 bg-blue-500/10' };
    if (percentage >= 70) return { label: 'جيد', key: 'C', color: 'text-amber-400 bg-amber-500/10' };
    if (percentage >= 60) return { label: 'مقبول', key: 'D', color: 'text-orange-400 bg-orange-500/10' };
    return { label: 'ضعيف', key: 'F', color: 'text-rose-400 bg-rose-500/10' };
  }, [total, maxTotal]);

  const hasChanges = useMemo(() => {
    return fieldsToRender.some(f => tempGrades[`${student.id}_${f.key}`] !== undefined);
  }, [student.id, tempGrades, fieldsToRender]);

  return (
    <tr className={`border-b border-slate-800 hover:bg-slate-800/30 transition-all ${
      hasChanges ? 'bg-amber-500/5' : ''
    }`}>
      <td className="p-3 font-bold text-white sticky right-0 bg-slate-800/50 min-w-[120px]">
        {student.fullName}
      </td>
      {fieldsToRender.map(field => (
        <td key={field.key} className="p-2 text-center">
          <TeacherGradeCell
            studentId={student.id}
            field={field.key}
            maxValue={field.max || 0}
            currentValue={fields[field.key] || 0}
            isEditing={editingCell?.studentId === student.id && editingCell?.field === field.key}
            isModified={tempGrades[`${student.id}_${field.key}`] !== undefined}
            isSemesterClosed={isSemesterClosed}
            editingValue={editingValue}
            inputRef={inputRef}
            onStartEdit={startEdit}
            onUpdateTempGrade={updateTempGrade}
            onEditingValueChange={setEditingValue}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
          />
        </td>
      ))}
      <td className="p-3 text-center font-bold text-emerald-400">
        {total}
        <span className="text-[9px] text-slate-500 block">من {maxTotal}</span>
      </td>
      <td className="p-3 text-center">
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${gradeInfo.color}`}>
          {gradeInfo.label}
        </span>
      </td>
    </tr>
  );
});

TeacherGradeRow.displayName = 'TeacherGradeRow';

export default TeacherGradeRow;