// src/services/notificationService.js
import { db } from './firebase';
import { 
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, limit, startAfter,
  Timestamp, writeBatch 
} from 'firebase/firestore';

// ====== الأنواع ======
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  SUCCESS: 'success',
  ERROR: 'error',
  GRADE: 'grade',
  ATTENDANCE: 'attendance',
  EXAM: 'exam',
  SUBJECT: 'subject',
  SEMESTER: 'semester',
  YEAR: 'year',
  BEHAVIOR: 'behavior',
  NOTE: 'note'
};

export const NOTIFICATION_PRIORITIES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

export const NOTIFICATION_ICONS = {
  [NOTIFICATION_TYPES.INFO]: 'ℹ️',
  [NOTIFICATION_TYPES.WARNING]: '⚠️',
  [NOTIFICATION_TYPES.SUCCESS]: '✅',
  [NOTIFICATION_TYPES.ERROR]: '❌',
  [NOTIFICATION_TYPES.GRADE]: '📝',
  [NOTIFICATION_TYPES.ATTENDANCE]: '📋',
  [NOTIFICATION_TYPES.EXAM]: '📄',
  [NOTIFICATION_TYPES.SUBJECT]: '📚',
  [NOTIFICATION_TYPES.SEMESTER]: '📅',
  [NOTIFICATION_TYPES.YEAR]: '📆',
  [NOTIFICATION_TYPES.BEHAVIOR]: '⭐',
  [NOTIFICATION_TYPES.NOTE]: '💬'
};

// ====== دالة مساعدة لإرسال إشعار ======
export const sendNotification = async (notificationData) => {
  try {
    const docRef = await addDoc(collection(db, 'notifications'), {
      ...notificationData,
      isRead: false,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error('❌ خطأ في إرسال الإشعار:', error);
    throw error;
  }
};

// ====== إرسال إشعار لعدة مستخدمين ======
export const sendNotificationToMultipleUsers = async (userIds, notificationData) => {
  if (!userIds || userIds.length === 0) {
    console.log('⚠️ لا يوجد مستخدمين لإرسال الإشعار');
    return [];
  }
  
  try {
    const batch = writeBatch(db);
    const notifications = [];
    
    userIds.forEach(userId => {
      const docRef = doc(collection(db, 'notifications'));
      batch.set(docRef, {
        ...notificationData,
        userId: userId,
        isRead: false,
        createdAt: new Date().toISOString()
      });
      notifications.push(docRef);
    });
    
    await batch.commit();
    console.log(`✅ تم إرسال ${notifications.length} إشعار`);
    return notifications;
  } catch (error) {
    console.error('❌ خطأ في إرسال الإشعارات:', error);
    throw error;
  }
};

// ====== ✅ جلب جميع المعلمين ======
export const getAllTeachers = async () => {
  try {
    const teachersSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher')));
    const teachers = [];
    teachersSnapshot.forEach(doc => {
      teachers.push({ id: doc.id, ...doc.data() });
    });
    return teachers;
  } catch (error) {
    console.error('❌ خطأ في جلب المعلمين:', error);
    return [];
  }
};

// ====== ✅ جلب جميع الأدمن ======
export const getAllAdmins = async () => {
  try {
    const adminsSnapshot = await getDocs(query(collection(db, 'users'), where('role', 'in', ['admin', 'admin_assistant'])));
    const admins = [];
    adminsSnapshot.forEach(doc => {
      admins.push({ id: doc.id, ...doc.data() });
    });
    return admins;
  } catch (error) {
    console.error('❌ خطأ في جلب الأدمن:', error);
    return [];
  }
};

// ====== ✅ جلب جميع الطلاب ======
export const getAllStudents = async () => {
  try {
    const studentsSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
    const students = [];
    studentsSnapshot.forEach(doc => {
      students.push({ id: doc.id, ...doc.data() });
    });
    return students;
  } catch (error) {
    console.error('❌ خطأ في جلب الطلاب:', error);
    return [];
  }
};

// ====== جلب الإشعارات ======
export const getUserNotifications = (userId, callback) => {
  if (!userId) return () => {};
  
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const notifications = [];
    snapshot.forEach(doc => {
      notifications.push({ id: doc.id, ...doc.data() });
    });
    callback(notifications);
  }, (error) => {
    console.error('❌ خطأ في جلب الإشعارات:', error);
    callback([]);
  });
};

// ====== جلب الإشعارات غير المقروءة ======
export const getUnreadNotifications = async (userId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    const snapshot = await getDocs(q);
    const notifications = [];
    snapshot.forEach(doc => {
      notifications.push({ id: doc.id, ...doc.data() });
    });
    return notifications;
  } catch (error) {
    console.error('❌ خطأ في جلب الإشعارات غير المقروءة:', error);
    return [];
  }
};

