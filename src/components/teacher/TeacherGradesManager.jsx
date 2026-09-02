// src/components/teacher/TeacherGradesManager.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, doc, getDocs, getDoc, updateDoc, addDoc,
  query, where, onSnapshot, writeBatch 
} from 'firebase/firestore';
import { 
  FileText, Loader2, CheckCircle, AlertCircle, 
  Printer, RefreshCw, SaveAll, Send,
  Keyboard
} from 'lucide-react';

import TeacherGradeTable from './components/TeacherGradeTable';
import TeacherGradeFilters from './components/TeacherGradeFilters';
import TeacherGradeSummary from './components/TeacherGradeSummary';
import NotifyAdminModal from './components/NotifyAdminModal';
import { GRADE_FIELDS, getGradeFieldsForSubject, getTotalMaxForSubject } from '../admin/GradesManager/constants/gradeFields';
import { notifyGradesAdded } from '../../services/notificationService';
export default function TeacherGradesManager({ teacherId, darkMode, teacherData }) {
  // ====== useState ======
  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  
  const [tempGrades, setTempGrades] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [schoolSettings, setSchoolSettings] = useState(null);
  const [academicYear, setAcademicYear] = useState('');
  const [gradingConfig, setGradingConfig] = useState(null);
  
  // ✅ حالة العام الدراسي من مجلد academicYears
  const [academicYearData, setAcademicYearData] = useState(null);

  const inputRef = useRef(null);

  // ====== ✅ جلب الإعدادات والعام الدراسي ======
  useEffect(() => {
    if (!teacherId) return;

    console.log('🔍 TeacherGradesManager - بدء جلب الإعدادات...');

    // ✅ جلب إعدادات المدرسة
    const unsubscribeSettings = onSnapshot(
      doc(db, 'schoolSettings', 'settings'),
      (docSnap) => {
        console.log('📡 TeacherGradesManager - تم استلام بيانات schoolSettings');
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('📋 TeacherGradesManager - بيانات schoolSettings:', JSON.stringify(data, null, 2));
          
          setSchoolSettings(data);
          
          // ✅ جلب توزيع العلامات
          if (data.gradingConfig) {
            console.log('✅ TeacherGradesManager - توزيع العلامات:', data.gradingConfig);
            setGradingConfig(data.gradingConfig);
          }
        } else {
          console.log('⚠️ TeacherGradesManager - لا توجد إعدادات للمدرسة');
        }
        setLoading(false);
      },
      (error) => {
        console.error('❌ TeacherGradesManager - خطأ في جلب الإعدادات:', error);
        setLoading(false);
      }
    );

    // ✅ جلب العام الدراسي من مجلد academicYears
    const unsubscribeAcademicYears = onSnapshot(
      collection(db, 'academicYears'),
      (snapshot) => {
        console.log('📡 TeacherGradesManager - تم استلام بيانات academicYears');
        
        if (!snapshot.empty) {
          // جلب أحدث عام دراسي (مرتب حسب createdAt)
          let latestYear = null;
          let latestDate = null;
          
          snapshot.forEach(doc => {
            const data = doc.data();
            const createdAt = data.createdAt || data.startDate;
            if (!latestDate || (createdAt && createdAt > latestDate)) {
              latestDate = createdAt;
              latestYear = { id: doc.id, ...data };
            }
          });
          
          if (latestYear) {
            console.log('✅ TeacherGradesManager - العام الدراسي:', latestYear);
            setAcademicYearData(latestYear);
            
            // ✅ استخدام yearName كـ academicYear
            if (latestYear.yearName) {
              console.log('✅ TeacherGradesManager - yearName:', latestYear.yearName);
              setAcademicYear(latestYear.yearName);
            }
          } else {
            console.log('⚠️ TeacherGradesManager - لا توجد سنوات دراسية');
            // استخدام العام الافتراضي
            const currentYear = new Date().getFullYear();
            setAcademicYear(`${currentYear}-${currentYear + 1}`);
          }
        } else {
          console.log('⚠️ TeacherGradesManager - لا توجد سنوات دراسية');
          const currentYear = new Date().getFullYear();
          setAcademicYear(`${currentYear}-${currentYear + 1}`);
        }
      },
      (error) => {
        console.error('❌ TeacherGradesManager - خطأ في جلب السنوات الدراسية:', error);
        const currentYear = new Date().getFullYear();
        setAcademicYear(`${currentYear}-${currentYear + 1}`);
      }
    );

    // جلب المواد التي يدرسها المعلم
    const unsubSubjects = onSnapshot(
      query(collection(db, 'subjects'), where('teacherId', '==', teacherId)),
      (snapshot) => {
        const subjectList = [];
        snapshot.forEach(doc => {
          subjectList.push({ id: doc.id, ...doc.data() });
        });
        setSubjects(subjectList);
      }
    );

    // جلب الصفوف
    const unsubClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      const classList = [];
      snapshot.forEach(doc => {
        classList.push({ id: doc.id, ...doc.data() });
      });
      setClasses(classList);
    });

    // جلب الطلاب
    const unsubStudents = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'student')),
      (snapshot) => {
        const studentList = [];
        snapshot.forEach(doc => {
          studentList.push({ id: doc.id, ...doc.data() });
        });
        setStudents(studentList);
      }
    );

    // جلب العلامات
    const unsubGrades = onSnapshot(collection(db, 'grades'), (snapshot) => {
      const gradeList = [];
      snapshot.forEach(doc => {
        gradeList.push({ id: doc.id, ...doc.data() });
      });
      setGrades(gradeList);
    });

    return () => {
      unsubscribeSettings();
      unsubscribeAcademicYears();
      unsubSubjects();
      unsubClasses();
      unsubStudents();
      unsubGrades();
    };
  }, [teacherId]);

  // ====== ✅ حالات العام الدراسي والفصل ======
  const isSemesterClosed = useMemo(() => {
    if (!academicYearData) return false;
    const semesterKey = selectedSemester === 1 ? 'semester1' : 'semester2';
    const status = academicYearData[semesterKey]?.status;
    console.log(`🔍 TeacherGradesManager - الفصل ${selectedSemester} الحالة من academicYears:`, status);
    return status === 'closed';
  }, [academicYearData, selectedSemester]);

  const isYearActive = useMemo(() => {
    if (!academicYearData) {
      console.log('⚠️ TeacherGradesManager - لا توجد بيانات عام دراسي');
      return false;
    }
    const status = academicYearData?.status;
    console.log('🔍 TeacherGradesManager - حالة العام الدراسي من academicYears:', status);
    
    // إذا لم يتم تعيين حالة، اعتبره نشط
    if (status === undefined || status === null) {
      console.log('⚠️ TeacherGradesManager - حالة العام غير محددة، اعتبر نشط');
      return true;
    }
    return status === 'active';
  }, [academicYearData]);

  const isYearClosed = useMemo(() => {
    if (!academicYearData) return false;
    return academicYearData?.status === 'closed';
  }, [academicYearData]);

  const isYearNotStarted = useMemo(() => {
    if (!academicYearData) return false;
    return academicYearData?.status === 'pending' || 
           academicYearData?.status === 'not_started';
  }, [academicYearData]);

  // ====== الحصول على حالة العام ======
  const getYearStatusLabel = () => {
    if (isYearClosed) return { label: '🔒 مغلق', color: 'text-rose-400 bg-rose-500/20' };
    if (isYearActive) return { label: '✅ نشط', color: 'text-emerald-400 bg-emerald-500/20' };
    if (isYearNotStarted) return { label: '⏳ لم يبدأ', color: 'text-amber-400 bg-amber-500/20' };
    return { label: '✅ نشط', color: 'text-emerald-400 bg-emerald-500/20' };
  };

  const yearStatus = getYearStatusLabel();

  // ====== الحصول على حالة الفصل ======
  const getSemesterStatusLabel = () => {
    if (isSemesterClosed) return { label: '🔒 مغلق', color: 'text-rose-400 bg-rose-500/20' };
    return { label: '✅ مفتوح', color: 'text-emerald-400 bg-emerald-500/20' };
  };

  const semesterStatus = getSemesterStatusLabel();

  // ====== تصفية الصفوف والمواد ======
  const teacherClassIds = useMemo(() => {
    const ids = new Set();
    subjects.forEach(subject => {
      if (subject.classId) {
        ids.add(subject.classId);
      }
    });
    return ids;
  }, [subjects]);
  

  // ✅ ترتيب الصفوف أبجدياً (محسن للعربي وآمن ضد الفراغات)
