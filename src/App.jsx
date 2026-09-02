// src/App.jsx

import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LogOut, RefreshCw, Home } from 'lucide-react';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/common';
//import Login from './pages/Login';
import Login from './components/auth/Login';
import AdminDashboard from './components/admin/AdminDashboard';
//import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './components/teacher/TeacherDashboard';
// ============ ✅ مكون التوجيه حسب الدور (محسّن) ============
const DashboardRouter = () => {
  const { userData, loading, role, refreshUserData, isAuthenticated } = useAuth();
  const location = useLocation();
  
  // ✅ استخدام key مستقر يعتمد على userData وليس على التاريخ
  const dashboardKey = userData?.uid || 'default';

  console.log("🔍 DashboardRouter - role:", role);
  console.log("🔍 DashboardRouter - userData:", userData);
  console.log("🔍 DashboardRouter - loading:", loading);
  console.log("🔍 DashboardRouter - location:", location.pathname);

  // ✅ دالة لإعادة تحميل البيانات يدوياً
  const handleManualRefresh = useCallback(async () => {
    console.log("🔄 Manual refresh requested");
    await refreshUserData();
  }, [refreshUserData]);

  // ✅ عرض حالة التحميل
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <p className="text-xs text-slate-400">جاري تحميل البيانات...</p>
      </div>
    );
  }

  // ✅ عرض حالة عدم وجود بيانات
  if (!userData || !isAuthenticated) {
    console.log("⏳ انتظار تحميل userData...");
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <p className="text-xs text-slate-400">جاري تحميل بيانات المستخدم...</p>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleManualRefresh}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            تحديث الصفحة
          </button>
        </div>
      </div>
    );
  }

  console.log("🎯 التوجيه حسب الدور:", role);

  // ✅ التوجيه حسب الدور مع تمرير key مستقر
  if (role === 'admin' || role === 'admin_assistant') {
    console.log("✅ توجيه إلى لوحة الأدمن");
    return <AdminDashboard key={dashboardKey} />;
  }
  
  if (role === 'teacher') {
    console.log("✅ توجيه إلى لوحة المعلم");
    return <TeacherDashboard key={dashboardKey} />;
  }
  
  if (role === 'student') {
    console.log("✅ توجيه إلى لوحة الطالب");
    return <StudentDashboard key={dashboardKey} />;
  }

  console.log("⚠️ دور غير معروف، توجيه إلى login");
  return <Navigate to="/login" replace />;
};

// ============ ✅ مكون تسجيل الخروج (محسّن) ============
const LogoutButton = () => {
  const { logout, userData } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      console.error("❌ خطأ في تسجيل الخروج:", error);
    } finally {
      setIsLoggingOut(false);
    }
  }, [logout, isLoggingOut]);

  // ✅ إخفاء زر الخروج إذا لم يكن هناك مستخدم
  if (!userData) return null;

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="fixed bottom-4 left-4 z-50 bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-900/50 p-2.5 rounded-xl transition-all shadow-lg flex items-center gap-2 text-xs font-semibold disabled:opacity-50"
    >
      {isLoggingOut ? (
        <RefreshCw className="w-4 h-4 animate-spin" />
      ) : (
        <LogOut className="w-4 h-4" />
      )}
      <span>{isLoggingOut ? 'جاري الخروج...' : 'تسجيل الخروج'}</span>
    </button>
  );
};

// ============ ✅ مكون التوجيه المحمي (محسّن) ============
const ProtectedRouteWrapper = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // ✅ عرض حالة التحميل
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <p className="text-xs text-slate-400">جاري التحقق من بيانات الدخول...</p>
      </div>
    );
  }

  // ✅ إذا لم يكن المستخدم مسجلاً دخول، إعادة التوجيه إلى صفحة تسجيل الدخول
  if (!isAuthenticated) {
    console.log("🔒 مستخدم غير مصرح له، إعادة توجيه إلى login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// ============ التطبيق الرئيسي ============
export default function App() {
  return (
   <AuthProvider>
  <Router>
    <div className="min-h-screen bg-slate-900">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRouteWrapper>
            <div className="relative">
              <DashboardRouter />
              <LogoutButton />
            </div>
          </ProtectedRouteWrapper>
        } />
        <Route path="*" element={
          <ProtectedRouteWrapper>
            <div className="relative">
              <DashboardRouter />
              <LogoutButton />
            </div>
          </ProtectedRouteWrapper>
        } />
      </Routes>
    </div>
  </Router>
</AuthProvider>
  );
}