// ====== تحديث حالة الإشعار ======
export const markNotificationAsRead = async (notificationId) => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      isRead: true,
      readAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('❌ خطأ في تحديث حالة الإشعار:', error);
    throw error;
  }
};

// ====== تحديث كل الإشعارات كمقروءة ======
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    snapshot.forEach(doc => {
      batch.update(doc.ref, {
        isRead: true,
        readAt: new Date().toISOString()
      });
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('❌ خطأ في تحديث كل الإشعارات:', error);
    throw error;
  }
};

// ====== حذف إشعار ======
export const deleteNotification = async (notificationId) => {
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
    return true;
  } catch (error) {
    console.error('❌ خطأ في حذف الإشعار:', error);
    throw error;
  }
};

// ====== حذف كل الإشعارات ======
export const deleteAllNotifications = async (userId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('❌ خطأ في حذف كل الإشعارات:', error);
    throw error;
  }
};

// ==================== ✅ إشعارات محدثة ====================

// ====== 1. ✅ إشعار عند إغلاق الفصل الدراسي - لكل المعلمين ======
export const notifySemesterClosed = async (semester, academicYear, closedBy) => {
  // ✅ جلب جميع المعلمين
  const teachers = await getAllTeachers();
  const teacherIds = teachers.map(t => t.id);
  
  if (teacherIds.length === 0) {
    console.log('⚠️ لا يوجد معلمين لإرسال الإشعار');
    return;
  }
  
  return await sendNotificationToMultipleUsers(teacherIds, {
    type: NOTIFICATION_TYPES.SEMESTER,
    title: `🔒 تم إغلاق الفصل ${semester === 1 ? 'الأول' : 'الثاني'}`,
    message: `تم إغلاق الفصل ${semester === 1 ? 'الأول' : 'الثاني'} للعام الدراسي ${academicYear}. لا يمكن تعديل العلامات.`,
    link: '/teacher/grades',
    senderId: 'admin',
    senderName: closedBy || 'الإدارة',
    priority: NOTIFICATION_PRIORITIES.HIGH,
    metadata: {
      semester: semester,
      academicYear: academicYear
    }
  });
};

// ====== 2. ✅ إشعار عند فتح الفصل الدراسي - لكل المعلمين ======
export const notifySemesterOpened = async (semester, academicYear, openedBy) => {
  const teachers = await getAllTeachers();
  const teacherIds = teachers.map(t => t.id);
  
  if (teacherIds.length === 0) {
    console.log('⚠️ لا يوجد معلمين لإرسال الإشعار');
    return;
  }
  
  return await sendNotificationToMultipleUsers(teacherIds, {
    type: NOTIFICATION_TYPES.SEMESTER,
    title: `✅ تم فتح الفصل ${semester === 1 ? 'الأول' : 'الثاني'}`,
    message: `تم فتح الفصل ${semester === 1 ? 'الأول' : 'الثاني'} للعام الدراسي ${academicYear}. يمكنك الآن تعديل العلامات.`,
    link: '/teacher/grades',
    senderId: 'admin',
    senderName: openedBy || 'الإدارة',
    priority: NOTIFICATION_PRIORITIES.HIGH,
    metadata: {
      semester: semester,
      academicYear: academicYear
    }
  });
};

// ====== 3. ✅ إشعار عند بدء العام الدراسي - لكل المعلمين ======
export const notifyYearStarted = async (academicYear, startedBy) => {
  const teachers = await getAllTeachers();
  const teacherIds = teachers.map(t => t.id);
  
  if (teacherIds.length === 0) {
    console.log('⚠️ لا يوجد معلمين لإرسال الإشعار');
    return;
  }
  
  return await sendNotificationToMultipleUsers(teacherIds, {
    type: NOTIFICATION_TYPES.YEAR,
    title: '📆 بدء العام الدراسي',
    message: `تم بدء العام الدراسي ${academicYear}. يمكنك الآن البدء في إدخال العلامات.`,
    link: '/teacher/grades',
    senderId: 'admin',
    senderName: startedBy || 'الإدارة',
    priority: NOTIFICATION_PRIORITIES.HIGH,
    metadata: {
      academicYear: academicYear
    }
  });
};

// ====== 4. ✅ إشعار عند إغلاق العام الدراسي - لكل المعلمين ======
export const notifyYearClosed = async (academicYear, closedBy) => {
  const teachers = await getAllTeachers();
  const teacherIds = teachers.map(t => t.id);
  
  if (teacherIds.length === 0) {
    console.log('⚠️ لا يوجد معلمين لإرسال الإشعار');
    return;
  }
  
  return await sendNotificationToMultipleUsers(teacherIds, {
    type: NOTIFICATION_TYPES.YEAR,
    title: '🔒 إغلاق العام الدراسي',
    message: `تم إغلاق العام الدراسي ${academicYear}. تم الانتهاء من جميع الفصول.`,
    link: '/teacher/grades',
    senderId: 'admin',
    senderName: closedBy || 'الإدارة',
    priority: NOTIFICATION_PRIORITIES.HIGH,
    metadata: {
      academicYear: academicYear
    }
  });
};

