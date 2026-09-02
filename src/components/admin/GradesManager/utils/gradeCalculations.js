// src/components/admin/GradesManager/utils/gradeCalculations.js
import { 
  GRADE_FIELD_KEYS, 
  DEFAULT_GRADING_CONFIG,
  getTotalMaxForSubject,
  calculateTotalFromFields,
  getGradeFieldsForSubject
} from '../constants/gradeFields';

// ============ حساب المجموع ============
export const calculateTotal = (grades, subjectId, gradingConfig) => {
  const config = gradingConfig?.subjects?.[subjectId] || gradingConfig?.default || DEFAULT_GRADING_CONFIG;
  
  let total = 0;
  GRADE_FIELD_KEYS.forEach(key => {
    total += (grades[key] || 0);
  });
  return total;
};

// ============ حساب النسبة المئوية ============
export const getPercentage = (total, subjectId, gradingConfig) => {
  const maxTotal = getTotalMaxForSubject(subjectId, gradingConfig);
  return maxTotal > 0 ? (total / maxTotal) * 100 : 0;
};

// ============ حساب التقدير ============
export const getGrade = (percentage) => {
  if (percentage >= 90) return { 
    label: 'ممتاز', 
    key: 'A', 
    color: 'text-emerald-400 bg-emerald-500/10',
    emoji: '🌟'
  };
  if (percentage >= 80) return { 
    label: 'جيد جداً', 
    key: 'B', 
    color: 'text-blue-400 bg-blue-500/10',
    emoji: '⭐'
  };
  if (percentage >= 70) return { 
    label: 'جيد', 
    key: 'C', 
    color: 'text-amber-400 bg-amber-500/10',
    emoji: '✅'
  };
  if (percentage >= 60) return { 
    label: 'مقبول', 
    key: 'D', 
    color: 'text-orange-400 bg-orange-500/10',
    emoji: '📖'
  };
  return { 
    label: 'ضعيف', 
    key: 'F', 
    color: 'text-rose-400 bg-rose-500/10',
    emoji: '⚠️'
  };
};

// ============ حساب جميع بيانات العلامة ============
export const calculateGradeData = (fields, subjectId, gradingConfig) => {
  const total = calculateTotal(fields, subjectId, gradingConfig);
  const maxTotal = getTotalMaxForSubject(subjectId, gradingConfig);
  const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  const gradeInfo = getGrade(percentage);
  
  const config = gradingConfig?.subjects?.[subjectId] || gradingConfig?.default || DEFAULT_GRADING_CONFIG;
  const fieldDetails = GRADE_FIELD_KEYS.map(key => ({
    key,
    value: fields[key] || 0,
    max: config[key] || 0,
    label: getFieldLabel(key)
  }));
  
  return { 
    total, 
    maxTotal,
    percentage, 
    gradeInfo,
    fieldDetails,
    isPassing: percentage >= 60
  };
};

// ============ دوال مساعدة ============
export const getFieldLabel = (key) => {
  const labels = {
    dailyExam1: 'امتحان يومي 1',
    participation1: 'مشاركة 1',
    midtermExam: 'امتحان شهري',
    dailyExam2: 'امتحان يومي 2',
    participation2: 'مشاركة 2',
    finalExam: 'امتحان فصلي'
  };
  return labels[key] || key;
};

export const getFieldColor = (key) => {
  const colors = {
    dailyExam1: 'blue-400',
    participation1: 'emerald-400',
    midtermExam: 'amber-400',
    dailyExam2: 'purple-400',
    participation2: 'rose-400',
    finalExam: 'orange-400'
  };
  return colors[key] || 'slate-400';
};

// ✅ إعادة تصدير الدوال من gradeFields لتجنب الأخطاء
export { 
  getTotalMaxForSubject,
  calculateTotalFromFields,
  getGradeFieldsForSubject,
  GRADE_FIELD_KEYS,
  DEFAULT_GRADING_CONFIG
};