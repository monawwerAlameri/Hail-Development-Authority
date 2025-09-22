// متغيرات عامة
let excelData = null;
let processedData = null;

// عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
});

// إعداد مستمعي الأحداث
function initializeEventListeners() {
    const fileInput = document.getElementById('excelFile');
    const dashboardBtn = document.getElementById('dashboardBtn');
    const yearBtn = document.getElementById('yearBtn');
    
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', goToDashboard);
    }
    
    if (yearBtn) {
        yearBtn.addEventListener('click', showYearInfo);
    }
}

// معالجة اختيار الملف
function handleFileSelect(event) {
    const file = event.target.files[0];
    
    if (!file) {
        hideFileInfo();
        return;
    }
    
    // التحقق من نوع الملف
    if (!isValidExcelFile(file)) {
        showError('يرجى اختيار ملف Excel صحيح (.xlsx أو .xls)');
        return;
    }
    
    // عرض معلومات الملف
    showFileInfo(file);
    
    // قراءة الملف
    readExcelFile(file);
}

// التحقق من صحة ملف Excel
function isValidExcelFile(file) {
    const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel' // .xls
    ];
    
    return validTypes.includes(file.type) || 
           file.name.toLowerCase().endsWith('.xlsx') || 
           file.name.toLowerCase().endsWith('.xls');
}

// عرض معلومات الملف
function showFileInfo(file) {
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const actionButtons = document.getElementById('actionButtons');
    const uploadIcon = document.getElementById('uploadIcon');
    
    if (fileInfo && fileName && fileSize) {
        // إعداد معلومات الملف
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        
        fileInfo.style.display = 'block';
        
        // إظهار الأزرار بعد تأخير قصير مع تأثير انيميشن
        setTimeout(() => {
            if (actionButtons) {
                actionButtons.style.display = 'block';
                actionButtons.style.animation = 'slideUp 0.5s ease';
            }
        }, 500);
    }
}

// إخفاء معلومات الملف
function hideFileInfo() {
    const fileInfo = document.getElementById('fileInfo');
    const actionButtons = document.getElementById('actionButtons');
    const uploadIcon = document.getElementById('uploadIcon');
    
    if (fileInfo) {
        fileInfo.style.display = 'none';
    }
    
    if (actionButtons) {
        actionButtons.style.display = 'none';
    }
    
    // إعادة أيقونة الإكسل
    if (uploadIcon) {
        uploadIcon.innerHTML = '<i class="fas fa-file-excel"></i>';
        uploadIcon.classList.remove('logo-replacement');
    }
}

// تنسيق حجم الملف
function formatFileSize(bytes) {
    if (bytes === 0) return '0 بايت';
    
    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// قراءة ملف Excel
function readExcelFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // قراءة الورقة الأولى
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // تحويل إلى JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // معالجة البيانات
            processExcelData(jsonData);
            
            showSuccess('تم تحميل الملف بنجاح!');
            
        } catch (error) {
            console.error('خطأ في قراءة الملف:', error);
            showError('حدث خطأ في قراءة الملف. يرجى التأكد من صحة الملف.');
        }
    };
    
    reader.onerror = function() {
        showError('حدث خطأ في قراءة الملف.');
    };
    
    reader.readAsArrayBuffer(file);
}

// معالجة بيانات Excel
function processExcelData(rawData) {
    try {
        // البحث عن صف الرأس
        let headerRowIndex = -1;
        for (let i = 0; i < rawData.length; i++) {
            if (rawData[i] && rawData[i][0] === 'الموضوع/المهمة') {
                headerRowIndex = i;
                break;
            }
        }
        
        if (headerRowIndex === -1) {
            throw new Error('لم يتم العثور على رأس الجدول');
        }
        
        // استخراج الرأس والبيانات
        const headers = rawData[headerRowIndex];
        const dataRows = rawData.slice(headerRowIndex + 1);
        
        // تنظيف البيانات
        const cleanedData = dataRows
            .filter(row => row && row[0] && row[1]) // إزالة الصفوف الفارغة
            .map(row => {
                const task = {};
                headers.forEach((header, index) => {
                    if (header) {
                        task[header] = row[index] || '';
                    }
                });
                return task;
            });
        
        // حفظ البيانات
        excelData = rawData;
        processedData = {
            headers: headers,
            tasks: cleanedData,
            summary: calculateSummary(cleanedData)
        };
        
        console.log('تم معالجة البيانات:', processedData);
        
    } catch (error) {
        console.error('خطأ في معالجة البيانات:', error);
        showError('حدث خطأ في معالجة البيانات: ' + error.message);
    }
}

