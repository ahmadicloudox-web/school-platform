// src/components/admin/GradesViewer.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, doc, getDocs, getDoc, addDoc, updateDoc, 
  deleteDoc, query, where, onSnapshot 
} from 'firebase/firestore';
import { 
  FileText, Search, Loader2, Users, School, BookOpen, 
  Printer, Calendar, Filter, RefreshCw, Eye, ChevronDown,
  AlertCircle, CheckCircle
} from 'lucide-react';
import { getTotalMaxForSubject, getGradeFieldsForSubject, GRADE_FIELDS } from './GradesManager/constants/gradeFields';

// ============ دوال مساعدة ============
const calculateTotal = (grades) => {
  const {
    dailyExam1 = 0,
    participation1 = 0,
    midtermExam = 0,
    dailyExam2 = 0,
    participation2 = 0,
    finalExam = 0
  } = grades;
  
  return dailyExam1 + participation1 + midtermExam + 
         dailyExam2 + participation2 + finalExam;
};

const getGrade = (percentage) => {
  if (percentage >= 90) return { label: 'ممتاز', key: 'A', color: 'text-emerald-400 bg-emerald-500/10' };
  if (percentage >= 80) return { label: 'جيد جداً', key: 'B', color: 'text-blue-400 bg-blue-500/10' };
  if (percentage >= 70) return { label: 'جيد', key: 'C', color: 'text-amber-400 bg-amber-500/10' };
  if (percentage >= 60) return { label: 'مقبول', key: 'D', color: 'text-orange-400 bg-orange-500/10' };
  return { label: 'ضعيف', key: 'F', color: 'text-rose-400 bg-rose-500/10' };
};

