// src/components/admin/GradesManager/hooks/useGradeEditing.js
import { useState, useCallback, useRef } from 'react';
import { db } from '../../../../services/firebase';
import { 
  collection, doc, getDocs, updateDoc, addDoc, 
  query, where, writeBatch 
} from 'firebase/firestore';
import { 
  GRADE_FIELD_KEYS, 
  getGradeFieldsForSubject,
  getTotalMaxForSubject,
  calculateTotalFromFields
} from '../constants/gradeFields';
import { getGrade } from '../utils/gradeCalculations';

export const useGradeEditing = (
  grades,
  students,
  subjects,
  selectedSubject,
  selectedSemester,
  academicYear,
  notifyTeacher,
  setMessage,
  gradingConfig,
  selectedClass
) => {
  // ====== الحالات ======
  const [tempGrades, setTempGrades] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  // ============ الحصول على الحقول الديناميكية ============
  const getFieldsForSubject = useCallback((subjectId) => {
    return getGradeFieldsForSubject(subjectId, selectedClass, gradingConfig);
  }, [gradingConfig, selectedClass]);

  // ============ الحصول على المجموع الكلي ============
  const getMaxTotal = useCallback((subjectId) => {
    return getTotalMaxForSubject(subjectId, selectedClass, gradingConfig);
  }, [gradingConfig, selectedClass]);

  // ============ الحصول على قيمة الحقل ============
  const getFieldValue = useCallback((studentId, field) => {
    const key = `${studentId}_${field}`;
    if (tempGrades[key] !== undefined) return tempGrades[key];
    
    const grade = grades.find(g => 
      g.studentId === studentId && 
      g.subjectId === selectedSubject && 
      g.semester === selectedSemester &&
      g.academicYear === academicYear
    );
    return grade?.[field] || 0;
  }, [grades, selectedSubject, selectedSemester, academicYear, tempGrades]);

  // ============ بدء التعديل ============
  const startEdit = useCallback((studentId, field, currentValue, isSemesterClosed) => {
    if (isSemesterClosed) {
      setMessage({ type: 'error', text: '⚠️ الفصل الدراسي مغلق، لا يمكن التعديل' });
      return;
    }
    setEditingCell({ studentId, field });
    setEditingValue(String(currentValue || ''));
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 50);
  }, [setMessage]);

  // ============ تحديث القيمة المؤقتة ============
  const updateTempGrade = useCallback((studentId, field, value) => {
    const key = `${studentId}_${field}`;
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setTempGrades(prev => ({ ...prev, [key]: numValue }));
    }
  }, []);

  // ============ حفظ جميع العلامات ============
  const saveAllGrades = useCallback(async (isSemesterClosed) => {
    const changes = Object.keys(tempGrades);
    
    if (changes.length === 0) {
      setMessage({ type: 'info', text: 'ℹ️ لا توجد تغييرات لحفظها' });
      return;
    }

    if (isSemesterClosed) {
      setMessage({ 
        type: 'error', 
        text: `⚠️ الفصل الدراسي ${selectedSemester === 1 ? 'الأول' : 'الثاني'} مغلق. لا يمكن حفظ التغييرات.` 
      });
      return;
    }

    const fieldsConfig = getFieldsForSubject(selectedSubject);
    const maxTotal = getMaxTotal(selectedSubject);
    
    const validationErrors = [];
    const validChanges = [];

    for (const key of changes) {
      const [studentId, fieldKey] = key.split('_');
      const value = tempGrades[key];
      
      const fieldConfig = fieldsConfig.find(f => f.key === fieldKey);
      const maxVal = fieldConfig?.max || 0;
      const fieldLabel = fieldConfig?.label || fieldKey;
      const studentName = students.find(s => s.id === studentId)?.fullName || 'غير محدد';
      
      if (value < 0) {
        validationErrors.push({
          student: studentName,
          field: fieldLabel,
          value: value,
          error: 'لا يمكن أن تكون أقل من 0'
        });
      } else if (value > maxVal) {
        validationErrors.push({
          student: studentName,
          field: fieldLabel,
          value: value,
          max: maxVal,
          error: `تجاوزت الحد الأقصى (${maxVal})`
        });
      } else {
        validChanges.push(key);
      }
    }

    if (validationErrors.length > 0) {
      const errorMessages = validationErrors.map(err => 
        `❌ ${err.student} - ${err.field}: ${err.value} (${err.error})`
      ).join('\n');
      
      setMessage({ 
        type: 'error', 
        text: `⚠️ يوجد ${validationErrors.length} خطأ في العلامات:\n${errorMessages}\n\n✅ تم تجاهل هذه القيم، يرجى تصحيحها ثم إعادة الحفظ.` 
      });
      return;
    }

    if (validChanges.length === 0) {
      setMessage({ type: 'info', text: 'ℹ️ لا توجد تغييرات صالحة للحفظ' });
      return;
    }

    setSaving(true);
    setMessage({ type: 'info', text: `⏳ جاري حفظ ${validChanges.length} علامة...` });

    try {
      const batch = writeBatch(db);
      let savedCount = 0;
      const notifications = [];

      for (const key of validChanges) {
        const [studentId, fieldKey] = key.split('_');
        const value = tempGrades[key];
        
        const existingQuery = query(
          collection(db, 'grades'),
          where('studentId', '==', studentId),
          where('subjectId', '==', selectedSubject),
          where('semester', '==', selectedSemester),
          where('academicYear', '==', academicYear)
        );
        
        const existingSnapshot = await getDocs(existingQuery);
        
        const subject = subjects.find(s => s.id === selectedSubject);
        const teacherId = subject?.teacherId;
        
        if (!existingSnapshot.empty) {
          const docId = existingSnapshot.docs[0].id;
          const docRef = doc(db, 'grades', docId);
          const oldData = existingSnapshot.docs[0].data();
          const oldValue = oldData[fieldKey] || 0;
          
          const updatedFields = { ...oldData, [fieldKey]: value };
          
          let total = 0;
          GRADE_FIELD_KEYS.forEach(f => {
            total += (updatedFields[f] || 0);
          });
          
          const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
          const grade = getGrade(percentage);
          
          batch.update(docRef, {
            [fieldKey]: value,
            total: total,
            maxTotal: maxTotal,
            percentage: percentage,
            grade: grade.key,
            updatedAt: new Date().toISOString(),
            updatedBy: 'admin'
          });

          if (notifyTeacher && teacherId && oldValue !== value) {
            const student = students.find(s => s.id === studentId);
            notifications.push({
              userId: teacherId,
              type: 'warning',
              title: 'تعديل علامة طالب',
              message: `تم تعديل علامة الطالب ${student?.fullName || 'غير محدد'} في مادة ${subject?.name || ''} من ${oldValue} إلى ${value}`,
              link: '/teacher/grades',
              isRead: false,
              createdAt: new Date().toISOString(),
              senderId: 'admin'
            });
          }
          savedCount++;
        } else {
          const gradeData = {
            studentId: studentId,
            subjectId: selectedSubject,
            semester: selectedSemester,
            academicYear: academicYear,
            dailyExam1: 0,
            participation1: 0,
            midtermExam: 0,
            dailyExam2: 0,
            participation2: 0,
            finalExam: 0,
            [fieldKey]: value,
            total: value,
            maxTotal: maxTotal,
            percentage: maxTotal > 0 ? (value / maxTotal) * 100 : 0,
            grade: 'F',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'admin',
            updatedBy: 'admin'
          };
          
          const newDocRef = doc(collection(db, 'grades'));
          batch.set(newDocRef, gradeData);
          savedCount++;
        }
      }

      await batch.commit();

      for (const notif of notifications) {
        try {
          await addDoc(collection(db, 'notifications'), notif);
        } catch (err) {
          console.error('❌ خطأ في إضافة إشعار:', err);
        }
      }

      setTempGrades({});
      setEditingCell(null);
      setEditingValue('');

      let successMessage = `✅ تم حفظ ${savedCount} علامة بنجاح في الفصل ${selectedSemester === 1 ? 'الأول' : 'الثاني'}`;
      successMessage += ` (المجموع الكلي: ${maxTotal} علامة)`;
      setMessage({ type: 'success', text: successMessage });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);

    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage({ type: 'error', text: '❌ خطأ في حفظ العلامات: ' + error.message });
    } finally {
      setSaving(false);
    }
  }, [
    tempGrades, 
    selectedSubject, 
    selectedSemester, 
    academicYear, 
    subjects, 
    students, 
    notifyTeacher, 
    setMessage,
    getFieldsForSubject,
    getMaxTotal,
    gradingConfig,
    selectedClass
  ]);

  const getTotalChanges = useCallback(() => {
    return Object.keys(tempGrades).length;
  }, [tempGrades]);

  const clearChanges = useCallback(() => {
    setTempGrades({});
    setEditingCell(null);
    setEditingValue('');
  }, []);

  const getSubjectMaxTotal = useCallback(() => {
    return getMaxTotal(selectedSubject);
  }, [selectedSubject, getMaxTotal]);

  // ✅ إرجاع جميع القيم المطلوبة
  return {
    tempGrades,
    setTempGrades,
    editingCell,
    setEditingCell,
    editingValue,
    setEditingValue,
    saving,
    inputRef,
    getFieldValue,
    startEdit,
    updateTempGrade,
    saveAllGrades,
    getTotalChanges,
    clearChanges,
    getFieldsForSubject,
    getSubjectMaxTotal,
    getMaxTotal
  };
};