const availableClasses = useMemo(() => {
  return classes
    .filter(cls => teacherClassIds.has(cls.id))
    .sort((a, b) => {
      const nameA = a.name || ''; // ضمان عدم وجود null
      const nameB = b.name || '';
      // (ملاحظة: إذا كانت أسماء الصفوف أرقاماً مثل "الصف 10"، localeCompare ستتعامل معها بشكل جيد)
      return nameA.localeCompare(nameB, 'ar', { sensitivity: 'base' });
    });
}, [classes, teacherClassIds]);
  const availableSubjects = useMemo(() => {
  if (!selectedClass) return [];
  return subjects
    .filter(sub => sub.classId === selectedClass)
    .sort((a, b) => a.name?.localeCompare(b.name) || 0);
}, [subjects, selectedClass]);

  // ====== الحقول الديناميكية ======
  const dynamicGradeFields = useMemo(() => {
    if (!selectedSubject || !gradingConfig) {
      return GRADE_FIELDS.map(f => ({ ...f }));
    }
    const classId = selectedClass || null;
    return getGradeFieldsForSubject(selectedSubject, classId, gradingConfig);
  }, [selectedSubject, selectedClass, gradingConfig]);

  // ====== الحصول على المجموع الكلي ======
  const getSubjectMaxTotal = useCallback(() => {
    if (!selectedSubject || !gradingConfig) return 100;
    const classId = selectedClass || null;
    return getTotalMaxForSubject(selectedSubject, classId, gradingConfig);
  }, [selectedSubject, selectedClass, gradingConfig]);

  // ====== الحصول على الحد الأقصى لكل حقل ======
  const getFieldMax = useCallback((fieldKey) => {
    if (!selectedSubject || !gradingConfig) {
      const field = GRADE_FIELDS.find(f => f.key === fieldKey);
      return field?.max || 0;
    }
    const classId = selectedClass || null;
    const fields = getGradeFieldsForSubject(selectedSubject, classId, gradingConfig);
    const field = fields.find(f => f.key === fieldKey);
    return field?.max || 0;
  }, [selectedSubject, selectedClass, gradingConfig]);

  // ====== فلترة الطلاب ======
  const filteredStudents = useMemo(() => {
  return students.filter(student => {
    if (selectedClass && student.classId !== selectedClass) return false;
    if (searchQuery && !student.fullName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
}, [students, selectedClass, searchQuery]);

  // ✅ ترتيب الطلاب أبجدياً حسب الاسم الكامل (محسن للعربي وآمن ضد الفراغات)
const sortedStudents = useMemo(() => {
  return [...filteredStudents].sort((a, b) => {
    const nameA = a.fullName || '';
    const nameB = b.fullName || '';
    return nameA.localeCompare(nameB, 'ar', { sensitivity: 'base' });
  });
}, [filteredStudents]); 
  // ====== الحصول على قيمة الحقل ======
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

  // ====== بدء التعديل ======
  const startEdit = useCallback((studentId, field, currentValue) => {
    if (isSemesterClosed) {
      setMessage({ type: 'error', text: `⚠️ الفصل الدراسي ${selectedSemester === 1 ? 'الأول' : 'الثاني'} مغلق. لا يمكن تعديل العلامات.` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    if (!isYearActive) {
      setMessage({ type: 'error', text: '⚠️ العام الدراسي غير نشط. لا يمكن تعديل العلامات.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
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
  }, [isSemesterClosed, isYearActive, selectedSemester]);

  // ====== تحديث القيمة المؤقتة ======
  const updateTempGrade = useCallback((studentId, field, value) => {
    const key = `${studentId}_${field}`;
    const numValue = Number(value);
    const maxValue = getFieldMax(field);
    
    if (!isNaN(numValue) && numValue >= 0 && numValue <= maxValue) {
      setTempGrades(prev => ({ ...prev, [key]: numValue }));
    } else if (value === '' || value === '-') {
      setTempGrades(prev => ({ ...prev, [key]: '' }));
    } else if (!isNaN(numValue) && numValue > maxValue) {
      setMessage({ 
        type: 'error', 
        text: `⚠️ القيمة ${numValue} تتجاوز الحد الأقصى (${maxValue})` 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  }, [getFieldMax]);

  // ====== حساب التقدير ======
  const getGrade = useCallback((percentage) => {
    if (percentage >= 90) return { label: 'ممتاز', key: 'A', color: 'text-emerald-400 bg-emerald-500/10' };
    if (percentage >= 80) return { label: 'جيد جداً', key: 'B', color: 'text-blue-400 bg-blue-500/10' };
    if (percentage >= 70) return { label: 'جيد', key: 'C', color: 'text-amber-400 bg-amber-500/10' };
    if (percentage >= 60) return { label: 'مقبول', key: 'D', color: 'text-orange-400 bg-orange-500/10' };
    return { label: 'ضعيف', key: 'F', color: 'text-rose-400 bg-rose-500/10' };
  }, []);

  // ====== التنقل بالأسهم ======
  const handleKeyDown = useCallback((e, studentId, field) => {
    const studentIndex = sortedStudents.findIndex(s => s.id === studentId);
    const fieldsToRender = dynamicGradeFields || GRADE_FIELDS;
    const fieldIndex = fieldsToRender.findIndex(f => f.key === field);
    
    const saveCurrentValue = () => {
      if (editingValue !== '') {
        updateTempGrade(studentId, field, editingValue);
      }
    };

    if (isSemesterClosed) {
      setMessage({ type: 'error', text: '⚠️ الفصل الدراسي مغلق' });
      return;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        saveCurrentValue();
        setEditingCell(null);
        setEditingValue('');
        if (fieldIndex < fieldsToRender.length - 1) {
          const nextField = fieldsToRender[fieldIndex + 1].key;
          setTimeout(() => navigateToCell(studentId, nextField), 50);
        } else if (studentIndex < sortedStudents.length - 1) {
          const nextStudent = sortedStudents[studentIndex + 1];
          const firstField = fieldsToRender[0].key;
          setTimeout(() => navigateToCell(nextStudent.id, firstField), 50);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        const key = `${studentId}_${field}`;
        const newTemp = { ...tempGrades };
        delete newTemp[key];
        setTempGrades(newTemp);
        setEditingCell(null);
        setEditingValue('');
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        saveCurrentValue();
        setEditingCell(null);
        setEditingValue('');
        if (studentIndex < sortedStudents.length - 1) {
          const nextStudent = sortedStudents[studentIndex + 1];
          setTimeout(() => navigateToCell(nextStudent.id, field), 50);
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        saveCurrentValue();
        setEditingCell(null);
        setEditingValue('');
        if (studentIndex > 0) {
          const prevStudent = sortedStudents[studentIndex - 1];
          setTimeout(() => navigateToCell(prevStudent.id, field), 50);
        }
        break;
        
      case 'ArrowRight':
        e.preventDefault();
        saveCurrentValue();
        setEditingCell(null);
        setEditingValue('');
        if (fieldIndex > 0) {
          const prevField = fieldsToRender[fieldIndex - 1].key;
          setTimeout(() => navigateToCell(studentId, prevField), 50);
        }
        break;
        
      case 'ArrowLeft':
        e.preventDefault();
        saveCurrentValue();
        setEditingCell(null);
        setEditingValue('');
        if (fieldIndex < fieldsToRender.length - 1) {
          const nextField = fieldsToRender[fieldIndex + 1].key;
          setTimeout(() => navigateToCell(studentId, nextField), 50);
        }
        break;
    }
  }, [sortedStudents, tempGrades, editingValue, isSemesterClosed, dynamicGradeFields]);

  // ====== التنقل بين الخلايا ======
  const navigateToCell = useCallback((studentId, field) => {
    const value = getFieldValue(studentId, field);
    setEditingCell({ studentId, field });
    setEditingValue(String(value));
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 50);
  }, [getFieldValue]);

  // ====== إلغاء التعديل ======
  const handleBlur = useCallback(() => {
    if (editingValue !== '') {
      updateTempGrade(editingCell?.studentId, editingCell?.field, editingValue);
    }
    setEditingCell(null);
    setEditingValue('');
  }, [editingValue, editingCell, updateTempGrade]);

  // ====== حفظ جميع العلامات ======
  const saveAllGrades = useCallback(async () => {
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
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    if (!isYearActive) {
      setMessage({ 
        type: 'error', 
        text: '⚠️ العام الدراسي غير نشط. لا يمكن حفظ التغييرات.' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    if (!academicYear) {
      setMessage({ 
        type: 'error', 
        text: '⚠️ لا يوجد عام دراسي محدد. الرجاء التواصل مع الإدارة.' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    setSaving(true);
    setMessage({ type: 'info', text: `⏳ جاري حفظ ${changes.length} علامة...` });

    try {
      const batch = writeBatch(db);
      let savedCount = 0;

      for (const key of changes) {
        const [studentId, fieldKey] = key.split('_');
        const value = tempGrades[key];
        
        if (value === '' || value === undefined || value === null) continue;
        
        const numValue = Number(value);
        if (isNaN(numValue) || numValue < 0) continue;
        
        const maxValue = getFieldMax(fieldKey);
        if (numValue > maxValue) {
          setMessage({ 
            type: 'error', 
            text: `⚠️ قيمة ${GRADE_FIELDS.find(f => f.key === fieldKey)?.label || fieldKey} تتجاوز الحد الأقصى (${maxValue})` 
          });
          continue;
        }
        
        const existingQuery = query(
          collection(db, 'grades'),
          where('studentId', '==', studentId),
          where('subjectId', '==', selectedSubject),
          where('semester', '==', selectedSemester),
          where('academicYear', '==', academicYear)
        );
        
        const existingSnapshot = await getDocs(existingQuery);
        const maxTotal = getSubjectMaxTotal();
        
        if (!existingSnapshot.empty) {
          const docId = existingSnapshot.docs[0].id;
          const docRef = doc(db, 'grades', docId);
          const oldData = existingSnapshot.docs[0].data();
          
          const updatedFields = { ...oldData, [fieldKey]: numValue };
          let total = 0;
          GRADE_FIELDS.forEach(f => {
            total += (updatedFields[f.key] || 0);
          });
          
          const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
          const grade = getGrade(percentage);
          
          batch.update(docRef, {
            [fieldKey]: numValue,
            total: total,
            maxTotal: maxTotal,
            percentage: percentage,
            grade: grade.key,
            updatedAt: new Date().toISOString(),
            updatedBy: teacherId
          });
          savedCount++;
        } else {
          const gradeData = {
            studentId: studentId,
            subjectId: selectedSubject,
            semester: selectedSemester,
            academicYear: academicYear,
            [fieldKey]: numValue,
            dailyExam1: 0,
            participation1: 0,
            midtermExam: 0,
            dailyExam2: 0,
            participation2: 0,
            finalExam: 0,
            total: numValue,
            maxTotal: maxTotal,
            percentage: 0,
            grade: 'F',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: teacherId,
            updatedBy: teacherId
          };
          
          const newDocRef = doc(collection(db, 'grades'));
          batch.set(newDocRef, gradeData);
          savedCount++;
        }
      }

      await batch.commit();
      if (savedCount > 0) {
      try {
      const subjectName = subjects.find(s => s.id === selectedSubject)?.name || 'غير محدد';
       const studentIds = changes.map(key => key.split('_')[0]);
    
       await notifyGradesAdded(
        {
        teacherId: teacherId,
        subjectId: selectedSubject,
        studentIds: studentIds,
        academicYear: academicYear
        },
        teacherData?.fullName || 'معلم',
        subjectName,
       selectedSemester
     );
    
       console.log('✅ تم إرسال إشعار للأدمن والطلاب');
       } catch (error) {
       console.error('❌ خطأ في إرسال الإشعار:', error);
       }
      }
      setTempGrades({});
      setEditingCell(null);
      setEditingValue('');
      
      setMessage({ 
        type: 'success', 
        text: `✅ تم حفظ ${savedCount} علامة بنجاح في الفصل ${selectedSemester === 1 ? 'الأول' : 'الثاني'}` 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);

    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage({ type: 'error', text: '❌ خطأ في حفظ العلامات: ' + error.message });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setSaving(false);
    }
  }, [tempGrades, selectedSubject, selectedSemester, academicYear, teacherId, isSemesterClosed, isYearActive, getSubjectMaxTotal, getFieldMax, getGrade]);

  // ====== إرسال إشعار للأدمن ======
  const notifyAdmin = useCallback(async (note) => {
    try {
      const adminUsers = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
      
      const notifications = [];
      adminUsers.forEach(doc => {
        notifications.push({
          userId: doc.id,
          type: 'info',
          title: '📝 تم إدخال العلامات',
          message: `قام المعلم ${teacherData?.fullName || 'معلم'} بإدخال علامات ${selectedSubject ? 'مادة ' + subjects.find(s => s.id === selectedSubject)?.name : ''} للفصل ${selectedSemester === 1 ? 'الأول' : 'الثاني'}`,
          link: '/admin/grades-manage',
          isRead: false,
          createdAt: new Date().toISOString(),
          senderId: teacherId,
          note: note || '',
          subjectId: selectedSubject,
          semester: selectedSemester,
          academicYear: academicYear
        });
      });

      for (const notif of notifications) {
        await addDoc(collection(db, 'notifications'), notif);
      }

      setShowNotifyModal(false);
      setMessage({ 
        type: 'success', 
        text: '✅ تم إرسال إشعار للإدارة بنجاح!' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage({ type: 'error', text: '❌ خطأ في إرسال الإشعار: ' + error.message });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  }, [teacherId, selectedSubject, selectedSemester, academicYear, subjects, teacherData]);

  // ====== طباعة الكشف ======
  const handlePrint = useCallback(() => {
    if (!selectedSubject || !selectedClass) {
      setMessage({ type: 'error', text: '❌ الرجاء اختيار المادة والصف أولاً' });
      return;
    }
    
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return;
    
    const classData = classes.find(c => c.id === selectedClass);
    const subjectData = subjects.find(s => s.id === selectedSubject);
    const studentsList = students.filter(s => s.classId === selectedClass);
    
    if (studentsList.length === 0) {
      setMessage({ type: 'error', text: '❌ لا يوجد طلاب في هذا الصف' });
      return;
    }

    const maxTotal = getSubjectMaxTotal();
    const fieldsToRender = dynamicGradeFields || GRADE_FIELDS;
    
    const headerFields = fieldsToRender.map(f => 
      `<th>${f.label}<br><span style="font-size:10px;font-weight:normal;">(${f.max || 0})</span></th>`
    ).join('');

    const rows = studentsList.map(student => {
      const grade = grades.find(g => 
        g.studentId === student.id && 
        g.subjectId === selectedSubject && 
        g.semester === selectedSemester &&
        g.academicYear === academicYear
      );
      
      const fields = {};
      fieldsToRender.forEach(f => {
        fields[f.key] = grade?.[f.key] || 0;
      });
      
      let total = 0;
      fieldsToRender.forEach(f => {
        total += fields[f.key];
      });
      
      const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
      const gradeInfo = getGrade(percentage);
      
      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${student.fullName}</td>
          ${fieldsToRender.map(f => `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${fields[f.key]}</td>`).join('')}
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #2e7d32;">${total} / ${maxTotal}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
            <span style="padding: 2px 8px; border-radius: 12px; background: ${percentage >= 90 ? '#e8f5e9' : percentage >= 80 ? '#e3f2fd' : percentage >= 70 ? '#fff3e0' : percentage >= 60 ? '#fff8e1' : '#ffebee'}; color: ${percentage >= 90 ? '#2e7d32' : percentage >= 80 ? '#1565c0' : percentage >= 70 ? '#e65100' : percentage >= 60 ? '#f57f17' : '#c62828'};">
            ${gradeInfo.label}
          </span>
        </td>
      </tr>
    `;
    }).join('');

    const semesterLabel = selectedSemester === 1 ? 'الفصل الدراسي الأول' : 'الفصل الدراسي الثاني';
    const className = classData?.name || 'غير محدد';
    const subjectName = subjectData?.name || 'غير محدد';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>كشف العلامات - ${className}</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #fff; margin: 0; }
            .container { max-width: 1100px; margin: 0 auto; direction: rtl; }
            .header { text-align: center; border-bottom: 3px solid #1a237e; padding-bottom: 15px; margin-bottom: 20px; }
            .school-name { font-size: 24px; font-weight: bold; color: #1a237e; }
            .title { font-size: 20px; font-weight: bold; margin: 10px 0; color: #1a237e; }
            .info { text-align: center; color: #555; font-size: 14px; margin-bottom: 15px; }
            .info span { margin: 0 10px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px; }
            th { background: #1a237e; color: white; padding: 10px 8px; border: 1px solid #1a237e; text-align: center; font-weight: bold; }
            td { padding: 8px; border: 1px solid #ddd; text-align: center; }
            tr:nth-child(even) { background: #f8f9fa; }
            .footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 2px solid #1a237e; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="school-name">مدرستك الثانوية</div>
              <div class="title">كشف العلامات</div>
              <div class="info">
                <span>📚 المادة: ${subjectName}</span>
                <span>📅 الفصل: ${semesterLabel}</span>
                <span>📆 العام الدراسي: ${academicYear}</span>
                <span>👨‍🎓 عدد الطلاب: ${studentsList.length}</span>
                <span>📊 المجموع الكلي: ${maxTotal} علامة</span>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>اسم الطالب</th>
                  ${headerFields}
                  <th>المجموع<br><span style="font-size:10px;font-weight:normal;">(${maxTotal})</span></th>
                  <th>التقدير</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="footer">
              تم إنشاء هذا التقرير بواسطة المنصة التعليمية الذكية<br>
              تاريخ الطباعة: ${new Date().toLocaleDateString('ar')}
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }, [selectedSubject, selectedClass, selectedSemester, academicYear, classes, subjects, students, grades, getSubjectMaxTotal, getFieldMax, getGrade, dynamicGradeFields]);

  // ====== معالجات التغيير ======
  const handleClassChange = useCallback((classId) => {
    setSelectedClass(classId);
    setSelectedSubject('');
    setTempGrades({});
    setEditingCell(null);
    setEditingValue('');
  }, []);

  const handleSubjectChange = useCallback((subjectId) => {
    setSelectedSubject(subjectId);
    setTempGrades({});
    setEditingCell(null);
    setEditingValue('');
  }, []);

  // ====== عرض التحميل ======
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-slate-400 text-sm mr-3">جاري تحميل البيانات...</p>
      </div>
    );
  }

  const totalChanges = Object.keys(tempGrades).length;

  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
      {showNotifyModal && (
        <NotifyAdminModal
          onConfirm={notifyAdmin}
          onCancel={() => setShowNotifyModal(false)}
          darkMode={darkMode}
          subjectName={subjects.find(s => s.id === selectedSubject)?.name || ''}
        />
      )}

      {/* ====== العنوان ====== */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            إدارة العلامات
            <span className="text-[10px] font-normal bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Keyboard className="w-3 h-3" />
              ⌨️ تنقل بالأسهم
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            العام الدراسي: <span className="text-white font-bold">{academicYear || 'غير محدد'}</span>
            <span className={`mr-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${yearStatus.color}`}>
              {yearStatus.label}
            </span>
            <span className={`mr-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${semesterStatus.color} border ${isSemesterClosed ? 'border-rose-500/30' : 'border-emerald-500/30'}`}>
              {semesterStatus.label} (الفصل {selectedSemester})
            </span>
            {selectedSubject && selectedClass && (
              <span className="text-emerald-400 mr-2">
                📊 المجموع الكلي: {getSubjectMaxTotal()} علامة
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {totalChanges > 0 && (
            <span className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-full border border-amber-500/30">
              {totalChanges} تعديلات معلقة
            </span>
          )}

          <button
            onClick={saveAllGrades}
            disabled={saving || totalChanges === 0 || isSemesterClosed || !isYearActive}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <SaveAll className="w-3.5 h-3.5" />
            )}
            {saving ? 'جاري الحفظ...' : 'حفظ الكل'}
          </button>

          <button
            onClick={() => setShowNotifyModal(true)}
            disabled={totalChanges === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20"
          >
            <Send className="w-3.5 h-3.5" />
            إشعار الأدمن
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20"
            disabled={!selectedClass || !selectedSubject}
          >
            <Printer className="w-3.5 h-3.5" />
            طباعة
          </button>

          <button
            onClick={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 1000);
            }}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* ====== رسائل الحالة ====== */}
      {isSemesterClosed && (
        <div className="mb-4 p-4 bg-rose-500/10 rounded-xl border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>
            ⚠️ الفصل الدراسي {selectedSemester === 1 ? 'الأول' : 'الثاني'} مغلق من قبل الإدارة.
            لا يمكنك تعديل العلامات حالياً.
          </span>
        </div>
      )}

      {!isYearActive && !isYearClosed && !isYearNotStarted && (
        <div className="mb-4 p-4 bg-amber-500/10 rounded-xl border border-amber-500/30 text-amber-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>
            ⚠️ العام الدراسي غير نشط. يرجى التواصل مع الإدارة.
          </span>
        </div>
      )}

      {message.text && (
        <div className={`mb-4 p-3 rounded-xl flex items-start gap-2 text-sm ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
            : message.type === 'info'
            ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
            : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ====== الفلاتر ====== */}
      <TeacherGradeFilters
        selectedClass={selectedClass}
        setSelectedClass={handleClassChange}
        selectedSubject={selectedSubject}
        setSelectedSubject={handleSubjectChange}
        selectedSemester={selectedSemester}
        setSelectedSemester={setSelectedSemester}
        academicYear={academicYear}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        classes={availableClasses}
        subjects={availableSubjects}
        isSemesterClosed={isSemesterClosed}
      />

      {/* ====== تعليمات ====== */}
      <div className="mb-4 p-3 bg-blue-500/10 rounded-xl border border-blue-500/30">
        <div className="flex items-center gap-4 flex-wrap text-xs text-blue-400">
          <span className="font-bold">⌨️ اختصارات لوحة المفاتيح:</span>
          <span>⬆️ ⬇️ التنقل بين الطلاب</span>
          <span>⬅️ ➡️ التنقل بين العلامات</span>
          <span>⏎ Enter حفظ والانتقال للخلية التالية</span>
          <span>⎋ Esc إلغاء التعديل</span>
          <span className="text-amber-400">* العلامات المعدلة تظهر باللون البرتقالي</span>
          {isSemesterClosed && (
            <span className="text-rose-400">⚠️ الفصل {selectedSemester} مغلق - لا يمكن التعديل</span>
          )}
          {selectedSubject && selectedClass && (
            <span className="text-emerald-400">📊 المجموع الكلي: {getSubjectMaxTotal()} علامة</span>
          )}
        </div>
      </div>

      {/* ====== جدول العلامات ====== */}
      {selectedSubject && selectedClass ? (
        <TeacherGradeTable
          students={sortedStudents}
          getFieldValue={getFieldValue}
          startEdit={startEdit}
          updateTempGrade={updateTempGrade}
          editingCell={editingCell}
          editingValue={editingValue}
          setEditingValue={setEditingValue}
          inputRef={inputRef}
          handleKeyDown={handleKeyDown}
          handleBlur={handleBlur}
          isSemesterClosed={isSemesterClosed}
          tempGrades={tempGrades}
          selectedSubject={selectedSubject}
          selectedClass={selectedClass}
          gradingConfig={gradingConfig}
          getSubjectMaxTotal={getSubjectMaxTotal}
          getFieldMax={getFieldMax}
          dynamicGradeFields={dynamicGradeFields}
        />
      ) : (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            {!selectedClass ? 'الرجاء اختيار صف أولاً' : 'الرجاء اختيار مادة'}
          </p>
        </div>
      )}

      {/* ====== ملخص العلامات ====== */}
      {selectedSubject && selectedClass && (
        <TeacherGradeSummary
          students={sortedStudents}
          grades={grades}
          selectedSubject={selectedSubject}
          selectedSemester={selectedSemester}
          academicYear={academicYear}
          gradingConfig={gradingConfig}
          getSubjectMaxTotal={getSubjectMaxTotal}
        />
      )}
    </div>
  );
}