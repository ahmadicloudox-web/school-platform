// src/components/admin/GradingConfigManager.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../../services/firebase';
import { 
  collection, doc, getDocs, getDoc, updateDoc, 
  query, onSnapshot 
} from 'firebase/firestore';
import { 
  Settings, Save, Loader2, CheckCircle, AlertCircle,
  Edit3, X, Plus, Trash2, RefreshCw, School,
  BookOpen, FileText, Filter
} from 'lucide-react';
import { GRADE_FIELD_KEYS, GRADE_FIELD_LABELS, DEFAULT_GRADING_CONFIG } from './constants/gradeFields';

export default function GradingConfigManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [gradingConfig, setGradingConfig] = useState({
    default: { ...DEFAULT_GRADING_CONFIG },
    subjects: {}
  });

  // ============ ✅ فلترة المواد حسب الصف ============
  const filteredSubjects = useMemo(() => {
    if (!selectedClass) return subjects;
    return subjects.filter(subject => subject.classId === selectedClass);
  }, [subjects, selectedClass]);

  // ============ جلب البيانات ============
  useEffect(() => {
    const unsubSubjects = onSnapshot(collection(db, 'subjects'), (snapshot) => {
      const subjectList = [];
      snapshot.forEach(doc => {
        subjectList.push({ id: doc.id, ...doc.data() });
      });
      setSubjects(subjectList);
    });

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      const classList = [];
      snapshot.forEach(doc => {
        classList.push({ id: doc.id, ...doc.data() });
      });
      setClasses(classList);
    });

    const fetchConfig = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'schoolSettings', 'settings'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          if (data.gradingConfig) {
            setGradingConfig(data.gradingConfig);
            console.log('✅ تم جلب توزيع العلامات:', data.gradingConfig);
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('❌ خطأ:', error);
        setLoading(false);
      }
    };
    fetchConfig();

    return () => {
      unsubSubjects();
      unsubClasses();
    };
  }, []);

  // ============ حفظ التوزيع ============
  const handleSave = async () => {
    try {
      setSaving(true);
      await updateDoc(doc(db, 'schoolSettings', 'settings'), {
        gradingConfig: gradingConfig,
        updatedAt: new Date().toISOString()
      });
      setMessage({ type: 'success', text: '✅ تم حفظ توزيع العلامات بنجاح!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: '❌ خطأ في الحفظ: ' + error.message });
    } finally {
      setSaving(false);
    }
  };

  // ============ الحصول على مفتاح التوزيع ============
  const getConfigKey = (subjectId, classId) => {
    if (!subjectId) return null;
    return classId ? `${subjectId}_${classId}` : subjectId;
  };

  // ============ تحديث قيمة حقل ============
  const updateFieldValue = (fieldKey, value) => {
    if (!selectedSubject) {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 0) return;

      setGradingConfig(prev => {
        const newConfig = { ...prev };
        newConfig.default = { ...newConfig.default, [fieldKey]: numValue };
        const total = GRADE_FIELD_KEYS.reduce((sum, key) => sum + (newConfig.default[key] || 0), 0);
        newConfig.default.total = total;
        return newConfig;
      });
      return;
    }

    const configKey = getConfigKey(selectedSubject, selectedClass);
    const numValue = Number(value);
    if (isNaN(numValue) || numValue < 0) return;

    setGradingConfig(prev => {
      const newConfig = { ...prev };
      
      if (!newConfig.subjects[configKey]) {
        newConfig.subjects[configKey] = { ...DEFAULT_GRADING_CONFIG };
      }
      
      newConfig.subjects[configKey] = { 
        ...newConfig.subjects[configKey], 
        [fieldKey]: numValue 
      };
      
      const total = GRADE_FIELD_KEYS.reduce((sum, key) => sum + (newConfig.subjects[configKey][key] || 0), 0);
      newConfig.subjects[configKey].total = total;
      
      return newConfig;
    });
  };

  // ============ إعادة تعيين توزيع ============
  const resetConfig = () => {
    if (!selectedSubject) {
      if (!confirm('⚠️ هل أنت متأكد من إعادة تعيين التوزيع الافتراضي؟')) return;
      setGradingConfig(prev => ({
        ...prev,
        default: { ...DEFAULT_GRADING_CONFIG }
      }));
      return;
    }

    const configKey = getConfigKey(selectedSubject, selectedClass);
    if (!confirm(`⚠️ هل أنت متأكد من إعادة تعيين توزيع ${getDisplayName()}؟`)) return;
    
    setGradingConfig(prev => {
      const newConfig = { ...prev };
      delete newConfig.subjects[configKey];
      return newConfig;
    });
  };

  // ============ الحصول على اسم العرض ============
  const getDisplayName = () => {
    const subject = subjects.find(s => s.id === selectedSubject);
    const classObj = classes.find(c => c.id === selectedClass);
    let name = subject?.name || 'المادة';
    if (classObj) {
      name += ` (${classObj.name})`;
    }
    return name;
  };

  // ============ الحصول على التوزيع الحالي ============
  const getCurrentConfig = () => {
    if (!selectedSubject) {
      return gradingConfig.default;
    }
    const configKey = getConfigKey(selectedSubject, selectedClass);
    return gradingConfig.subjects[configKey] || gradingConfig.default;
  };

  // ============ التحقق من وجود توزيع مخصص ============
  const hasCustomConfig = () => {
    if (!selectedSubject) return false;
    const configKey = getConfigKey(selectedSubject, selectedClass);
    return !!gradingConfig.subjects[configKey];
  };

  // ============ عرض حالة التحميل ============
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-slate-400 text-sm mr-3">جاري تحميل البيانات...</p>
      </div>
    );
  }

  const currentConfig = getCurrentConfig();
  const isCustom = hasCustomConfig();

  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
      {/* ====== العنوان ====== */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            توزيع العلامات
          </h2>
          <p className="text-xs text-slate-400">تخصيص توزيع العلامات حسب المادة والصف</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'جاري الحفظ...' : 'حفظ التوزيع'}
          </button>
        </div>
      </div>

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

      {/* ====== ✅ اختيار الصف والمادة ====== */}
      <div className="flex flex-wrap gap-3 mb-4 p-4 bg-slate-900 rounded-xl border border-slate-800">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs text-slate-400 mb-1">اختر الصف</label>
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedSubject('');
            }}
            className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">جميع الصفوف</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs text-slate-400 mb-1">اختر المادة</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">التوزيع الافتراضي (جميع المواد)</option>
            {filteredSubjects.map(sub => {
              const hasSubjectConfig = Object.keys(gradingConfig.subjects).some(key => 
                key === sub.id || key.startsWith(`${sub.id}_`)
              );
              return (
                <option key={sub.id} value={sub.id}>
                  {sub.name} {hasSubjectConfig ? '🔧' : ''}
                </option>
              );
            })}
          </select>
          {selectedClass && filteredSubjects.length === 0 && (
            <p className="text-[10px] text-amber-400 mt-1">⚠️ لا توجد مواد لهذا الصف</p>
          )}
        </div>

        {selectedSubject && (
          <div className="flex items-center gap-2">
            <button
              onClick={resetConfig}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 rounded-xl text-xs font-bold transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {selectedSubject ? 'إعادة تعيين' : 'إعادة تعيين الافتراضي'}
            </button>
            {isCustom && (
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                🔧 مخصص ({selectedClass ? `للصف ${classes.find(c => c.id === selectedClass)?.name}` : 'للمادة'})
              </span>
            )}
          </div>
        )}
      </div>

      {/* ====== عرض التوزيع ====== */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-800/50 border-b border-slate-700">
          <h3 className="text-sm font-bold text-white">
            {selectedSubject 
              ? `توزيع: ${getDisplayName()}`
              : 'التوزيع الافتراضي (لجميع المواد والصفوف)'
            }
            <span className="text-xs font-normal text-slate-400 mr-2">
              (المجموع الكلي: {currentConfig.total || 0} علامة)
            </span>
            {isCustom && (
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full mr-2">
                مخصص
              </span>
            )}
          </h3>
          {selectedSubject && selectedClass && (
            <p className="text-[10px] text-slate-500 mt-1">
              📌 هذا التوزيع خاص بـ {getDisplayName()} فقط
            </p>
          )}
          {selectedSubject && !selectedClass && (
            <p className="text-[10px] text-slate-500 mt-1">
              📌 هذا التوزيع يطبق على {subjects.find(s => s.id === selectedSubject)?.name} في جميع الصفوف
              <br />
              <span className="text-amber-400">💡 يمكنك تخصيص توزيع لكل صف على حدة باختيار الصف أولاً</span>
            </p>
          )}
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {GRADE_FIELD_KEYS.map(fieldKey => {
              const value = currentConfig[fieldKey] || 0;
              
              return (
                <div key={fieldKey} className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 block">
                      {GRADE_FIELD_LABELS[fieldKey] || fieldKey}
                    </label>
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => updateFieldValue(fieldKey, e.target.value)}
                      className="w-full bg-transparent text-white text-sm focus:outline-none border-b border-slate-700 focus:border-blue-500 transition-colors"
                      min="0"
                      max="999"
                      step="1"
                    />
                  </div>
                  {isCustom && (
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                      مخصص
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">المجموع الكلي:</span>
              <span className="text-lg font-bold text-emerald-400">
                {currentConfig.total || 0} علامة
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ====== قائمة التوزيعات المخصصة ====== */}
      <div className="mt-4 p-4 bg-slate-900 rounded-xl border border-slate-800">
        <h4 className="text-xs font-bold text-slate-400 mb-3">📋 التوزيعات المخصصة</h4>
        <div className="flex flex-wrap gap-2">
          {Object.keys(gradingConfig.subjects).length === 0 ? (
            <p className="text-xs text-slate-500">لا توجد توزيعات مخصصة</p>
          ) : (
            Object.keys(gradingConfig.subjects).map(key => {
              const isSubjectOnly = !key.includes('_');
              const subjectId = isSubjectOnly ? key : key.split('_')[0];
              const classId = isSubjectOnly ? null : key.split('_')[1];
              const subject = subjects.find(s => s.id === subjectId);
              const classObj = classes.find(c => c.id === classId);
              const config = gradingConfig.subjects[key];
              
              return (
                <div key={key} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full border border-slate-700 text-xs">
                  <span className="text-white">{subject?.name || 'غير معروف'}</span>
                  {classObj && <span className="text-slate-400">({classObj.name})</span>}
                  <span className="text-emerald-400">{config.total} علامة</span>
                  <button
                    onClick={() => {
                      setSelectedSubject(subjectId);
                      setSelectedClass(classId || '');
                    }}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ====== تعليمات ====== */}
      <div className="mt-4 p-3 bg-blue-500/10 rounded-xl border border-blue-500/30">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-400">
            <p className="font-bold">📌 طريقة التخصيص:</p>
            <ul className="list-disc pr-4 space-y-1 mt-1">
              <li>اختر <span className="font-bold">الصف</span> أولاً ثم <span className="font-bold">المادة</span> لتخصيص توزيع لهما معاً</li>
              <li>مثال: <span className="font-bold">إنجليزي (الصف 10)</span> من 100 علامة</li>
              <li>مثال: <span className="font-bold">إنجليزي (الصف 11 أدبي)</span> من 150 علامة</li>
              <li>مثال: <span className="font-bold">إنجليزي (الصف 11 علمي)</span> من 100 علامة</li>
              <li>التوزيع الافتراضي يُطبق على جميع المواد والصفوف التي لم تُخصص</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}