// ====== 5. ✅ إشعار عند إدخال العلامات - للأدمن وللطلاب ======
export const notifyGradesAdded = async (gradeData, teacherName, subjectName, semester) => {
  // جلب الأدمن
  const admins = await getAllAdmins();
  const adminIds = admins.map(a => a.id);
  
  // جلب الطلاب المعنيين
  const studentIds = gradeData.studentIds || [];
  
  const allUsers = [...adminIds, ...studentIds];
  
  if (allUsers.length === 0) {
    console.log('⚠️ لا يوجد مستخدمين لإرسال الإشعار');
    return;
  }
  
  return await sendNotificationToMultipleUsers(allUsers, {
    type: NOTIFICATION_TYPES.GRADE,
    title: '📝 تم إدخال العلامات',
    message: `تم إدخال علامات مادة ${subjectName} للفصل ${semester === 1 ? 'الأول' : 'الثاني'} بواسطة المعلم ${teacherName}`,
    link: '/teacher/grades',
    senderId: gradeData.teacherId,
    senderName: teacherName,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    metadata: {
      subjectId: gradeData.subjectId,
      semester: semester,
      academicYear: gradeData.academicYear
    }
  });
};

// ====== 6. ✅ إشعار عند إضافة مادة جديدة - للطلاب والأدمن ======
export const notifyNewSubject = async (subjectData, students) => {
  const studentIds = students.map(s => s.id);
  const admins = await getAllAdmins();
  const adminIds = admins.map(a => a.id);
  
  const allUsers = [...studentIds, ...adminIds];
  
  if (allUsers.length === 0) {
    console.log('⚠️ لا يوجد مستخدمين لإرسال الإشعار');
    return;
  }
  
  return await sendNotificationToMultipleUsers(allUsers, {
    type: NOTIFICATION_TYPES.SUBJECT,
    title: '📚 مادة جديدة',
    message: `تم إضافة مادة جديدة: ${subjectData.name} للصف ${subjectData.className}`,
    link: '/teacher/grades',
    senderId: subjectData.teacherId,
    senderName: subjectData.teacherName,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    metadata: {
      subjectId: subjectData.id,
      classId: subjectData.classId
    }
  });
};

// ====== 7. ✅ إشعار عند إضافة امتحان جديد - للطلاب ======
export const notifyNewExam = async (examData, students) => {
  const studentIds = students.map(s => s.id);
  
  if (studentIds.length === 0) {
    console.log('⚠️ لا يوجد طلاب لإرسال الإشعار');
    return;
  }
  
  return await sendNotificationToMultipleUsers(studentIds, {
    type: NOTIFICATION_TYPES.EXAM,
    title: '📄 امتحان جديد',
    message: `تم إضافة امتحان: ${examData.title} في مادة ${examData.subjectName}`,
    link: '/student/exams',
    senderId: examData.teacherId,
    senderName: examData.teacherName,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    metadata: {
      examId: examData.id,
      subjectId: examData.subjectId
    }
  });
};

// ====== 8. ✅ إشعار عند تحديث علامات - للأدمن فقط ======
export const notifyGradesUpdated = async (studentId, studentName, subjectName, oldGrade, newGrade) => {
  const admins = await getAllAdmins();
  const adminIds = admins.map(a => a.id);
  
  if (adminIds.length === 0) {
    console.log('⚠️ لا يوجد أدمن لإرسال الإشعار');
    return;
  }
  
  return await sendNotificationToMultipleUsers(adminIds, {
    type: NOTIFICATION_TYPES.GRADE,
    title: '🔄 تحديث العلامات',
    message: `تم تحديث علامة الطالب ${studentName} في مادة ${subjectName} من ${oldGrade} إلى ${newGrade}`,
    link: '/admin/grades-manage',
    senderId: 'system',
    senderName: 'النظام',
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    metadata: {
      studentId: studentId,
      subjectId: subjectName
    }
  });
};

// ====== 9. ✅ إشعار عند تسجيل حضور - للطالب ======
export const notifyAttendanceRecorded = async (studentId, studentName, date, status) => {
  const statusMap = {
    present: 'حاضر ✅',
    absent: 'غائب ❌',
    late: 'متأخر ⏰',
    excused: 'معذور 📝'
  };
  
  return await sendNotification({
    userId: studentId,
    type: NOTIFICATION_TYPES.ATTENDANCE,
    title: '📋 تسجيل حضور',
    message: `تم تسجيل حضورك بتاريخ ${date} بحالة: ${statusMap[status] || status}`,
    link: '/student/attendance',
    senderId: 'system',
    senderName: 'النظام',
    priority: NOTIFICATION_PRIORITIES.LOW,
    metadata: {
      date: date,
      status: status
    }
  });
};

