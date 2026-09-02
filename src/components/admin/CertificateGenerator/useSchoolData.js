// src/components/admin/CertificateGenerator/useSchoolData.js

import { useState, useEffect, useCallback } from 'react';
import { db } from '../../../services/firebase';
import { 
  collection, query, where, onSnapshot, doc 
} from 'firebase/firestore';
import { 
  getStudentAttendanceStats, 
  getStudentNotes, 
  getStudentBehavior,
  getGradeLabel,
  getGradeColor
} from './calculations';
import { CERTIFICATE_TYPES, BEHAVIOR_RATINGS } from './constants';

// ============ ✅ الحقول الافتراضية للعلامات ============
const DEFAULT_GRADE_FIELDS = [
  { key: 'dailyExam1', label: 'امتحان يومي 1', max: 10 },
  { key: 'participation1', label: 'مشاركة 1', max: 10 },
  { key: 'midtermExam', label: 'امتحان الشهرين', max: 20 },
  { key: 'dailyExam2', label: 'امتحان يومي 2', max: 10 },
  { key: 'participation2', label: 'مشاركة 2', max: 10 },
  { key: 'finalExam', label: 'امتحان نهائي', max: 40 }
];

// ============ ✅ أسماء الحقول المعروضة ============
const FIELD_LABELS = {
  dailyExam1: 'امتحان يومي 1',
  dailyExam2: 'امتحان يومي 2',
  participation1: 'مشاركة 1',
  participation2: 'مشاركة 2',
  midtermExam: 'امتحان الشهرين',
  finalExam: 'امتحان نهائي'
};

// ============ ✅ دالة المفتاح المركب ============
const getConfigKey = (subjectId, classId) => {
  if (!subjectId) return null;
  return classId ? `${subjectId}_${classId}` : subjectId;
};

// ============ ✅ دالة للحصول على توزيع المادة ============
const getSubjectConfig = (subjectId, classId, gradingConfig) => {
  if (!gradingConfig) return null;
  
  let subjectConfig = null;
  
  if (gradingConfig.subjects) {
    // 1. البحث بالمفتاح المركب
    const compositeKey = getConfigKey(subjectId, classId);
    if (gradingConfig.subjects[compositeKey]) {
      subjectConfig = gradingConfig.subjects[compositeKey];
    }
    
    // 2. البحث بـ subjectId فقط
    if (!subjectConfig && gradingConfig.subjects[subjectId]) {
      subjectConfig = gradingConfig.subjects[subjectId];
    }
    
    // 3. مطابقة جزئية
    if (!subjectConfig) {
      const subjectKeys = Object.keys(gradingConfig.subjects);
      const matchingKeys = subjectKeys.filter(key => 
        key === subjectId || 
        key.startsWith(`${subjectId}_`) ||
        key.includes(subjectId)
      );
      if (matchingKeys.length > 0) {
        subjectConfig = gradingConfig.subjects[matchingKeys[0]];
      }
    }
  }
  
  if (!subjectConfig) {
    subjectConfig = gradingConfig.default || {};
  }
  
  return subjectConfig;
};

// ============ ✅ دالة للحصول على حقول المادة حسب نوع الشهادة ============
const getGradeFieldsForSubject = (subjectId, classId, gradingConfig, certificateType) => {
  if (!gradingConfig) {
    return DEFAULT_GRADE_FIELDS;
  }

  const isMidterm = certificateType?.includes('midterm');
  const subjectConfig = getSubjectConfig(subjectId, classId, gradingConfig);
  
  // ✅ تحديد الحقول بناءً على نوع الشهادة
  const fields = [];
  
  Object.keys(FIELD_LABELS).forEach(key => {
    // ✅ للشهادة الشهرية: فقط dailyExam1, participation1, midtermExam
    if (isMidterm) {
      if (['dailyExam1', 'participation1', 'midtermExam'].includes(key)) {
        if (subjectConfig[key] !== undefined && subjectConfig[key] > 0) {
          fields.push({
            key: key,
            label: FIELD_LABELS[key],
            max: subjectConfig[key]
          });
        }
      }
    } else {
      // ✅ للشهادة النهائية: جميع الحقول
      if (subjectConfig[key] !== undefined && subjectConfig[key] > 0) {
        fields.push({
          key: key,
          label: FIELD_LABELS[key],
          max: subjectConfig[key]
        });
      }
    }
  });
  
  // إذا لم يتم العثور على حقول، استخدم الافتراضية
  if (fields.length === 0) {
    return isMidterm 
      ? DEFAULT_GRADE_FIELDS.filter(f => ['dailyExam1', 'participation1', 'midtermExam'].includes(f.key))
      : DEFAULT_GRADE_FIELDS;
  }
  
  return fields;
};

