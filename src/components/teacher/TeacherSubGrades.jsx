// src/components/teacher/TeacherSubGrades.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, doc, getDocs, getDoc, updateDoc, addDoc,
  query, where, onSnapshot, writeBatch, deleteDoc 
} from 'firebase/firestore';
import { 
  BookOpen, Plus, Trash2, Save, Calculator, 
  CheckCircle, Loader2, AlertCircle, RefreshCw,
  FileText, Users, School, Calendar, ChevronDown,
  ChevronUp, Edit3, X, Eye, Award, Keyboard,
  History, Archive, Lock, Unlock
} from 'lucide-react';
import { getGradeFieldsForSubject, getTotalMaxForSubject } from '../admin/GradesManager/constants/gradeFields';

export default function TeacherSubGrades({ teacherId, darkMode, teacherData }) {
  // ====== البيانات الأساسية ======
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // ====== بيانات المعلم ======
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  
  // ====== الإعدادات ======
  const [academicYear, setAcademicYear] = useState('');
  const [academicYearData, setAcademicYearData] = useState(null);
  const [schoolSettings, setSchoolSettings] = useState(null);
  const [gradingConfig, setGradingConfig] = useState(null);
  
  // ====== الفلترة ======
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState('');
  
  // ====== الامتحانات الفرعية ======
  const [subExams, setSubExams] = useState([]);
  const [savingSubExams, setSavingSubExams] = useState(false);
  const [newSubExam, setNewSubExam] = useState({
    name: '',
    maxScore: 10,
    mainField: 'dailyExam1',
    scores: {}
  });

  // ====== حالة التعديل ======
  const [editingCell, setEditingCell] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const inputRef = useRef(null);

  // ====== الحقول الرئيسية ======
  const [mainFields, setMainFields] = useState([]);

  // ====== عرض النسخة المحفوظة ======
  const [showArchived, setShowArchived] = useState(false);

  // ====== جلب البيانات ======
  useEffect(() => {
    if (!teacherId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    console.log('🔍 TeacherSubGrades - بدء جلب الإعدادات...');

    const unsubscribeSettings = onSnapshot(
      doc(db, 'schoolSettings', 'settings'),
      (docSnap) => {
        if (!isMounted) return;
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('📋 TeacherSubGrades - بيانات schoolSettings:', data);
          setSchoolSettings(data);
          
          if (data.gradingConfig) {
            setGradingConfig(data.gradingConfig);
          }
        }
        setLoading(false);
      },
      (error) => {
        console.error('❌ خطأ:', error);
        if (isMounted) setLoading(false);
      }
    );

    const unsubscribeAcademicYears = onSnapshot(
      collection(db, 'academicYears'),
      (snapshot) => {
        if (!isMounted) return;
        console.log('📡 TeacherSubGrades - تم استلام بيانات academicYears');
        
        if (!snapshot.empty) {
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
            console.log('✅ TeacherSubGrades - العام الدراسي:', latestYear);
            setAcademicYearData(latestYear);
            if (latestYear.yearName) {
              setAcademicYear(latestYear.yearName);
            }
          }
        }
      },
      (error) => {
        console.error('❌ خطأ في جلب السنوات الدراسية:', error);
      }
    );

    const unsubSubjects = onSnapshot(
      query(collection(db, 'subjects'), where('teacherId', '==', teacherId)),
      (snapshot) => {
        if (!isMounted) return;
        const list = [];
        snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setSubjects(list);
      }
    );

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      if (!isMounted) return;
      const list = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setClasses(list);
    });

    const unsubStudents = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'student')),
      (snapshot) => {
        if (!isMounted) return;
        const list = [];
        snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setStudents(list);
      }
    );

    const unsubGrades = onSnapshot(collection(db, 'grades'), (snapshot) => {
      if (!isMounted) return;
      const list = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setGrades(list);
    });

    const unsubSubExams = onSnapshot(
      query(collection(db, 'subGrades'), where('teacherId', '==', teacherId)),
      (snapshot) => {
        if (!isMounted) return;
        const list = [];
        snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        console.log('📝 الامتحانات الفرعية:', list);
        setSubExams(list);
      }
    );

    return () => {
      isMounted = false;
      unsubscribeSettings();
      unsubscribeAcademicYears();
      unsubSubjects();
      unsubClasses();
      unsubStudents();
      unsubGrades();
      unsubSubExams();
    };
  }, [teacherId]);

  // ====== تحديث الحقول الرئيسية ======
  useEffect(() => {
    if (!selectedSubject || !gradingConfig) {
      setMainFields([
        { key: 'dailyExam1', label: 'امتحان يومي 1', max: 10 },
        { key: 'participation1', label: 'مشاركة 1', max: 10 },
        { key: 'midtermExam', label: 'امتحان شهري', max: 20 },
        { key: 'dailyExam2', label: 'امتحان يومي 2', max: 10 },
        { key: 'participation2', label: 'مشاركة 2', max: 10 },
        { key: 'finalExam', label: 'امتحان فصلي', max: 40 }
      ]);
      return;
    }

    const classId = selectedClass || null;
    const fields = getGradeFieldsForSubject(selectedSubject, classId, gradingConfig);
    
    if (fields && fields.length > 0) {
      setMainFields(fields);
    }
  }, [selectedSubject, selectedClass, gradingConfig]);

  // ====== حالات العام والفصل ======
  const isSemesterClosed = useMemo(() => {
    if (!academicYearData) return false;
    const semesterKey = selectedSemester === 1 ? 'semester1' : 'semester2';
    return academicYearData[semesterKey]?.status === 'closed';
  }, [academicYearData, selectedSemester]);

  const isYearActive = useMemo(() => {
    if (!academicYearData) return false;
    const status = academicYearData?.status;
    if (status === undefined || status === null) return true;
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

  // ====== حالات العرض ======
  const getYearStatusLabel = () => {
    if (isYearClosed) return { label: '🔒 مغلق', color: 'text-rose-400 bg-rose-500/20' };
    if (isYearActive) return { label: '✅ نشط', color: 'text-emerald-400 bg-emerald-500/20' };
    if (isYearNotStarted) return { label: '⏳ لم يبدأ', color: 'text-amber-400 bg-amber-500/20' };
    return { label: '✅ نشط', color: 'text-emerald-400 bg-emerald-500/20' };
  };

  const yearStatus = getYearStatusLabel();

  const getSemesterStatusLabel = () => {
    if (isSemesterClosed) return { label: '🔒 مغلق', color: 'text-rose-400 bg-rose-500/20' };
    return { label: '✅ مفتوح', color: 'text-emerald-400 bg-emerald-500/20' };
  };

  const semesterStatus = getSemesterStatusLabel();

  // ====== الفلترة ======
  const teacherClassIds = useMemo(() => {
  const ids = new Set();
  subjects.forEach(s => {
    if (s.classId) ids.add(s.classId);
  });
  return ids;
}, [subjects]);

  // ✅ ترتيب الصفوف أبجدياً (محسن)
const availableClasses = useMemo(() => {
  return classes
    .filter(c => teacherClassIds.has(c.id))
    .sort((a, b) => a.name?.localeCompare(b.name, 'ar', { sensitivity: 'base' }) || 0);
}, [classes, teacherClassIds]);

// ✅ ترتيب المواد أبجدياً (محسن)
const availableSubjects = useMemo(() => {
  if (!selectedClass) return [];
  return subjects
    .filter(s => s.classId === selectedClass)
    .sort((a, b) => a.name?.localeCompare(b.name, 'ar', { sensitivity: 'base' }) || 0);
}, [subjects, selectedClass]);

// ✅ ترتيب الطلاب أبجدياً حسب الاسم الكامل (محسن)
const availableStudents = useMemo(() => {
  if (!selectedClass) return [];
  return students
    .filter(s => s.classId === selectedClass)
    .sort((a, b) => a.fullName?.localeCompare(b.fullName, 'ar', { sensitivity: 'base' }) || 0);
}, [students, selectedClass]);
  // ====== تجميع الامتحانات ======
  const groupedSubExams = useMemo(() => {
    const groups = {};
    let filtered = subExams.filter(exam => {
      if (selectedSubject && exam.subjectId !== selectedSubject) return false;
      if (selectedSemester && exam.semester !== selectedSemester) return false;
      return true;
    });

    if (!showArchived) {
      filtered = filtered.filter(exam => !exam.archived);
    }

    filtered.forEach(exam => {
      const field = exam.mainField || 'dailyExam1';
      if (!groups[field]) {
        groups[field] = [];
      }
      groups[field].push(exam);
    });

    return groups;
  }, [subExams, selectedSubject, selectedSemester, showArchived]);

  // ====== ✅ إضافة امتحان فرعي ======
  const handleAddSubExam = async () => {
    if (isSemesterClosed) {
      setMessage({ type: 'error', text: `⚠️ الفصل الدراسي ${selectedSemester === 1 ? 'الأول' : 'الثاني'} مغلق. لا يمكن إضافة امتحانات جديدة.` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    if (!isYearActive) {
      setMessage({ type: 'error', text: '⚠️ العام الدراسي غير نشط. لا يمكن إضافة امتحانات جديدة.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    if (!newSubExam.name.trim()) {
      setMessage({ type: 'error', text: '❌ الرجاء إدخال اسم الامتحان' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    if (!selectedSubject) {
      setMessage({ type: 'error', text: '❌ الرجاء اختيار المادة' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    if (!selectedClass) {
      setMessage({ type: 'error', text: '❌ الرجاء اختيار الصف' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    if (!academicYear) {
      setMessage({ type: 'error', text: '❌ العام الدراسي غير محدد' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    setSaving(true);
    try {
      const examData = {
        name: newSubExam.name,
        maxScore: Number(newSubExam.maxScore),
        teacherId: teacherId,
        subjectId: selectedSubject,
        classId: selectedClass,
        semester: selectedSemester,
        academicYear: academicYear,
        mainField: newSubExam.mainField || 'dailyExam1',
        scores: {},
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'subGrades'), examData);
      
      setNewSubExam({
        name: '',
        maxScore: 10,
        mainField: 'dailyExam1',
        scores: {}
      });
      
      setMessage({ type: 'success', text: '✅ تم إضافة الامتحان الفرعي بنجاح!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage({ type: 'error', text: '❌ خطأ في إضافة الامتحان: ' + error.message });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setSaving(false);
    }
  };

  // ====== حذف امتحان فرعي ======
  const handleDeleteSubExam = async (examId) => {
    if (isSemesterClosed) {
      setMessage({ type: 'error', text: `⚠️ الفصل الدراسي ${selectedSemester === 1 ? 'الأول' : 'الثاني'} مغلق. لا يمكن حذف الامتحانات.` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    if (!confirm('هل أنت متأكد من حذف هذا الامتحان الفرعي؟')) return;
    
    try {
      await deleteDoc(doc(db, 'subGrades', examId));
      setMessage({ type: 'success', text: '✅ تم حذف الامتحان الفرعي بنجاح!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage({ type: 'error', text: '❌ خطأ في حذف الامتحان: ' + error.message });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  // ====== أرشفة امتحان فرعي ======
  const handleArchiveSubExam = async (examId) => {
    try {
      const examRef = doc(db, 'subGrades', examId);
      await updateDoc(examRef, {
        archived: true,
        archivedAt: new Date().toISOString()
      });
      setMessage({ type: 'success', text: '✅ تم أرشفة الامتحان الفرعي بنجاح!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage({ type: 'error', text: '❌ خطأ في أرشفة الامتحان: ' + error.message });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  // ====== استعادة امتحان فرعي ======
  const handleRestoreSubExam = async (examId) => {
    try {
      const examRef = doc(db, 'subGrades', examId);
      await updateDoc(examRef, {
        archived: false,
        restoredAt: new Date().toISOString()
      });
      setMessage({ type: 'success', text: '✅ تم استعادة الامتحان الفرعي بنجاح!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage({ type: 'error', text: '❌ خطأ في استعادة الامتحان: ' + error.message });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  // ====== تحديث درجة طالب ======
  const updateStudentScore = async (examId, studentId, score) => {
    if (isSemesterClosed) {
      setMessage({ type: 'error', text: `⚠️ الفصل الدراسي ${selectedSemester === 1 ? 'الأول' : 'الثاني'} مغلق. لا يمكن تعديل العلامات.` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const exam = subExams.find(e => e.id === examId);
    if (!exam) return;

    const maxScore = exam.maxScore || 10;
    const numScore = Number(score);
    if (score !== '' && (isNaN(numScore) || numScore < 0 || numScore > maxScore)) {
      setMessage({ type: 'error', text: `⚠️ القيمة غير صالحة (0-${maxScore})` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    try {
      const updatedScores = { ...exam.scores };
      if (score === '' || score === null || score === undefined) {
        delete updatedScores[studentId];
      } else {
        updatedScores[studentId] = numScore;
      }
      await updateDoc(doc(db, 'subGrades', examId), {
        scores: updatedScores,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage({ type: 'error', text: '❌ خطأ في تحديث الدرجة: ' + error.message });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  // ====== بدء التعديل ======
  const startEdit = (examId, studentId, currentValue) => {
    if (isSemesterClosed) {
      setMessage({ type: 'error', text: `⚠️ الفصل الدراسي ${selectedSemester === 1 ? 'الأول' : 'الثاني'} مغلق. لا يمكن تعديل العلامات.` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    setEditingCell({ examId, studentId });
    setEditingValue(String(currentValue || ''));
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 50);
  };

  // ====== التنقل بالأسهم ======
  const handleKeyDown = (e, examId, studentId) => {
    const studentIndex = availableStudents.findIndex(s => s.id === studentId);
    const exams = subExams.filter(e => e.id === examId);
    const examIndex = exams.findIndex(e => e.id === examId);
    
    const saveCurrentValue = () => {
      if (editingValue !== '') {
        updateStudentScore(examId, studentId, editingValue);
      }
    };

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        saveCurrentValue();
        setEditingCell(null);
        setEditingValue('');
        break;
        
      case 'Escape':
        e.preventDefault();
        setEditingCell(null);
        setEditingValue('');
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        saveCurrentValue();
        setEditingCell(null);
        setEditingValue('');
        if (studentIndex < availableStudents.length - 1) {
          const nextStudent = availableStudents[studentIndex + 1];
          setTimeout(() => startEdit(examId, nextStudent.id, ''), 50);
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        saveCurrentValue();
        setEditingCell(null);
        setEditingValue('');
        if (studentIndex > 0) {
          const prevStudent = availableStudents[studentIndex - 1];
          setTimeout(() => startEdit(prevStudent.id, ''), 50);
        }
        break;
        
      case 'ArrowRight':
        e.preventDefault();
        saveCurrentValue();
        setEditingCell(null);
        setEditingValue('');
        const allExams = subExams.filter(e => e.mainField === exams[0]?.mainField && !e.archived);
        if (examIndex < allExams.length - 1) {
          const nextExam = allExams[examIndex + 1];
          setTimeout(() => startEdit(nextExam.id, studentId, ''), 50);
        }
        break;
        
      case 'ArrowLeft':
        e.preventDefault();
        saveCurrentValue();
        setEditingCell(null);
        setEditingValue('');
        const prevExams = subExams.filter(e => e.mainField === exams[0]?.mainField && !e.archived);
        if (examIndex > 0) {
          const prevExam = prevExams[examIndex - 1];
          setTimeout(() => startEdit(prevExam.id, studentId, ''), 50);
        }
        break;
    }
  };

  // ====== إلغاء التعديل ======
  const handleBlur = () => {
    if (editingValue !== '') {
      updateStudentScore(editingCell?.examId, editingCell?.studentId, editingValue);
    }
    setEditingCell(null);
    setEditingValue('');
  };

  // ====== حساب العلامة النهائية ======
  const calculateFinalGrade = (studentId, mainField) => {
    const exams = subExams.filter(e => 
      e.mainField === mainField && 
      e.subjectId === selectedSubject &&
      e.semester === selectedSemester &&
      !e.archived
    );
    
    if (exams.length === 0) return 0;
    
    let totalScore = 0;
    let totalMax = 0;
    
    exams.forEach(exam => {
      const score = exam.scores?.[studentId] || 0;
      const maxScore = exam.maxScore || 10;
      const percentage = maxScore > 0 ? (score / maxScore) : 0;
      const mainFieldMax = mainFields.find(f => f.key === mainField)?.max || 10;
      totalScore += (percentage * mainFieldMax);
      totalMax += mainFieldMax;
    });
    
    const avg = exams.length > 0 ? (totalScore / exams.length) : 0;
    return Math.round(avg);
  };

  // ====== اعتماد جميع العلامات ======
  const handleApproveAllGrades = async () => {
    if (isSemesterClosed) {
      setMessage({ type: 'error', text: `⚠️ الفصل الدراسي ${selectedSemester === 1 ? 'الأول' : 'الثاني'} مغلق. لا يمكن اعتماد العلامات.` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    if (!isYearActive) {
      setMessage({ type: 'error', text: '⚠️ العام الدراسي غير نشط. لا يمكن اعتماد العلامات.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    if (!selectedSubject || !selectedClass) {
      setMessage({ type: 'error', text: '❌ الرجاء اختيار الصف والمادة أولاً' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    if (!academicYear) {
      setMessage({ type: 'error', text: '❌ العام الدراسي غير محدد. الرجاء التواصل مع الإدارة.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const mainFieldKeys = Object.keys(groupedSubExams);
    if (mainFieldKeys.length === 0) {
      setMessage({ type: 'error', text: '⚠️ لا توجد امتحانات فرعية لحساب العلامات' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    setSavingSubExams(true);
    let successCount = 0;

    try {
      const batch = writeBatch(db);

      for (const student of availableStudents) {
        for (const mainField of mainFieldKeys) {
          const finalGrade = calculateFinalGrade(student.id, mainField);
          
          if (finalGrade === 0) continue;

          const existingQuery = query(
            collection(db, 'grades'),
            where('studentId', '==', student.id),
            where('subjectId', '==', selectedSubject),
            where('semester', '==', selectedSemester),
            where('academicYear', '==', academicYear)
          );
          
          const existingSnapshot = await getDocs(existingQuery);
          
          if (!existingSnapshot.empty) {
            const docId = existingSnapshot.docs[0].id;
            const docRef = doc(db, 'grades', docId);
            const oldData = existingSnapshot.docs[0].data();
            
            const updatedFields = { ...oldData, [mainField]: finalGrade };
            let total = 0;
            mainFields.forEach(f => {
              total += (updatedFields[f.key] || 0);
            });
            
            const maxTotal = 100;
            const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
            const grade = getGrade(percentage);
            
            batch.update(docRef, {
              [mainField]: finalGrade,
              total: total,
              percentage: percentage,
              grade: grade.key,
              updatedAt: new Date().toISOString(),
              updatedBy: teacherId
            });
            successCount++;
          } else {
            const gradeData = {
              studentId: student.id,
              subjectId: selectedSubject,
              semester: selectedSemester,
              academicYear: academicYear,
              [mainField]: finalGrade,
              dailyExam1: 0,
              participation1: 0,
              midtermExam: 0,
              dailyExam2: 0,
              participation2: 0,
              finalExam: 0,
              total: finalGrade,
              maxTotal: 100,
              percentage: 0,
              grade: 'F',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: teacherId,
              updatedBy: teacherId
            };
            
            const newDocRef = doc(collection(db, 'grades'));
            batch.set(newDocRef, gradeData);
            successCount++;
          }
        }
      }

      await batch.commit();
      
      setMessage({ 
        type: 'success', 
        text: `✅ تم اعتماد ${successCount} علامة بنجاح في العام الدراسي ${academicYear}!` 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      
    } catch (error) {
      console.error('❌ خطأ:', error);
      setMessage({ type: 'error', text: '❌ خطأ في اعتماد العلامات: ' + error.message });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setSavingSubExams(false);
    }
  };

  // ====== حساب التقدير ======
  const getGrade = (percentage) => {
    if (percentage >= 90) return { label: 'ممتاز', key: 'A', color: 'text-emerald-400 bg-emerald-500/10' };
    if (percentage >= 80) return { label: 'جيد جداً', key: 'B', color: 'text-blue-400 bg-blue-500/10' };
    if (percentage >= 70) return { label: 'جيد', key: 'C', color: 'text-amber-400 bg-amber-500/10' };
    if (percentage >= 60) return { label: 'مقبول', key: 'D', color: 'text-orange-400 bg-orange-500/10' };
    return { label: 'ضعيف', key: 'F', color: 'text-rose-400 bg-rose-500/10' };
  };

  // ====== عرض التحميل ======
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-slate-400 text-sm mr-3">جاري تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
      {/* ====== العنوان ====== */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            دفاتر العلامات
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
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              showArchived 
                ? 'bg-amber-600/30 text-amber-400 border border-amber-500/30' 
                : 'bg-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {showArchived ? <Eye className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
            {showArchived ? 'إخفاء المحفوظات' : 'عرض المحفوظات'}
          </button>
          <span className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
            {subExams.filter(e => !e.archived).length} امتحان نشط
          </span>
        </div>
      </div>

      {/* ====== رسائل الحالة ====== */}
      {isSemesterClosed && (
        <div className="mb-4 p-4 bg-rose-500/10 rounded-xl border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3">
          <Lock className="w-5 h-5 flex-shrink-0" />
          <span>
            ⚠️ الفصل الدراسي {selectedSemester === 1 ? 'الأول' : 'الثاني'} مغلق من قبل الإدارة.
            لا يمكنك إضافة أو تعديل أو حذف الامتحانات الفرعية حالياً.
            {showArchived && ' يمكنك عرض الامتحانات المحفوظة.'}
          </span>
        </div>
      )}

      {!isYearActive && !isYearClosed && (
        <div className="mb-4 p-4 bg-amber-500/10 rounded-xl border border-amber-500/30 text-amber-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>
            ⏳ العام الدراسي لم يبدأ بعد. يرجى التواصل مع الإدارة لبدء العام الدراسي.
          </span>
        </div>
      )}

      {/* ====== عرض الرسائل ====== */}
      {message.text && (
        <div className={`mb-4 p-3 rounded-xl flex items-start gap-2 text-sm ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
            : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ====== ✅ الفلاتر - غير معطلة دائماً ====== */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-slate-900 rounded-xl border border-slate-800">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-slate-400 mb-1">الصف</label>
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedSubject('');
              setSelectedStudent('');
            }}
            className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">اختر الصف</option>
            {availableClasses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-slate-400 mb-1">المادة</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            disabled={!selectedClass}
          >
            <option value="">اختر المادة</option>
            {availableSubjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="min-w-[120px]">
          <label className="block text-xs text-slate-400 mb-1">الفصل</label>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(Number(e.target.value))}
            className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value={1}>الفصل الأول</option>
            <option value={2}>الفصل الثاني</option>
          </select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-slate-400 mb-1">الطالب</label>
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            disabled={!selectedClass}
          >
            <option value="">جميع الطلاب</option>
            {availableStudents.map(s => (
              <option key={s.id} value={s.id}>{s.fullName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ====== إضافة امتحان فرعي ====== */}
      {!showArchived && (
        <div className="mb-6 p-4 bg-slate-900 rounded-xl border border-slate-800">
          <h4 className="text-xs font-bold text-blue-400 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            إضافة امتحان فرعي جديد
          </h4>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs text-slate-400 mb-1">اسم الامتحان</label>
              <input
                type="text"
                value={newSubExam.name}
                onChange={(e) => setNewSubExam({ ...newSubExam, name: e.target.value })}
                placeholder="مثال: اختبار قصير 1"
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                disabled={!selectedClass || !selectedSubject || isSemesterClosed || !isYearActive}
              />
            </div>
            <div className="min-w-[100px]">
              <label className="block text-xs text-slate-400 mb-1">من كم علامة</label>
              <input
                type="number"
                value={newSubExam.maxScore}
                onChange={(e) => setNewSubExam({ ...newSubExam, maxScore: Number(e.target.value) })}
                min="1"
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                disabled={!selectedClass || !selectedSubject || isSemesterClosed || !isYearActive}
              />
            </div>
            <div className="min-w-[150px]">
              <label className="block text-xs text-slate-400 mb-1">الحقل الرئيسي</label>
              <select
                value={newSubExam.mainField}
                onChange={(e) => setNewSubExam({ ...newSubExam, mainField: e.target.value })}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                disabled={!selectedClass || !selectedSubject || isSemesterClosed || !isYearActive}
              >
                {mainFields.map(f => (
                  <option key={f.key} value={f.key}>{f.label} (من {f.max})</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddSubExam}
                disabled={saving || !selectedClass || !selectedSubject || isSemesterClosed || !isYearActive}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إضافة
              </button>
            </div>
          </div>
          {(!selectedClass || !selectedSubject) && (
            <p className="text-[10px] text-amber-400 mt-2">⚠️ الرجاء اختيار الصف والمادة أولاً</p>
          )}
          {!academicYear && (
            <p className="text-[10px] text-rose-400 mt-2">⚠️ العام الدراسي غير محدد. الرجاء التواصل مع الإدارة.</p>
          )}
        </div>
      )}

      {/* ====== عرض الامتحانات ====== */}
      {!selectedClass || !selectedSubject ? (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">الرجاء اختيار الصف والمادة لعرض الامتحانات الفرعية</p>
        </div>
      ) : Object.keys(groupedSubExams).length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            {showArchived ? 'لا توجد امتحانات محفوظة' : 'لا توجد امتحانات فرعية لهذا الصف والمادة'}
          </p>
          {!showArchived && (
            <p className="text-xs text-slate-500 mt-1">قم بإضافة امتحان فرعي جديد</p>
          )}
        </div>
      ) : (
        <div>
          {/* ====== زر اعتماد الكل ====== */}
          {!showArchived && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={handleApproveAllGrades}
                disabled={savingSubExams || !academicYear || isSemesterClosed || !isYearActive}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
              >
                {savingSubExams ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {savingSubExams ? 'جاري الاعتماد...' : 'اعتماد جميع العلامات النهائية'}
              </button>
            </div>
          )}

          {/* ====== عرض الامتحانات حسب الحقل ====== */}
          {Object.entries(groupedSubExams).map(([mainField, exams]) => {
            const fieldInfo = mainFields.find(f => f.key === mainField);
            const fieldLabel = fieldInfo?.label || mainField;
            const fieldMax = fieldInfo?.max || 10;
            const hasArchived = exams.some(e => e.archived);

            return (
              <div key={mainField} className="mb-6 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className={`p-4 ${hasArchived ? 'bg-amber-500/10' : 'bg-blue-500/10'} border-b ${hasArchived ? 'border-amber-500/20' : 'border-blue-500/20'}`}>
                  <h4 className={`text-sm font-bold ${hasArchived ? 'text-amber-400' : 'text-blue-400'}`}>
                    {fieldLabel} (من {fieldMax})
                    <span className="text-xs font-normal text-slate-400 mr-2">
                      {exams.length} امتحان {hasArchived ? '(محفوظ)' : ''}
                    </span>
                    {hasArchived && <Archive className="w-4 h-4 inline mr-1" />}
                  </h4>
                </div>

                <div className="p-4 overflow-x-auto">
                  <table className="w-full text-right text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-800 border-b border-slate-700">
                        <th className="p-2 text-center font-bold text-slate-300 min-w-[120px]">اسم الطالب</th>
                        {exams.map((exam) => (
                          <th key={exam.id} className="p-2 text-center font-bold text-blue-400 min-w-[80px]">
                            {exam.name}
                            <div className="text-[9px] text-slate-500">من {exam.maxScore}</div>
                            {exam.archived && (
                              <div className="text-[8px] text-amber-400">📦 محفوظ</div>
                            )}
                          </th>
                        ))}
                        <th className="p-2 text-center font-bold text-emerald-400 min-w-[80px]">
                          العلامة النهائية
                          <div className="text-[9px] text-slate-500">من {fieldMax}</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableStudents.map((student) => {
                        const finalGrade = calculateFinalGrade(student.id, mainField);
                        const allScoresEntered = exams.every(exam => 
                          exam.scores && exam.scores[student.id] !== undefined && exam.scores[student.id] > 0
                        );

                        return (
                          <tr key={student.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-all">
                            <td className="p-2 text-center text-white">{student.fullName}</td>
                            {exams.map((exam) => {
                              const score = exam.scores?.[student.id];
                              const isEditing = editingCell?.examId === exam.id && editingCell?.studentId === student.id;
                              const isArchived = exam.archived;
                              
                              return (
                                <td key={exam.id} className="p-2 text-center">
                                  {isEditing ? (
                                    <input
                                      ref={inputRef}
                                      type="number"
                                      value={editingValue}
                                      onChange={(e) => setEditingValue(e.target.value)}
                                      onKeyDown={(e) => handleKeyDown(e, exam.id, student.id)}
                                      onBlur={handleBlur}
                                      min="0"
                                      max={exam.maxScore || 10}
                                      className="w-16 p-1 bg-slate-700 border-2 border-blue-500 rounded text-white text-center text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      autoFocus
                                      disabled={isArchived}
                                    />
                                  ) : (
                                    <button
                                      onClick={() => !isArchived && startEdit(exam.id, student.id, score)}
                                      className={`w-16 p-1 bg-slate-800 border border-slate-700 rounded text-white text-center text-sm hover:bg-slate-700 transition-all ${
                                        isArchived ? 'opacity-50 cursor-not-allowed' : ''
                                      }`}
                                      disabled={isArchived}
                                    >
                                      {score !== undefined ? score : '-'}
                                    </button>
                                  )}
                                </td>
                              );
                            })}
                            <td className="p-2 text-center font-bold text-emerald-400">
                              {allScoresEntered ? finalGrade : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-slate-800/30 border-t border-slate-700 flex flex-wrap justify-between items-center gap-2">
                  <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                    <span>عدد الامتحانات: {exams.length}</span>
                    <span>الحقل الرئيسي: {fieldLabel}</span>
                    <span>الحد الأقصى: {fieldMax}</span>
                  </div>
                  <div className="flex gap-2">
                    {exams.some(e => !e.archived) && !isSemesterClosed && !showArchived && (
                      <button
                        onClick={() => {
                          const examToArchive = exams.find(e => !e.archived);
                          if (examToArchive) handleArchiveSubExam(examToArchive.id);
                        }}
                        className="px-3 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <Archive className="w-3 h-3" />
                        أرشفة الكل
                      </button>
                    )}
                    {exams.some(e => e.archived) && (
                      <button
                        onClick={() => {
                          const examToRestore = exams.find(e => e.archived);
                          if (examToRestore) handleRestoreSubExam(examToRestore.id);
                        }}
                        className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        استعادة الكل
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ====== تعليمات ====== */}
      <div className="mt-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-400">
            <p className="font-bold">📌 كيفية استخدام دفتر العلامات الجانبي:</p>
            <ul className="list-disc pr-4 space-y-1 mt-1">
              <li>اختر الصف ثم المادة لعرض الامتحانات الفرعية</li>
              <li>قم بإضافة امتحان فرعي جديد وحدد الحقل الرئيسي</li>
              <li>انقر على الخلية لإدخال الدرجة، استخدم الأسهم للتنقل بين الخلايا</li>
              <li>سيتم حساب العلامة النهائية تلقائياً عند إدخال جميع الدرجات</li>
              <li>اضغط على زر "اعتماد جميع العلامات النهائية" لحفظها في الجدول الرئيسي</li>
              <li>يمكنك أرشفة الامتحانات للاحتفاظ بنسخة منها حتى بعد إغلاق الفصل</li>
              <li>اضغط على "عرض المحفوظات" لمراجعة الامتحانات المؤرشفة</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}