// ====== 10. ✅ إشعار عند إضافة سلوك - للطالب ======
export const notifyBehaviorAdded = async (studentId, studentName, behaviorType, description) => {
  const typeMap = {
    positive: 'إيجابي 🌟',
    negative: 'سلبي ⚠️',
    neutral: 'محايد 📌'
  };
  
  return await sendNotification({
    userId: studentId,
    type: NOTIFICATION_TYPES.BEHAVIOR,
    title: `⭐ تقييم سلوك ${typeMap[behaviorType] || ''}`,
    message: `تم إضافة تقييم سلوك: ${description}`,
    link: '/student/behavior',
    senderId: 'system',
    senderName: 'النظام',
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    metadata: {
      behaviorType: behaviorType
    }
  });
};

// ====== 11. ✅ إشعار عند إضافة ملاحظة - للطالب ======
export const notifyNoteAdded = async (studentId, studentName, noteContent, noteType) => {
  const typeMap = {
    teacher: 'معلم 👨‍🏫',
    principal: 'مدير 🏫',
    admin: 'إدارة 📋'
  };
  
  return await sendNotification({
    userId: studentId,
    type: NOTIFICATION_TYPES.NOTE,
    title: `💬 ملاحظة جديدة من ${typeMap[noteType] || ''}`,
    message: `تم إضافة ملاحظة جديدة: ${noteContent.substring(0, 100)}${noteContent.length > 100 ? '...' : ''}`,
    link: '/student/notes',
    senderId: 'system',
    senderName: 'النظام',
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    metadata: {
      noteType: noteType
    }
  });
};

// ====== 12. ✅ إشعار عند إضافة طالب جديد للصف - للمعلم ======
export const notifyStudentAddedToClass = async (studentId, studentName, className, teacherId) => {
  if (!teacherId) {
    console.log('⚠️ لا يوجد معلم للصف');
    return;
  }
  
  return await sendNotification({
    userId: teacherId,
    type: NOTIFICATION_TYPES.INFO,
    title: '👨‍🎓 طالب جديد',
    message: `تم إضافة الطالب ${studentName} إلى صف ${className}`,
    link: '/teacher/students',
    senderId: 'system',
    senderName: 'النظام',
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    metadata: {
      studentId: studentId,
      className: className
    }
  });
};

// ====== 13. ✅ إشعار عند إضافة واجب منزلي - للطلاب ======
export const notifyHomeworkAdded = async (homeworkData, students) => {
  const studentIds = students.map(s => s.id);
  
  if (studentIds.length === 0) {
    console.log('⚠️ لا يوجد طلاب لإرسال الإشعار');
    return;
  }
  
  return await sendNotificationToMultipleUsers(studentIds, {
    type: NOTIFICATION_TYPES.INFO,
    title: '📚 واجب منزلي جديد',
    message: `تم إضافة واجب منزلي: ${homeworkData.title} في مادة ${homeworkData.subjectName}، موعد التسليم: ${homeworkData.deadline}`,
    link: '/student/homework',
    senderId: homeworkData.teacherId,
    senderName: homeworkData.teacherName,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    metadata: {
      homeworkId: homeworkData.id
    }
  });
};

// ====== 14. ✅ إشعار عند إضافة إشعار عام - للجميع ======
export const notifyAnnouncement = async (title, message, targetRoles = ['teacher', 'student', 'admin']) => {
  const users = await getDocs(query(collection(db, 'users'), where('role', 'in', targetRoles)));
  const userIds = [];
  users.forEach(doc => userIds.push(doc.id));
  
  if (userIds.length === 0) {
    console.log('⚠️ لا يوجد مستخدمين لإرسال الإشعار');
    return;
  }
  
  return await sendNotificationToMultipleUsers(userIds, {
    type: NOTIFICATION_TYPES.INFO,
    title: `📢 ${title}`,
    message: message,
    link: '/notifications',
    senderId: 'admin',
    senderName: 'الإدارة',
    priority: NOTIFICATION_PRIORITIES.HIGH
  });
};

// ====== 15. ✅ إشعار عند تغيير كلمة المرور ======
export const notifyPasswordChanged = async (userId) => {
  return await sendNotification({
    userId: userId,
    type: NOTIFICATION_TYPES.INFO,
    title: '🔑 تم تغيير كلمة المرور',
    message: 'تم تغيير كلمة المرور الخاصة بحسابك بنجاح. إذا لم تقم بذلك، يرجى التواصل مع الإدارة فوراً.',
    link: '/profile',
    senderId: 'system',
    senderName: 'النظام',
    priority: NOTIFICATION_PRIORITIES.HIGH
  });
};