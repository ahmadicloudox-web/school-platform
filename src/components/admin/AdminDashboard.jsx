// src/components/admin/AdminDashboard.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  LayoutDashboard,
  Users,
  School,
  BookOpen,
  Calendar,
  Edit3,
  UserCheck,
  FileText,
  Settings,
  Upload,
  BarChart3,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  RefreshCw,
  Clock,
  UserCircle,
  FileCheck,
  Shield,
  UserCog,
  LogOut,
  Award,
  MessageSquare,
  ClipboardList,
  Send
} from 'lucide-react';

// استيراد المكونات الفرعية
import AdminInfo from './AdminInfo';
import SchoolInfo from './SchoolInfo';
import ClassesManager from './ClassesManager';
import TeachersManager from './TeachersManager';
import StudentsManager from './StudentsManager';
import ScheduleManager from './ScheduleManager';
import GradesManager from './GradesManager/GradesManager';
import GradesViewer from './GradesViewer';
import AttendanceManager from './AttendanceManager';
//import CertificateGenerator from './CertificateGenerator';
import CertificateGenerator from './CertificateGenerator/CertificateGenerator';
import AdminPermissions from './AdminPermissions';
import ImportStudents from './ImportStudents';
import SubjectsManager from './SubjectsManager';
import PeriodSettings from './PeriodSettings';
import ClassTeacherManager from './ClassTeacherManager';
import BehaviorManager from './BehaviorManager';
import NotesManager from './NotesManager';
import GradingConfigManager from './GradesManager/GradingConfigManager';
import ImportTeachers from './ImportTeachers';
import AnnouncementSender from './AnnouncementSender';
export default function AdminDashboard() {
  const { userData, logout } = useAuth();
  
  // ============ قراءة التبويب النشط من localStorage ============
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('adminActiveTab');
    const validTabs = [
      'overview', 'teachers', 'students', 'classes', 'subjects',
      'schedule', 'periods', 'grades-manage', 'grades-view',
      'grading-config', 'attendance', 'certificates', 'permissions', 
      'import', 'profile', 'school-settings', 'class-teacher',
      'behavior', 'notes'
    ];
    return savedTab && validTabs.includes(savedTab) ? savedTab : 'overview';
  });
  
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('adminSidebarOpen');
    return saved !== null ? saved === 'true' : true;
  });
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('adminDarkMode');
    return saved !== null ? saved === 'true' : true;
  });
  
  const [stats, setStats] = useState({
    teachers: 0,
    students: 0,
    classes: 0,
    subjects: 0,
    attendanceToday: 0,
    pendingRequests: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ============ حفظ التبويب النشط في localStorage ============
  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

  // ============ حفظ حالة الشريط الجانبي ============
  useEffect(() => {
    localStorage.setItem('adminSidebarOpen', String(sidebarOpen));
  }, [sidebarOpen]);

  // ============ حفظ حالة الوضع الداكن ============
  useEffect(() => {
    localStorage.setItem('adminDarkMode', String(darkMode));
  }, [darkMode]);

  // ============ جلب الإحصائيات ============
  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const [teachersSnap, studentsSnap, classesSnap, subjectsSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'teacher'))),
        getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
        getDocs(collection(db, 'classes')),
        getDocs(collection(db, 'subjects'))
      ]);

      setStats({
        teachers: teachersSnap.size,
        students: studentsSnap.size,
        classes: classesSnap.size,
        subjects: subjectsSnap.size,
        attendanceToday: 45,
        pendingRequests: 3
      });
    } catch (error) {
      console.error('❌ خطأ في جلب الإحصائيات:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // ============ تحديث البيانات يدوياً ============
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }, [loadStats]);

  // ============ ✅ تقسيم التبويبات إلى مجموعات ============
  const tabGroups = useMemo(() => [
    {
      id: 'main',
      label: '📊 الرئيسية',
      tabs: [
        { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
      ]
    },
    {
      id: 'management',
      label: '👨‍🏫 إدارة المدرسة',
      tabs: [
        { id: 'teachers', label: 'المعلمين', icon: Users },
        { id: 'students', label: 'الطلاب', icon: Users },
        { id: 'classes', label: 'الصفوف', icon: School },
        { id: 'subjects', label: 'المواد', icon: BookOpen },
        { id: 'class-teacher', label: 'مربي الصف', icon: UserCog },
      ]
    },
    {
      id: 'academic',
      label: '📚 الجداول والعلامات',
      tabs: [
        { id: 'schedule', label: 'الجداول الحصص', icon: Calendar },
        { id: 'periods', label: 'توقيت الحصص', icon: Clock },
        { id: 'grades-manage', label: 'إدارة العلامات', icon: Edit3 },
        { id: 'grades-view', label: 'عرض العلامات', icon: FileText },
        { id: 'grading-config', label: 'توزيع العلامات', icon: Settings },
      ]
    },
    {
      id: 'students-followup',
      label: '📋 متابعة الطلاب',
      tabs: [
        { id: 'attendance', label: 'الحضور', icon: UserCheck },
        { id: 'behavior', label: 'السلوك', icon: Award },
        { id: 'notes', label: 'الملاحظات', icon: MessageSquare },
      ]
    },
    {
      id: 'reports',
      label: '📄 التقارير',
      tabs: [
        { id: 'certificates', label: 'الشهادات', icon: FileCheck },
      ]
    },
    {
      id: 'settings',
      label: '⚙️ الإعدادات',
      tabs: [
        { id: 'permissions', label: 'الصلاحيات', icon: Shield },
         { id: 'announcement', label: 'إشعار عام', icon: Send },
        { id: 'import', label: 'استيراد طلاب', icon: Upload },
        { id: 'import-teachers', label: 'استيراد معلمين', icon: Upload }, // ✅ إضافة هذه
        { id: 'profile', label: 'معلوماتي', icon: UserCircle },
        { id: 'school-settings', label: 'إعدادات المدرسة', icon: School },
      ]
    },
  ], []);

  // ============ ✅ الحصول على التبويبات المسطحة ============
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
                  <h1 className="text-2xl font-black">مرحباً، {userData?.fullName || 'المدير'} 👋</h1>
                  <p className="text-blue-100 mt-1">لوحة تحكم إدارة المدرسة</p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl">
                  <GraduationCap className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { id: 'teachers', label: 'المعلمين', value: stats.teachers, icon: Users, color: 'blue' },
                { id: 'students', label: 'الطلاب', value: stats.students, icon: Users, color: 'emerald' },
                { id: 'classes', label: 'الصفوف', value: stats.classes, icon: School, color: 'purple' },
                { id: 'subjects', label: 'المواد', value: stats.subjects, icon: BookOpen, color: 'amber' },
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

      case 'teachers': return <TeachersManager />;
      case 'students': return <StudentsManager />;
      case 'classes': return <ClassesManager />;
      case 'subjects': return <SubjectsManager />;
      case 'schedule': return <ScheduleManager />;
      case 'periods': return <PeriodSettings />;
      case 'grades-manage': return <GradesManager mode="edit" />;
      case 'grading-config': return <GradingConfigManager />;
      case 'grades-view': return <GradesViewer />;
      case 'attendance': return <AttendanceManager />;
      case 'class-teacher': return <ClassTeacherManager />;
      case 'behavior': return <BehaviorManager />;
      case 'notes': return <NotesManager />;
      case 'certificates': return <CertificateGenerator />;
      case 'permissions': return <AdminPermissions />;
      case 'announcement':return <AnnouncementSender darkMode={darkMode} />;
      case 'import': return <ImportStudents />;
      case 'import-teachers': return <ImportTeachers />;
      case 'profile': return <AdminInfo />;
      case 'school-settings': return <SchoolInfo />;
      default: return null;
    }
  }, [activeTab, stats, userData]);

  // ============ عرض التبويبات العلوية ============
  const renderTabs = useCallback(() => {
    return (
      <div className="flex flex-wrap gap-1 p-1 bg-slate-800 rounded-xl border border-slate-700 mb-6">
        {flatTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>
    );
  }, [activeTab, flatTabs]);

  // ============ عرض حالة التحميل ============
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
      {/* ====== ✅ الشريط الجانبي المحسّن ====== */}
      <div className={`fixed right-0 top-0 h-full ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'} border-l transition-all duration-300 z-50 ${sidebarOpen ? 'w-72' : 'w-20'}`}>
        {/* ✅ الشعار المحسّن */}
        <div className={`flex items-center h-16 px-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'} ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-blue-500" />
            {sidebarOpen && (
              <div>
                <span className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'} block`}>المنصة الذكية</span>
                <span className="text-[9px] text-slate-400 block">نظام إدارة المدرسة</span>
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

        {/* ✅ معلومات المستخدم المحسّنة */}
        {sidebarOpen && userData && (
          <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                {userData.fullName?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'} truncate`}>
                  {userData.fullName || 'مستخدم'}
                </p>
                <p className="text-[10px] text-blue-400">
                  {userData.role === 'admin' ? 'مدير النظام' : 'مساعد مدير'}
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

        {/* ✅ القائمة الجانبية المحسّنة (أيقونات أكبر) */}
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