// ============ ✅ دالة للحصول على المجموع الكلي للمادة حسب نوع الشهادة ============
const getTotalMaxForSubject = (subjectId, classId, gradingConfig, certificateType) => {
  if (!gradingConfig) {
    const isMidterm = certificateType?.includes('midterm');
    return isMidterm ? 40 : 100;
  }
  
  const isMidterm = certificateType?.includes('midterm');
  const subjectConfig = getSubjectConfig(subjectId, classId, gradingConfig);
  
  // ✅ حساب المجموع حسب نوع الشهادة
  let total = 0;
  const fieldKeys = isMidterm 
    ? ['dailyExam1', 'participation1', 'midtermExam']
    : ['dailyExam1', 'dailyExam2', 'participation1', 'participation2', 'midtermExam', 'finalExam'];
  
  fieldKeys.forEach(key => {
    total += subjectConfig[key] || 0;
  });
  
  // إذا كان المجموع 0، استخدم total الموجود في التوزيع
  if (total === 0 && subjectConfig.total) {
    total = isMidterm ? Math.min(subjectConfig.total, 40) : subjectConfig.total;
  }
  
  const result = total > 0 ? total : (isMidterm ? 40 : 100);
  console.log(`📊 getTotalMaxForSubject - ${subjectId} (${isMidterm ? 'شهرين' : 'نهائي'}): ${result}`);
  return result;
};

// ============ ✅ حساب المجموع باستخدام الحقول ============
const calculateSubjectTotal = (grade, fields) => {
  if (!grade) return { total: 0, max: 0 };
  
  let total = 0;
  let max = 0;
  
  fields.forEach(field => {
    const value = grade[field.key] || 0;
    total += value;
    max += field.max || 0;
  });
  
  return { total, max };
};