// حساب الإحصائيات الملخصة
function calculateSummary(tasks) {
    const summary = {
        totalTasks: tasks.length,
        completedTasks: 0,
        delayedTasks: 0,
        inProgressTasks: 0,
        departments: new Set(),
        responsiblePersons: new Set()
    };
    
    tasks.forEach(task => {
        // حساب حالات المهام
        const status = task['الحالة'] || '';
        if (status.includes('مكتمل')) {
            summary.completedTasks++;
        } else if (status.includes('متأخر')) {
            summary.delayedTasks++;
        } else if (status.includes('جاري')) {
            summary.inProgressTasks++;
        }
        
        // جمع الإدارات والمسؤولين
        if (task['الإدارة']) {
            summary.departments.add(task['الإدارة']);
        }
        if (task['المسؤول عن المهمه']) {
            summary.responsiblePersons.add(task['المسؤول عن المهمه']);
        }
    });
    
    // تحويل Sets إلى arrays
    summary.departments = Array.from(summary.departments);
    summary.responsiblePersons = Array.from(summary.responsiblePersons);
    
    // حساب نسبة الإنجاز
    summary.completionRate = summary.totalTasks > 0 
        ? Math.round((summary.completedTasks / summary.totalTasks) * 100) 
        : 0;
    
    return summary;
}

// الانتقال إلى لوحة المعلومات
function goToDashboard() {
    if (!processedData) {
        showError('يرجى تحميل ملف البيانات أولاً');
        return;
    }
    
    // حفظ البيانات في localStorage
    localStorage.setItem('excelData', JSON.stringify(processedData));
    
    // الانتقال إلى لوحة المعلومات
    window.location.href = 'dashboard.html';
}

// عرض معلومات السنة
function showYearInfo() {
    const currentYear = new Date().getFullYear();
    showInfo(`السنة الحالية: ${currentYear}\nهذا النظام مصمم لتحليل بيانات المهام للسنة الميلادية الحالية.`);
}

// عرض رسالة نجاح
function showSuccess(message) {
    showNotification(message, 'success');
}

// عرض رسالة خطأ
function showError(message) {
    showNotification(message, 'error');
}

// عرض رسالة معلومات
function showInfo(message) {
    showNotification(message, 'info');
}

// عرض الإشعارات
function showNotification(message, type = 'info') {
    // إنشاء عنصر الإشعار
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // إضافة الأنماط إذا لم تكن موجودة
    if (!document.getElementById('notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                max-width: 400px;
                border-radius: 10px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                animation: slideIn 0.3s ease;
            }
            
            .notification-success {
                background: #d4edda;
                border: 1px solid #c3e6cb;
                color: #155724;
            }
            
            .notification-error {
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
            }
            
            .notification-info {
                background: #d1ecf1;
                border: 1px solid #bee5eb;
                color: #0c5460;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                padding: 15px;
                gap: 10px;
            }
            
            .notification-close {
                background: none;
                border: none;
                margin-right: auto;
                cursor: pointer;
                opacity: 0.7;
            }
            
            .notification-close:hover {
                opacity: 1;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // إضافة الإشعار إلى الصفحة
    document.body.appendChild(notification);
    
    // إزالة الإشعار تلقائياً بعد 5 ثوان
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// الحصول على أيقونة الإشعار
function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// تصدير البيانات (للاستخدام في ملفات أخرى)
window.ExcelAnalyzer = {
    getData: () => processedData,
    setData: (data) => { processedData = data; }
};
