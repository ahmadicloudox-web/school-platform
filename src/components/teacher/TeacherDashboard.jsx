// src/components/teacher/TeacherDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { collection, doc, getDocs, query, where, onSnapshot, getDoc } from 'firebase/firestore';
import {
  LayoutDashboard,
  Users,
  School,
  BookOpen,
  Calendar,
  Edit3,
  UserCheck,
  FileText,
  BarChart3,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  RefreshCw,
  UserCircle,
  LogOut,
  Award,
  MessageSquare,
  Video,
  Sparkles
} from 'lucide-react';

// استيراد المكونات الفرعية
import TeacherInfo from './TeacherInfo';
import TeacherGradesManager from './TeacherGradesManager';
import TeacherSubGrades from './TeacherSubGrades';
import TeacherAttendance from './TeacherAttendance';
import TeacherBehavior from './TeacherBehavior';
import TeacherNotes from './TeacherNotes';
import TeacherSchedule from './TeacherSchedule';
import TeacherClasses from './TeacherClasses';
import TeacherStudents from './TeacherStudents';
import LiveTeaching from './LiveTeaching';
import AIGenerator from './AIGenerator';

export default function TeacherDashboard() {
  const { userData, logout } = useAuth();
  
  // ============ قراءة التبويب النشط من localStorage ============
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('teacherActiveTab');
    const validTabs = [
      'overview', 'classes', 'students', 'schedule', 'attendance',
      'grades', 'sub-grades', 'behavior', 'notes', 'live', 'ai', 'profile'
    ];
    return savedTab && validTabs.includes(savedTab) ? savedTab : 'overview';
  });
  
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('teacherSidebarOpen');
    return saved !== null ? saved === 'true' : true;
  });
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('teacherDarkMode');
    return saved !== null ? saved === 'true' : true;
  });
  
  // ============ بيانات المعلم ============
  const [teacherData, setTeacherData] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    classes: 0,
    students: 0,
    subjects: 0,
    pendingGrades: 0,
    attendanceToday: 0
  });

  // ============ حفظ التبويب النشط في localStorage ============
  useEffect(() => {
    localStorage.setItem('teacherActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('teacherSidebarOpen', String(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    localStorage.setItem('teacherDarkMode', String(darkMode));
  }, [darkMode]);

  // ============ جلب بيانات المعلم ============
  useEffect(() => {
    if (!userData?.uid) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let unsubSubjects = null;
    let unsubClasses = null;
    let unsubStudents = null;

    const fetchTeacherData = async () => {
      try {
        // جلب بيانات المعلم
        const teacherDoc = await getDoc(doc(db, 'users', userData.uid));
        if (teacherDoc.exists() && isMounted) {
          setTeacherData({ id: teacherDoc.id, ...teacherDoc.data() });
        }

        // ✅ جلب المواد التي يدرسها المعلم
        unsubSubjects = onSnapshot(
          query(collection(db, 'subjects'), where('teacherId', '==', userData.uid)),
          (snapshot) => {
            if (!isMounted) return;
            const subjectList = [];
            snapshot.forEach(doc => {
              subjectList.push({ id: doc.id, ...doc.data() });
            });
            setSubjects(subjectList);
            
            const teacherClassIds = new Set();
            subjectList.forEach(s => {
              if (s.classId) teacherClassIds.add(s.classId);
            });
            
            setStats(prev => ({
              ...prev,
              classes: teacherClassIds.size,
              subjects: subjectList.length
            }));
            
            setLoading(false);
          },
          (error) => {
            console.error('❌ خطأ في جلب المواد:', error);
            if (isMounted) setLoading(false);
          }
        );

        // ✅ جلب الصفوف
        unsubClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
          if (!isMounted) return;
          const classList = [];
          snapshot.forEach(doc => {
            classList.push({ id: doc.id, ...doc.data() });
          });
          setClasses(classList);
        });

        // ✅ جلب الطلاب
        unsubStudents = onSnapshot(
          query(collection(db, 'users'), where('role', '==', 'student')),
          (snapshot) => {
            if (!isMounted) return;
            const studentList = [];
            snapshot.forEach(doc => {
              studentList.push({ id: doc.id, ...doc.data() });
            });
            setStudents(studentList);
            
            const teacherClassIds = new Set();
            subjects.forEach(s => {
              if (s.classId) teacherClassIds.add(s.classId);
            });
            
            const studentCount = studentList.filter(s => teacherClassIds.has(s.classId)).length;
            setStats(prev => ({
              ...prev,
              students: studentCount
            }));
          },
          (error) => {
            console.error('❌ خطأ في جلب الطلاب:', error);
          }
        );

      } catch (error) {
        console.error('❌ خطأ في جلب بيانات المعلم:', error);
        if (isMounted) setLoading(false);
      }
    };

    fetchTeacherData();

    return () => {
      isMounted = false;
      if (unsubSubjects) unsubSubjects();
      if (unsubClasses) unsubClasses();
      if (unsubStudents) unsubStudents();
    };
  }, [userData]);

  // ============ تحديث البيانات ============
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // ============ ✅ تقسيم التبويبات ============
  const tabGroups = useMemo(() => [
    {
      id: 'main',
      label: '📊 الرئيسية',
      tabs: [
        { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
        { id: 'live', label: 'البث المباشر', icon: Video },
      ]
    },
    {
      id: 'teaching',
      label: '📚 التدريس',
      tabs: [
        { id: 'classes', label: 'صفوفي', icon: School },
        { id: 'students', label: 'طلابي', icon: Users },
        { id: 'schedule', label: 'جدول الحصص', icon: Calendar },
      ]
    },
    {
      id: 'evaluation',
      label: '📝 التقييم',
      tabs: [
        { id: 'grades', label: 'العلامات', icon: Edit3 },
        { id: 'sub-grades', label: 'دفتر العلامات', icon: BookOpen },
        { id: 'attendance', label: 'الحضور', icon: UserCheck },
        { id: 'behavior', label: 'السلوك', icon: Award },
        { id: 'notes', label: 'الملاحظات', icon: MessageSquare },
      ]
    },
    {
      id: 'tools',
      label: '🛠️ أدوات',
      tabs: [
        { id: 'ai', label: 'الذكاء الاصطناعي', icon: Sparkles },
      ]
    },
    {
      id: 'settings',
      label: '⚙️ الإعدادات',
      tabs: [
        { id: 'profile', label: 'معلوماتي', icon: UserCircle },
      ]
    },
  ], []);

  const flatTabs = useMemo(() => {
    return tabGroups.flatMap(group => group.tabs);
  }, [tabGroups]);

  // ============ عرض المحتوى ============
  const renderContent = useCallback(() => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6 fade-in">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black">مرحباً، {teacherData?.fullName || 'المعلم'} 👋</h1>
                  <p className="text-blue-100 mt-1">لوحة تحكم المعلم</p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl">
                  <GraduationCap className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { id: 'classes', label: 'صفوفي', value: stats.classes, icon: School, color: 'blue' },
                { id: 'students', label: 'طلابي', value: stats.students, icon: Users, color: 'emerald' },
                { id: 'subjects', label: 'موادي', value: stats.subjects, icon: BookOpen, color: 'purple' },
                { id: 'attendance', label: 'حضور اليوم', value: stats.attendanceToday || 0, icon: UserCheck, color: 'amber' },
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-${item.color}-500 transition-all cursor-pointer`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-lg bg-${item.color}-500/10 text-${item.color}-400`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black text-white">{item.value}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-300 mt-2">{item.label}</h3>
                  <p className="text-xs text-slate-500">إجمالي {item.label}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'classes':
        return <TeacherClasses classes={classes} subjects={subjects} teacherId={userData?.uid} darkMode={darkMode} />;
      
      case 'students':
        return <TeacherStudents students={students} classes={classes} subjects={subjects} darkMode={darkMode} />;
      
      case 'schedule':
        return <TeacherSchedule teacherId={userData?.uid} darkMode={darkMode} />;
      
      case 'grades':
        return <TeacherGradesManager teacherId={userData?.uid} darkMode={darkMode} teacherData={teacherData} />;
      
      case 'sub-grades':
        return <TeacherSubGrades teacherId={userData?.uid} darkMode={darkMode} teacherData={teacherData} />;
      
      case 'attendance':
        return <TeacherAttendance teacherId={userData?.uid} darkMode={darkMode} />;
      
      case 'behavior':
        return <TeacherBehavior teacherId={userData?.uid} darkMode={darkMode} />;
      
      case 'notes':
        return <TeacherNotes teacherId={userData?.uid} darkMode={darkMode} />;
      
      case 'live':
        return <LiveTeaching teacherData={teacherData} classes={classes} subjects={subjects} darkMode={darkMode} />;
      
      case 'ai':
        return <AIGenerator darkMode={darkMode} />;
      
      case 'profile':
        return <TeacherInfo teacherId={userData?.uid} darkMode={darkMode} classes={classes} />;
      
      default:
        return null;
    }
  }, [activeTab, stats, teacherData, userData, classes, students, subjects, darkMode]);

  // ============ عرض التحميل ============
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        <p className="text-slate-400 mt-4 text-sm">جاري تحميل بيانات المعلم...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
      {/* ====== ✅ الشريط الجانبي ====== */}
      <div className={`fixed right-0 top-0 h-full ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'} border-l transition-all duration-300 z-50 ${sidebarOpen ? 'w-72' : 'w-20'}`}>
        {/* الشعار */}
        <div className={`flex items-center h-16 px-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'} ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-blue-500" />
            {sidebarOpen && (
              <div>
                <span className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'} block`}>بوابة المعلم</span>
                <span className="text-[9px] text-slate-400 block">نظام التدريس الذكي</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            {sidebarOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* معلومات المستخدم */}
        {sidebarOpen && teacherData && (
          <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                {teacherData.fullName?.charAt(0) || 'M'}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'} truncate`}>
                  {teacherData.fullName || 'معلم'}
                </p>
                <p className="text-[10px] text-blue-400">
                  {teacherData.role === 'teacher' ? 'معلم' : 'مساعد معلم'}
                </p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* القائمة الجانبية */}
        <nav className="p-3 space-y-2 overflow-y-auto max-h-[calc(100vh-170px)]">
          {tabGroups.map((group) => (
            <div key={group.id}>
              {sidebarOpen && group.tabs.length > 0 && (
                <div className="text-[10px] font-bold text-slate-500 px-3 py-1.5 mt-1">
                  {group.label}
                </div>
              )}
              {group.tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      !sidebarOpen && 'justify-center'
                    } ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                        : darkMode 
                          ? 'text-slate-400 hover:bg-slate-700 hover:text-white' 
                          : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    <tab.icon className={`w-6 h-6 ${isActive ? 'text-white' : ''}`} />
                    {sidebarOpen && <span>{tab.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* ====== المحتوى الرئيسي ====== */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'mr-72' : 'mr-20'}`}>
        {/* الهيدر */}
        <header className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b px-4 py-3 sticky top-0 z-40`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`p-2 rounded-lg hover:bg-slate-700 ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition-colors`}
              >
                <LayoutDashboard className="w-5 h-5" />
              </button>
              <h2 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {flatTabs.find(t => t.id === activeTab)?.label || 'لوحة التحكم'}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} hidden md:block`}>
                {new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`p-2 rounded-lg hover:bg-slate-700 transition-all disabled:opacity-50 ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg hover:bg-slate-700 ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition-all`}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </header>

        {/* المحتوى */}
        <main className="p-4 md:p-6">
           <div className="w-full">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}