export default function GradesViewer() {
  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gradingConfig, setGradingConfig] = useState(null);
  
  // ====== خيارات الفلترة ======
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [academicYear, setAcademicYear] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // ====== قائمة السنوات الدراسية ======
  const [availableYears, setAvailableYears] = useState([]);
  const [schoolSettings, setSchoolSettings] = useState(null);

  // ============ فلترة المواد حسب الصف ============
  const filteredSubjects = useMemo(() => {
    if (!selectedClass) return subjects;
    return subjects.filter(subject => subject.classId === selectedClass);
  }, [subjects, selectedClass]);

  // ============ الحصول على الحقول الديناميكية للعرض ============
  const dynamicGradeFields = useMemo(() => {
    if (!selectedSubject || !gradingConfig) {
      return GRADE_FIELDS;
    }
    const classId = selectedClass || null;
    const fields = getGradeFieldsForSubject(selectedSubject, classId, gradingConfig);
    console.log('📊 GradesViewer - الحقول الديناميكية:', fields);
    return fields;
  }, [selectedSubject, selectedClass, gradingConfig]);

  // ============ الحصول على المجموع الكلي للعرض ============
  const currentMaxTotal = useMemo(() => {
    if (!selectedSubject) return 100;
    const classId = selectedClass || null;
    return getTotalMaxForSubject(selectedSubject, classId, gradingConfig);
  }, [selectedSubject, selectedClass, gradingConfig]);

  // ============ جلب توزيع العلامات ============
  useEffect(() => {
    const unsubscribeSettings = onSnapshot(
      doc(db, 'schoolSettings', 'settings'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.gradingConfig) {
            console.log('✅ GradesViewer - تم تحديث توزيع العلامات:', data.gradingConfig);
            setGradingConfig(data.gradingConfig);
          }
        }
      }
    );
    return () => unsubscribeSettings();
  }, []);

  // ============ جلب إعدادات المدرسة والسنوات المتاحة ============
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const q = query(collection(db, 'schoolSettings'));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          setSchoolSettings({ id: doc.id, ...doc.data() });
          
          const history = doc.data().history || [];
          const years = history
            .filter(h => h.action === 'start_academic_year')
            .map(h => h.academicYear);
          
          const currentYear = doc.data().academicYear?.current;
          if (currentYear && !years.includes(currentYear)) {
            years.push(currentYear);
          }
          
          if (years.length === 0) {
            const current = new Date().getFullYear();
            years.push(`${current}-${current + 1}`);
            years.push(`${current - 1}-${current}`);
            years.push(`${current - 2}-${current - 1}`);
          }
          
          setAvailableYears([...new Set(years)].sort().reverse());
          
          if (doc.data().academicYear?.current) {
            setAcademicYear(doc.data().academicYear.current);
          }
        } else {
          const current = new Date().getFullYear();
          setAvailableYears([`${current}-${current + 1}`, `${current - 1}-${current}`, `${current - 2}-${current - 1}`]);
          setAcademicYear(`${current}-${current + 1}`);
        }
      } catch (error) {
        console.error('❌ خطأ في جلب إعدادات المدرسة:', error);
      }
    };
    fetchSettings();
  }, []);

  // ============ جلب البيانات ============
  useEffect(() => {
    const unsubGrades = onSnapshot(collection(db, 'grades'), (snapshot) => {
      const gradeList = [];
      snapshot.forEach(doc => {
        gradeList.push({ id: doc.id, ...doc.data() });
      });
      setGrades(gradeList);
      setLoading(false);
    });

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

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      const classList = [];
      snapshot.forEach(doc => {
        classList.push({ id: doc.id, ...doc.data() });
      });
      setClasses(classList);
    });

    const unsubSubjects = onSnapshot(collection(db, 'subjects'), (snapshot) => {
      const subjectList = [];
      snapshot.forEach(doc => {
        subjectList.push({ id: doc.id, ...doc.data() });
      });
      setSubjects(subjectList);
    });

    return () => {
      unsubGrades();
      unsubStudents();
      unsubClasses();
      unsubSubjects();
    };
  }, []);

  // ============ زر التحديث ============
  const handleRefresh = () => {
    setRefreshing(true);
    setMessage({ type: 'info', text: '🔄 جاري تحديث البيانات...' });
    
    setTimeout(() => {
      setMessage({ type: 'success', text: '✅ تم تحديث البيانات بنجاح!' });
      setRefreshing(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
    }, 500);
  };

  // ============ الحصول على علامات الطالب ============
  const getStudentGrades = (studentId) => {
    return grades.filter(g => 
      g.studentId === studentId && 
      g.semester === selectedSemester &&
      g.academicYear === academicYear
    );
  };

  // ============ الحصول على علامة طالب في مادة محددة ============
  const getStudentGradeForSubject = (studentId, subjectId) => {
    return grades.find(g => 
      g.studentId === studentId && 
      g.subjectId === subjectId && 
      g.semester === selectedSemester &&
      g.academicYear === academicYear
    );
  };

  const getClassName = (classId) => {
    const cls = classes.find(c => c.id === classId);
    return cls?.name || 'غير محدد';
  };

  const getSubjectName = (id) => {
    const subject = subjects.find(s => s.id === id);
    return subject?.name || 'غير محدد';
  };

  // ============ فلترة الطلاب ============
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      if (selectedClass && student.classId !== selectedClass) return false;
      if (searchQuery && !student.fullName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [students, selectedClass, searchQuery]);

  // ✅ ترتيب الطلاب أبجدياً
  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      const nameA = a.fullName || '';
      const nameB = b.fullName || '';
      return nameA.localeCompare(nameB, 'ar', { sensitivity: 'base' });
    });
  }, [filteredStudents]);

  // ✅ ترتيب الصفوف أبجدياً
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB, 'ar', { sensitivity: 'base' });
    });
  }, [classes]);

  // ✅ ترتيب المواد أبجدياً
  const sortedSubjects = useMemo(() => {
    return [...filteredSubjects].sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB, 'ar', { sensitivity: 'base' });
    });
  }, [filteredSubjects]);

  // ============ دالة طباعة الكشف لمادة واحدة ============
  const printGradeSheet = (classData, studentsData, gradesData, subjectData, semesterData, academicYearData) => {
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return;
    
    const fieldsToRender = dynamicGradeFields || GRADE_FIELDS;
    const maxTotal = currentMaxTotal || 100;
    
    const rows = studentsData.map(student => {
      const grade = gradesData.find(g => 
        g.studentId === student.id && 
        g.subjectId === subjectData?.id && 
        g.semester === semesterData &&
        g.academicYear === academicYearData
      );
      
      const fields = {};
      fieldsToRender.forEach(f => {
        fields[f.key] = grade?.[f.key] || 0;
      });
      
      let total = 0;
      fieldsToRender.forEach(f => {
        total += (fields[f.key] || 0);
      });
      
      const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
      const gradeInfo = getGrade(percentage);
      
      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${student.fullName}</td>
          ${fieldsToRender.map(f => 
            `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${fields[f.key] || 0}</td>`
          ).join('')}
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #2e7d32;">${total} / ${maxTotal}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
            <span style="padding: 2px 8px; border-radius: 12px; background: ${percentage >= 90 ? '#e8f5e9' : percentage >= 80 ? '#e3f2fd' : percentage >= 70 ? '#fff3e0' : percentage >= 60 ? '#fff8e1' : '#ffebee'}; color: ${percentage >= 90 ? '#2e7d32' : percentage >= 80 ? '#1565c0' : percentage >= 70 ? '#e65100' : percentage >= 60 ? '#f57f17' : '#c62828'};">
              ${gradeInfo.label}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    const semesterLabel = semesterData === 1 ? 'الفصل الدراسي الأول' : 'الفصل الدراسي الثاني';
    const className = classData?.name || 'غير محدد';
    const subjectName = subjectData?.name || 'جميع المواد';
    const schoolName = 'مدرستك الثانوية';

    const headerFields = fieldsToRender.map(f => 
      `<th style="padding: 8px; border: 1px solid #1a237e; text-align: center;">${f.label}<br><span style="font-size:10px;font-weight:normal;">(${f.max || 0})</span></th>`
    ).join('');

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
            .sub-title { font-size: 14px; font-weight: bold; color: #1a237e; margin: 5px 0; }
            @media print { body { padding: 10px; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="school-name">${schoolName}</div>
              <div class="title">كشف العلامات</div>
              <div class="sub-title">الصف: ${className}</div>
              <div class="info">
                <span>📚 المادة: ${subjectName}</span>
                <span>📅 الفصل: ${semesterLabel}</span>
                <span>📆 العام الدراسي: ${academicYearData}</span>
                <span>👨‍🎓 عدد الطلاب: ${studentsData.length}</span>
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
            <div style="text-align: center; margin-top: 20px;" class="no-print">
              <button onclick="window.print()" style="padding: 10px 30px; background: #1a237e; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">
                🖨️ طباعة الكشف
              </button>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ============ طباعة جميع المواد ============
  const printAllSubjectsSheet = (classData, studentsList, subjectsList) => {
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) return;

    const semesterLabel = selectedSemester === 1 ? 'الفصل الدراسي الأول' : 'الفصل الدراسي الثاني';
    const className = classData?.name || 'غير محدد';
    const schoolName = 'مدرستك الثانوية';

    // 1. بناء ترويسة المواد فقط
    let headerRow = `<th>اسم الطالب</th>`;
    subjectsList.forEach(sub => {
      headerRow += `<th style="padding: 8px; border: 1px solid #1a237e; text-align: center;">${sub.name}</th>`;
    });
    // 2. إضافة عمود المجموع الكلي مرة واحدة فقط في النهاية
    headerRow += `<th style="padding: 8px; border: 1px solid #1a237e; text-align: center; font-weight: bold; color: #2e7d32;">المجموع الكلي</th>`;

    const rows = studentsList.map(student => {
      let row = `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${student.fullName}</td>`;
      let total = 0;
      
      subjectsList.forEach(sub => {
        const grade = getStudentGradeForSubject(student.id, sub.id);
        const subjectTotal = grade ? calculateTotal(grade) : 0;
        total += subjectTotal;
        row += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${subjectTotal}</td>`;
      });
      
      // 3. إضافة المجموع الكلي للطالب في نهاية الصف
      row += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #2e7d32;">${total}</td>`;
      return `<tr>${row}</tr>`;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>كشف العلامات - جميع المواد - ${className}</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #fff; margin: 0; }
            .container { max-width: 1200px; margin: 0 auto; direction: rtl; }
            .header { text-align: center; border-bottom: 3px solid #1a237e; padding-bottom: 15px; margin-bottom: 20px; }
            .school-name { font-size: 24px; font-weight: bold; color: #1a237e; }
            .title { font-size: 20px; font-weight: bold; margin: 10px 0; color: #1a237e; }
            .info { text-align: center; color: #555; font-size: 14px; margin-bottom: 15px; }
            .info span { margin: 0 10px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
            th { background: #1a237e; color: white; padding: 8px; border: 1px solid #1a237e; text-align: center; font-weight: bold; }
            td { padding: 6px 8px; border: 1px solid #ddd; text-align: center; }
            tr:nth-child(even) { background: #f8f9fa; }
            .footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 2px solid #1a237e; font-size: 12px; color: #888; }
            .sub-title { font-size: 14px; font-weight: bold; color: #1a237e; margin: 5px 0; }
            @media print { body { padding: 10px; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="school-name">${schoolName}</div>
              <div class="title">كشف العلامات - جميع المواد</div>
              <div class="sub-title">الصف: ${className}</div>
              <div class="info">
                <span>📅 الفصل: ${semesterLabel}</span>
                <span>📆 العام الدراسي: ${academicYear}</span>
                <span>👨‍🎓 عدد الطلاب: ${studentsList.length}</span>
                <span>📚 عدد المواد: ${subjectsList.length}</span>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  ${headerRow}
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; display: flex; justify-content: space-around; flex-wrap: wrap;">
              <div><strong>عدد الطلاب:</strong> ${studentsList.length}</div>
              <div><strong>عدد المواد:</strong> ${subjectsList.length}</div>
            </div>
            <div class="footer">
              تم إنشاء هذا التقرير بواسطة المنصة التعليمية الذكية<br>
              تاريخ الطباعة: ${new Date().toLocaleDateString('ar')}
            </div>
            <div style="text-align: center; margin-top: 20px;" class="no-print">
              <button onclick="window.print()" style="padding: 10px 30px; background: #1a237e; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">
                🖨️ طباعة الكشف
              </button>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
  // ============ طباعة الكشف ============
  const handlePrint = () => {
    if (!selectedClass) {
      setMessage({ type: 'error', text: '❌ الرجاء اختيار الصف أولاً' });
      return;
    }
    
    const classData = classes.find(c => c.id === selectedClass);
    const studentsList = students.filter(s => s.classId === selectedClass);
    
    if (studentsList.length === 0) {
      setMessage({ type: 'error', text: '❌ لا يوجد طلاب في هذا الصف' });
      return;
    }

    if (selectedSubject) {
      const subjectData = subjects.find(s => s.id === selectedSubject);
      printGradeSheet(
        classData,
        studentsList,
        grades,
        subjectData,
        selectedSemester,
        academicYear
      );
    } else {
      printAllSubjectsSheet(classData, studentsList, filteredSubjects);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-slate-400 text-sm mr-3">جاري تحميل العلامات...</p>
      </div>
    );
  }

  const isSemester1Closed = schoolSettings?.semesters?.semester1?.status === 'closed';
  const isSemester2Closed = schoolSettings?.semesters?.semester2?.status === 'closed';

  // ============ عرض جميع المواد ============
  const renderAllSubjects = () => {
    if (filteredSubjects.length === 0) {
      return (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">⚠️ لا توجد مواد مسجلة لهذا الصف</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm border-collapse">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-700">
              <th className="p-3 text-center font-bold text-slate-300 sticky right-0 bg-slate-900 min-w-[120px]">
                اسم الطالب
              </th>
              {filteredSubjects.map(sub => (
                <th key={sub.id} className="p-3 text-center font-bold text-blue-400 min-w-[80px]">
                  <div>{sub.name}</div>
                  <div className="text-[9px] text-slate-500">(100)</div>
                </th>
              ))}
              <th className="p-3 text-center font-bold text-emerald-400 min-w-[80px]">
                <div>المجموع الكلي</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStudents.length === 0 ? (
              <tr>
                <td colSpan={filteredSubjects.length + 2} className="text-center py-8 text-slate-400">
                  لا يوجد طلاب في هذا الصف
                </td>
              </tr>
            ) : (
              sortedStudents.map((student) => {
                let totalAllSubjects = 0;
                
                return (
                  <tr key={student.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-all">
                    <td className="p-3 font-bold text-white sticky right-0 bg-slate-800/50 min-w-[120px]">
                      {student.fullName}
                    </td>
                    {filteredSubjects.map(sub => {
                      const grade = getStudentGradeForSubject(student.id, sub.id);
                      const subjectTotal = grade ? calculateTotal(grade) : 0;
                      totalAllSubjects += subjectTotal;
                      
                      return (
                        <td key={sub.id} className="p-2 text-center text-white">
                          {subjectTotal}
                        </td>
                      );
                    })}
                    <td className="p-3 text-center font-bold text-emerald-400">
                      {totalAllSubjects}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {sortedStudents.length > 0 && (
          <div className="mt-4 p-4 bg-slate-900 rounded-xl border border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 mb-3">📊 ملخص المواد</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-xs text-slate-400">عدد الطلاب</p>
                <p className="text-lg font-bold text-white">{sortedStudents.length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">عدد المواد</p>
                <p className="text-lg font-bold text-blue-400">{filteredSubjects.length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">المعدل العام</p>
                <p className="text-lg font-bold text-emerald-400">
                  {sortedStudents.length > 0 
                    ? (sortedStudents.reduce((sum, s) => {
                        const grades = getStudentGrades(s.id);
                        const total = grades.reduce((acc, g) => acc + calculateTotal(g), 0);
                        return sum + total;
                      }, 0) / sortedStudents.length / filteredSubjects.length).toFixed(1)
                    : 0
                  }
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">الحالة</p>
                <p className="text-lg font-bold text-green-400">
                  {selectedSemester === 1 
                    ? (isSemester1Closed ? '🔒 مغلق' : '✅ مفتوح')
                    : (isSemester2Closed ? '🔒 مغلق' : '✅ مفتوح')
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============ عرض مادة محددة مع الحقول الديناميكية ============
  const renderSubjectContent = () => {
    const subject = subjects.find(s => s.id === selectedSubject);
    if (!subject) {
      return (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">المادة غير موجودة</p>
        </div>
      );
    }

    const fieldsToRender = dynamicGradeFields || GRADE_FIELDS;
    const maxTotal = currentMaxTotal || 100;

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm border-collapse">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-700">
              <th className="p-3 text-center font-bold text-slate-300 sticky right-0 bg-slate-900 min-w-[120px]">
                اسم الطالب
              </th>
              {fieldsToRender.map(field => (
                <th key={field.key} className={`p-3 text-center font-bold text-${field.color || 'blue-400'} min-w-[80px]`}>
                  <div>{field.label}</div>
                  <div className="text-[9px] text-slate-500">({field.max || 0})</div>
                </th>
              ))}
              <th className="p-3 text-center font-bold text-emerald-400 min-w-[80px]">
                <div>المجموع</div>
                <div className="text-[9px] text-slate-500">(من {maxTotal})</div>
              </th>
              <th className="p-3 text-center font-bold text-slate-400 min-w-[80px]">
                التقدير
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStudents.length === 0 ? (
              <tr>
                <td colSpan={fieldsToRender.length + 3} className="text-center py-8 text-slate-400">
                  لا يوجد طلاب في هذا الصف
                </td>
              </tr>
            ) : (
              sortedStudents.map((student) => {
                const grade = getStudentGradeForSubject(student.id, selectedSubject);
                const fields = {};
                fieldsToRender.forEach(f => {
                  fields[f.key] = grade?.[f.key] || 0;
                });
                
                let total = 0;
                fieldsToRender.forEach(f => {
                  total += (fields[f.key] || 0);
                });
                
                const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                const gradeInfo = getGrade(percentage);

                return (
                  <tr key={student.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-all">
                    <td className="p-3 font-bold text-white sticky right-0 bg-slate-800/50 min-w-[120px]">
                      {student.fullName}
                    </td>
                    {fieldsToRender.map(field => (
                      <td key={field.key} className="p-2 text-center text-white">
                        {fields[field.key] || 0}
                      </td>
                    ))}
                    <td className="p-3 text-center font-bold text-emerald-400">
                      {total}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${gradeInfo.color}`}>
                        {gradeInfo.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {sortedStudents.length > 0 && (
          <div className="mt-4 p-4 bg-slate-900 rounded-xl border border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 mb-3">📊 ملخص المادة</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-xs text-slate-400">عدد الطلاب</p>
                <p className="text-lg font-bold text-white">{sortedStudents.length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">المعدل العام</p>
                <p className="text-lg font-bold text-emerald-400">
                  {sortedStudents.length > 0 
                    ? (sortedStudents.reduce((sum, s) => {
                        const grade = getStudentGradeForSubject(s.id, selectedSubject);
                        let total = 0;
                        fieldsToRender.forEach(f => {
                          total += (grade?.[f.key] || 0);
                        });
                        return sum + total;
                      }, 0) / sortedStudents.length).toFixed(1)
                    : 0
                  }
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">أعلى علامة</p>
                <p className="text-lg font-bold text-emerald-400">
                  {sortedStudents.length > 0
                    ? Math.max(...sortedStudents.map(s => {
                        const grade = getStudentGradeForSubject(s.id, selectedSubject);
                        let total = 0;
                        fieldsToRender.forEach(f => {
                          total += (grade?.[f.key] || 0);
                        });
                        return total;
                      }))
                    : 0
                  }
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">أدنى علامة</p>
                <p className="text-lg font-bold text-rose-400">
                  {sortedStudents.length > 0
                    ? Math.min(...sortedStudents.map(s => {
                        const grade = getStudentGradeForSubject(s.id, selectedSubject);
                        let total = 0;
                        fieldsToRender.forEach(f => {
                          total += (grade?.[f.key] || 0);
                        });
                        return total;
                      }))
                    : 0
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============ عرض المحتوى الرئيسي ============
  const renderContent = () => {
    if (!selectedClass) {
      return (
        <div className="text-center py-12">
          <School className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">الرجاء اختيار صف أولاً</p>
        </div>
      );
    }

    if (!selectedSubject) {
      return renderAllSubjects();
    }

    return renderSubjectContent();
  };

  return (
    // ✅ تم تعديل السطر الأول ليدعم الوضع الفاتح والغامق
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 transition-colors duration-300">
      {/* ====== العنوان ====== */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-400" />
            عرض العلامات
          </h2>
          <p className="text-xs text-slate-400">
            عرض علامات الطلاب - للاطلاع فقط (بدون تعديل)
            {!selectedSubject && selectedClass && (
              <span className="text-blue-400 mr-2">📚 عرض جميع المواد</span>
            )}
            {selectedSubject && selectedClass && (
              <span className="text-emerald-400 mr-2">📊 المجموع الكلي: {currentMaxTotal} علامة</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
            disabled={!selectedClass}
          >
            <Printer className="w-3.5 h-3.5" />
            طباعة
          </button>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'جاري التحديث...' : 'تحديث'}
          </button>
        </div>
      </div>

      {/* ====== عرض الرسائل ====== */}
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

      {/* ====== أدوات الفلترة ====== */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-slate-900 rounded-xl border border-slate-800">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-slate-400 mb-1">الصف</label>
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedSubject('');
            }}
            className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">جميع الصفوف</option>
            {sortedClasses.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-slate-400 mb-1">المادة</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">جميع المواد</option>
            {sortedSubjects.map(sub => {
              const hasCustomConfig = gradingConfig?.subjects?.[sub.id] || 
                                     (selectedClass && gradingConfig?.subjects?.[`${sub.id}_${selectedClass}`]);
              return (
                <option key={sub.id} value={sub.id}>
                  {sub.name} {hasCustomConfig ? '🔧' : ''}
                </option>
              );
            })}
          </select>
          {selectedClass && filteredSubjects.length === 0 && (
            <p className="text-[10px] text-amber-400 mt-1">⚠️ لا توجد مواد لهذا الصف</p>
          )}
          {selectedClass && filteredSubjects.length > 0 && !selectedSubject && (
            <p className="text-[10px] text-blue-400 mt-1">📚 عرض {filteredSubjects.length} مادة</p>
          )}
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

        <div className="min-w-[150px]">
          <label className="block text-xs text-slate-400 mb-1">العام الدراسي</label>
          <div className="relative">
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full p-2.5 pr-10 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 appearance-none"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
          <p className="text-[9px] text-slate-500 mt-1">🔓 يمكن اختيار أي عام</p>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-slate-400 mb-1">بحث</label>
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

      {/* ====== حالة الفصل الدراسي ====== */}
      <div className="mb-4 p-3 bg-slate-900 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="text-slate-400">حالة الفصل:</span>
          <span className={`px-2 py-0.5 rounded-full ${selectedSemester === 1 ? (isSemester1Closed ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400') : (isSemester2Closed ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400')}`}>
            الفصل {selectedSemester}: {selectedSemester === 1 ? (isSemester1Closed ? '🔒 مغلق' : '✅ مفتوح') : (isSemester2Closed ? '🔒 مغلق' : '✅ مفتوح')}
          </span>
          <span className="text-slate-500">| عرض فقط - لا يمكن التعديل</span>
          <span className="text-slate-500">| العام: <span className="text-white font-bold">{academicYear}</span></span>
          {!selectedSubject && selectedClass && (
            <span className="text-blue-400">| 📚 عرض جميع المواد</span>
          )}
          {selectedSubject && selectedClass && (
            <span className="text-emerald-400">| 📊 المجموع الكلي: {currentMaxTotal} علامة</span>
          )}
        </div>
      </div>

      {/* ====== المحتوى ====== */}
      {renderContent()}
    </div>
  );
}