export const useSchoolData = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [behaviors, setBehaviors] = useState([]);
  const [studentNotes, setStudentNotes] = useState([]);
  const [gradingConfig, setGradingConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [schoolSettings, setSchoolSettings] = useState({
    schoolName: '',
    schoolAddress: '',
    establishmentYear: '',
    principalName: '',
    headerText: '',
    footerText: '',
    motto: '',
    phone: '',
    email: '',
    website: '',
    logo: null,
    gender: '',
    gradeLevels: '',
    mission: ''
  });
  const [academicYear, setAcademicYear] = useState('');

  // ============ ✅ جلب إعدادات المدرسة وتوزيع العلامات ============
  useEffect(() => {
    let isMounted = true;
    
    console.log('📡 useSchoolData - جاري الاستماع لإعدادات المدرسة...');
    
    const unsubscribe = onSnapshot(
      doc(db, 'schoolSettings', 'settings'),
      (docSnap) => {
        console.log('📡 useSchoolData - تم استلام رد من Firestore');
        
        if (docSnap.exists() && isMounted) {
          const data = docSnap.data();
          console.log('📋 useSchoolData - البيانات:', JSON.stringify(data, null, 2));
          
          const schoolInfo = data.schoolInfo || {};
          
          setSchoolSettings(prev => ({
            ...prev,
            schoolName: schoolInfo.schoolName || '',
            schoolAddress: schoolInfo.schoolAddress || '',
            establishmentYear: schoolInfo.establishmentYear || '',
            principalName: schoolInfo.principalName || '',
            headerText: schoolInfo.headerText || '',
            footerText: schoolInfo.footerText || '',
            motto: schoolInfo.motto || '',
            phone: schoolInfo.phone || '',
            email: schoolInfo.email || '',
            website: schoolInfo.website || '',
            gender: schoolInfo.gender || '',
            gradeLevels: schoolInfo.gradeLevels || '',
            mission: schoolInfo.mission || '',
            logo: schoolInfo.logo || null
          }));
          
          // ✅ جلب العام الدراسي
          if (data.academicYear?.current) {
            setAcademicYear(data.academicYear.current);
          } else {
            const currentYear = new Date().getFullYear();
            setAcademicYear(`${currentYear}-${currentYear + 1}`);
          }
          
          // ✅ جلب توزيع العلامات
          if (data.gradingConfig) {
            console.log('✅ useSchoolData - تم جلب توزيع العلامات بنجاح');
            console.log('📊 gradingConfig:', JSON.stringify(data.gradingConfig, null, 2));
            setGradingConfig(data.gradingConfig);
          } else {
            console.log('⚠️ useSchoolData - لا يوجد gradingConfig، سيتم استخدام القيم الافتراضية');
            const defaultConfig = {
              default: {
                dailyExam1: 10,
                dailyExam2: 10,
                participation1: 10,
                participation2: 10,
                midtermExam: 20,
                finalExam: 40,
                total: 100
              },
              subjects: {}
            };
            setGradingConfig(defaultConfig);
          }
          
          setLoading(false);
        } else {
          console.log('⚠️ useSchoolData - مستند settings غير موجود');
          const defaultConfig = {
            default: {
              dailyExam1: 10,
              dailyExam2: 10,
              participation1: 10,
              participation2: 10,
              midtermExam: 20,
              finalExam: 40,
              total: 100
            },
            subjects: {}
          };
          setGradingConfig(defaultConfig);
          
          const currentYear = new Date().getFullYear();
          setAcademicYear(`${currentYear}-${currentYear + 1}`);
          setLoading(false);
        }
      },
      (error) => {
        console.error('❌ useSchoolData - خطأ في الاستماع:', error);
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // ============ جلب البيانات الأساسية ============
  useEffect(() => {
    // جلب الطلاب (مرتبة أبجدياً)
    const unsubscribeStudents = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'student')),
      (snapshot) => {
        const studentList = [];
        snapshot.forEach(doc => {
          studentList.push({ id: doc.id, ...doc.data() });
        });
        studentList.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || 'ar'));
        setStudents(studentList);
      }
    );

    // جلب الصفوف (مرتبة أبجدياً)
    const unsubscribeClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      const classList = [];
      snapshot.forEach(doc => {
        classList.push({ id: doc.id, ...doc.data() });
      });
      classList.sort((a, b) => (a.name || '').localeCompare(b.name || 'ar'));
      setClasses(classList);
    });

    // جلب المواد (مرتبة أبجدياً)
    const unsubscribeSubjects = onSnapshot(collection(db, 'subjects'), (snapshot) => {
      const subjectList = [];
      snapshot.forEach(doc => {
        subjectList.push({ id: doc.id, ...doc.data() });
      });
      subjectList.sort((a, b) => (a.name || '').localeCompare(b.name || 'ar'));
      setSubjects(subjectList);
    });

    // جلب العلامات
    const unsubscribeGrades = onSnapshot(collection(db, 'grades'), (snapshot) => {
      const gradeList = [];
      snapshot.forEach(doc => {
        gradeList.push({ id: doc.id, ...doc.data() });
      });
      setGrades(gradeList);
    });

    // جلب سجلات الحضور
    const unsubscribeAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const attendanceList = [];
      snapshot.forEach(doc => {
        attendanceList.push({ id: doc.id, ...doc.data() });
      });
      setAttendance(attendanceList);
    });

    // جلب سجلات السلوك
    const unsubscribeBehaviors = onSnapshot(collection(db, 'behaviors'), (snapshot) => {
      const behaviorList = [];
      snapshot.forEach(doc => {
        behaviorList.push({ id: doc.id, ...doc.data() });
      });
      setBehaviors(behaviorList);
    });

    // جلب ملاحظات الطلاب
    const unsubscribeNotes = onSnapshot(collection(db, 'studentNotes'), (snapshot) => {
      const noteList = [];
      snapshot.forEach(doc => {
        noteList.push({ id: doc.id, ...doc.data() });
      });
      setStudentNotes(noteList);
    });

    return () => {
      unsubscribeStudents();
      unsubscribeClasses();
      unsubscribeSubjects();
      unsubscribeGrades();
      unsubscribeAttendance();
      unsubscribeBehaviors();
      unsubscribeNotes();
    };
  }, []);

  // ============ الحصول على علامات الطالب ============
  const getStudentGrades = useCallback((studentId, semester) => {
    return grades.filter(g => 
      g.studentId === studentId && 
      g.semester === semester
    );
  }, [grades]);

  // ============ الحصول على مواد الصف ============
  const getClassSubjects = useCallback((classId) => {
    return subjects.filter(s => s.classId === classId);
  }, [subjects]);

  // ============ توليد شهادة لطالب واحد ============
  const generateSingleCertificate = useCallback(async (studentId, certificateType) => {
    console.log('📝 generateSingleCertificate - studentId:', studentId, 'certificateType:', certificateType);
    
    const student = students.find(s => s.id === studentId);
    if (!student) {
      console.log('❌ الطالب غير موجود');
      return null;
    }

    const classInfo = classes.find(c => c.id === student.classId);
    const studentSubjects = getClassSubjects(student.classId);
    const semester = CERTIFICATE_TYPES.find(t => t.id === certificateType)?.semester || 1;
    const studentGrades = getStudentGrades(studentId, semester);
    const isMidterm = certificateType?.includes('midterm');
    
    console.log('📊 studentSubjects:', studentSubjects.map(s => ({ id: s.id, name: s.name })));
    console.log('📊 isMidterm:', isMidterm);
    console.log('📊 gradingConfig موجود:', !!gradingConfig);
    
    const attendanceStats = getStudentAttendanceStats(attendance, studentId);
    const behavior = getStudentBehavior(behaviors, studentId, semester, BEHAVIOR_RATINGS);
    const notes = getStudentNotes(studentNotes, studentId, semester);

    const certificateData = {
      student: student,
      classInfo: classInfo,
      semester: semester,
      type: certificateType,
      academicYear: academicYear,
      schoolInfo: schoolSettings,
      subjects: [],
      total: 0,
      maxTotal: 0,
      percentage: 0,
      gradeLabel: '',
      attendance: {
        total: attendanceStats.total,
        present: attendanceStats.present,
        absent: attendanceStats.absent,
        late: attendanceStats.late,
        excused: attendanceStats.excused,
        left: attendanceStats.left,
        autoPresent: attendanceStats.autoPresent,
        totalDays: attendanceStats.totalDays,
        rate: attendanceStats.attendanceRate,
        absenceDays: attendanceStats.absenceDays
      },
      behavior: behavior,
      teacherNotes: notes.teacher || 'لا توجد ملاحظات',
      principalNotes: notes.principal || 'لا توجد ملاحظات',
      issuedDate: new Date().toLocaleDateString('ar')
    };

    // ✅ حساب العلامات لكل مادة حسب نوع الشهادة
    let total = 0;
    let maxTotal = 0;

    studentSubjects.forEach(subject => {
      console.log(`📊 معالجة المادة: ${subject.name} (${subject.id})`);
      
      // ✅ الحصول على الحقول حسب نوع الشهادة
      const fields = getGradeFieldsForSubject(subject.id, student.classId, gradingConfig, certificateType);
      const subjectMaxTotal = getTotalMaxForSubject(subject.id, student.classId, gradingConfig, certificateType);
      
      console.log(`📊 fields:`, fields);
      console.log(`📊 subjectMaxTotal:`, subjectMaxTotal);
      
      // ✅ الحصول على علامة الطالب لهذه المادة
      const grade = studentGrades.find(g => g.subjectId === subject.id);
      console.log(`📊 grade:`, grade);
      
      // ✅ حساب المجموع باستخدام الحقول الديناميكية
      const result = calculateSubjectTotal(grade, fields);
      const subjectTotal = result.total;
      const subjectMax = subjectMaxTotal || result.max || (isMidterm ? 40 : 100);

      const percentage = subjectMax > 0 ? (subjectTotal / subjectMax) * 100 : 0;
      const gradeLevel = parseInt(classInfo?.name?.split(' ')[0]) || 1;

      const gradeLabel = getGradeLabel(percentage, gradeLevel);
      const gradeColor = getGradeColor(percentage, gradeLevel);

      console.log(`📊 النتيجة: ${subjectTotal} من ${subjectMax} (${percentage.toFixed(1)}%)`);

      certificateData.subjects.push({
        name: subject.name,
        total: subjectTotal,
        max: subjectMax,
        percentage: percentage,
        grade: gradeLabel,
        color: gradeColor
      });

      total += subjectTotal;
      maxTotal += subjectMax;
    });

    certificateData.total = total;
    certificateData.maxTotal = maxTotal;
    certificateData.percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
    
    const gradeLevel = parseInt(classInfo?.name?.split(' ')[0]) || 1;
    certificateData.gradeLabel = getGradeLabel(certificateData.percentage, gradeLevel);
    certificateData.gradeColor = getGradeColor(certificateData.percentage, gradeLevel);

    console.log(`✅ تم إنشاء الشهادة لـ: ${student.fullName}`);
    console.log(`📊 المجموع الكلي: ${total} من ${maxTotal}`);
    console.log(`📊 التقدير: ${certificateData.gradeLabel}`);

    return certificateData;
  }, [students, classes, subjects, grades, attendance, behaviors, studentNotes, academicYear, schoolSettings, getClassSubjects, getStudentGrades, gradingConfig]);

  return {
    students,
    classes,
    grades,
    subjects,
    attendance,
    behaviors,
    studentNotes,
    loading,
    schoolSettings,
    academicYear,
    gradingConfig,
    getStudentGrades,
    getClassSubjects,
    generateSingleCertificate
  };
};