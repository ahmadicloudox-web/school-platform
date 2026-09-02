// src/components/admin/GradesManager/hooks/useSchoolSettings.js

import { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../../../../services/firebase';
import { 
  collection, doc, getDocs, getDoc, addDoc, updateDoc,
  query, where, onSnapshot, orderBy, limit 
} from 'firebase/firestore';
import { reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

export const useSchoolSettings = () => {
  const [currentYearDoc, setCurrentYearDoc] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState(
    new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)
  );

  // حالة الفصول المستخدمة في التطبيق
  const [isSemester1Closed, setIsSemester1Closed] = useState(false);
  const [isSemester2Closed, setIsSemester2Closed] = useState(false);
  const [isYearActive, setIsYearActive] = useState(false);
  const [isYearClosed, setIsYearClosed] = useState(false);

  // ====== 1. جلب العام الدراسي النشط من مجموعة academicYears ======
  useEffect(() => {
    setSettingsLoading(true);
    
    const q = query(
      collection(db, 'academicYears'),
      where('status', '==', 'active'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = { id: doc.id, ...doc.data() };
        setCurrentYearDoc(data);
        setAcademicYear(data.yearName);
        
        // تحديث الحالات بناءً على البيانات
        setIsSemester1Closed(data.semester1?.status === 'closed');
        setIsSemester2Closed(data.semester2?.status === 'closed');
        setIsYearActive(data.status === 'active');
        setIsYearClosed(data.status === 'closed');
        
        console.log('✅ تم تحديث العام الدراسي النشط:', data);
      } else {
        setCurrentYearDoc(null);
        setIsSemester1Closed(false);
        setIsSemester2Closed(false);
        setIsYearActive(false);
        setIsYearClosed(false);
        console.log('ℹ️ لا يوجد عام دراسي نشط حالياً');
      }
      setSettingsLoading(false);
    }, (error) => {
      console.error('❌ خطأ في الاستماع للعام الدراسي:', error);
      setSettingsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ====== 2. التحقق من كلمة المرور ======
  const verifyAdminPassword = useCallback(async (password) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('الرجاء تسجيل الدخول أولاً');

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) throw new Error('المستخدم غير موجود');
      
      const data = userDoc.data();
      if (data.role !== 'admin' && data.role !== 'admin_assistant') {
        throw new Error('ليس لديك صلاحية للقيام بهذا الإجراء');
      }

      try {
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
        return true;
      } catch (authError) {
        if (authError.code === 'auth/wrong-password') return false;
        console.warn('Reauthentication failed, checking stored password');
        return password === data.password;
      }
    } catch (error) {
      console.error('❌ خطأ في التحقق من كلمة المرور:', error);
      return false;
    }
  }, []);

  // ====== 3. دالة بدء العام الدراسي ======
  const startAcademicYear = useCallback(async (year, adminPassword) => {
    const isValid = await verifyAdminPassword(adminPassword);
    if (!isValid) throw new Error('كلمة المرور غير صحيحة');

    // إنشاء مستند جديد في مجموعة academicYears
    const newYearData = {
      yearName: year,
      status: 'active',
      startDate: new Date().toISOString(),
      semester1: { status: 'active' },
      semester2: { status: 'closed' },
      createdAt: new Date().toISOString(),
      createdBy: auth.currentUser?.uid || 'admin'
    };

    const docRef = await addDoc(collection(db, 'academicYears'), newYearData);
    
    // تحديث الحالة محلياً
    setCurrentYearDoc({ id: docRef.id, ...newYearData });
    setAcademicYear(year);
    setIsSemester1Closed(false);
    setIsSemester2Closed(false);
    setIsYearActive(true);
    setIsYearClosed(false);

    return year;
  }, [verifyAdminPassword]);

  // ====== 4. دالة فتح الفصل ======
  const openSemester = useCallback(async (semester, adminPassword) => {
    const isValid = await verifyAdminPassword(adminPassword);
    if (!isValid) throw new Error('كلمة المرور غير صحيحة');

    if (!currentYearDoc) throw new Error('لا يوجد عام دراسي نشط');

    const semesterKey = semester === 1 ? 'semester1' : 'semester2';
    
    const updateData = {
      [`${semesterKey}.status`]: 'active',
      [`${semesterKey}.openedAt`]: new Date().toISOString(),
      [`${semesterKey}.openedBy`]: auth.currentUser?.uid || 'admin'
    };

    await updateDoc(doc(db, 'academicYears', currentYearDoc.id), updateData);

    // تحديث محلي
    if (semester === 1) setIsSemester1Closed(false);
    else setIsSemester2Closed(false);

    return semester;
  }, [currentYearDoc, verifyAdminPassword]);

  // ====== 5. دالة إغلاق الفصل ======
  const closeSemester = useCallback(async (semester, adminPassword) => {
    const isValid = await verifyAdminPassword(adminPassword);
    if (!isValid) throw new Error('كلمة المرور غير صحيحة');

    if (!currentYearDoc) throw new Error('لا يوجد عام دراسي نشط');

    const semesterKey = semester === 1 ? 'semester1' : 'semester2';
    
    const updateData = {
      [`${semesterKey}.status`]: 'closed',
      [`${semesterKey}.closedAt`]: new Date().toISOString(),
      [`${semesterKey}.closedBy`]: auth.currentUser?.uid || 'admin'
    };

    await updateDoc(doc(db, 'academicYears', currentYearDoc.id), updateData);

    // تحديث محلي
    if (semester === 1) setIsSemester1Closed(true);
    else setIsSemester2Closed(true);

    return semester;
  }, [currentYearDoc, verifyAdminPassword]);

  // ====== 6. دالة إغلاق العام الدراسي ======
  const closeAcademicYear = useCallback(async (adminPassword) => {
    const isValid = await verifyAdminPassword(adminPassword);
    if (!isValid) throw new Error('كلمة المرور غير صحيحة');

    if (!currentYearDoc) throw new Error('لا يوجد عام دراسي نشط');

    const updateData = {
      status: 'closed',
      endDate: new Date().toISOString(),
      closedBy: auth.currentUser?.uid || 'admin'
    };

    await updateDoc(doc(db, 'academicYears', currentYearDoc.id), updateData);

    // تحديث محلي
    setIsYearActive(false);
    setIsYearClosed(true);

    return true;
  }, [currentYearDoc, verifyAdminPassword]);

  return {
    currentYearDoc,
    settingsLoading,
    academicYear,
    setAcademicYear,
    isSemester1Closed,
    isSemester2Closed,
    isYearActive,
    isYearClosed,
    verifyAdminPassword,
    startAcademicYear,
    openSemester,
    closeSemester,
    closeAcademicYear
  };
};