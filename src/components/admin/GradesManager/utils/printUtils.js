// src/components/admin/GradesManager/utils/printUtils.js
import { calculateTotal, getGrade, getTotalMaxForSubject } from './gradeCalculations';
import { getGradeFieldsForSubject } from '../constants/gradeFields';

export const printGradeSheet = (
  classData, 
  studentsData, 
  gradesData, 
  subjectData, 
  semesterData, 
  academicYearData,
  classId,
  gradingConfig
) => {
  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (!printWindow) return;
  
  const subjectId = subjectData?.id;
  
  // ✅ 1. الحصول على الحقول الديناميكية من قاعدة البيانات
  const dynamicFields = getGradeFieldsForSubject(subjectId, classId, gradingConfig);
  
  // ✅ 2. حساب المجموع الكلي الصحيح
  const maxTotal = getTotalMaxForSubject(subjectId, classId, gradingConfig);
  
  // ✅ 3. بناء ترويسة الجدول (الأعمدة) ديناميكياً
  const headerColumns = dynamicFields.map(field => 
    `<th style="padding: 8px; border: 1px solid #1a237e; text-align: center;">
      ${field.label}<br>
      <span style="font-size:10px;font-weight:normal;">(${field.max || 0})</span>
    </th>`
  ).join('');

  // ✅ 4. بناء صفوف البيانات
  const rows = studentsData.map(student => {
    const grade = gradesData.find(g => 
      g.studentId === student.id && 
      g.subjectId === subjectData?.id && 
      g.semester === semesterData &&
      g.academicYear === academicYearData
    );
    
    // تجميع القيم من قاعدة البيانات
    const fields = {};
    dynamicFields.forEach(f => {
      fields[f.key] = grade?.[f.key] || 0;
    });

    // حساب المجموع والنسبة المئوية
    const total = calculateTotal(fields, subjectId, gradingConfig);
    const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
    const gradeInfo = getGrade(percentage);
    
    // بناء خلايا الطالب
    const fieldCells = dynamicFields.map(f => 
      `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${fields[f.key] || 0}</td>`
    ).join('');

    return `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${student.fullName}</td>
        ${fieldCells}
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
  const subjectName = subjectData?.name || 'غير محدد';
  const schoolName = 'مدرستك الثانوية';

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
          .max-total { font-size: 12px; color: #555; }
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
              <span class="max-total">📊 المجموع الكلي: ${maxTotal} علامة</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="padding: 8px; border: 1px solid #1a237e; text-align: center;">اسم الطالب</th>
                ${headerColumns}
                <th style="padding: 8px; border: 1px solid #1a237e; text-align: center;">المجموع<br><span style="font-size:10px;font-weight:normal;">(${maxTotal})</span></th>
                <th style="padding: 8px; border: 1px solid #1a237e; text-align: center;">التقدير</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; display: flex; justify-content: space-around; flex-wrap: wrap;">
            <div><strong>عدد الطلاب:</strong> ${studentsData.length}</div>
            <div><strong>المعدل العام:</strong> ${studentsData.length > 0 ? (studentsData.reduce((sum, s) => {
              const grade = gradesData.find(g => g.studentId === s.id && g.subjectId === subjectData?.id && g.semester === semesterData && g.academicYear === academicYearData);
              return sum + (grade ? calculateTotal(grade, subjectId, gradingConfig) : 0);
            }, 0) / studentsData.length).toFixed(1) : 0}</div>
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