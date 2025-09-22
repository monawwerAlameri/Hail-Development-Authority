// متغيرات عامة
let dashboardData = null;
let statusChart = null;
let departmentChart = null;

// عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

// تهيئة لوحة المعلومات
function initializeDashboard() {
    // محاولة تحميل البيانات من localStorage
    const storedData = localStorage.getItem('excelData');
    
    if (storedData) {
        try {
            dashboardData = JSON.parse(storedData);
            loadDashboard();
        } catch (error) {
            console.error('خطأ في تحليل البيانات المحفوظة:', error);
            showNoDataState();
        }
    } else {
        showNoDataState();
    }
}

// تحميل لوحة المعلومات
function loadDashboard() {
    // إخفاء حالة التحميل
    document.getElementById('loadingState').style.display = 'none';
    
    // عرض محتوى لوحة المعلومات
    document.getElementById('dashboardContent').style.display = 'block';
    
    // تحديث البطاقات الإحصائية
    updateStatsCards();
    
    // إنشاء الرسوم البيانية
    createCharts();
    
    // تحديث قوائم الإدارات والمسؤولين
    updateInfoLists();
    
    // تحديث معاينة الجدول
    updateTablePreview();
    
    // تحديث شريط التقدم
    updateProgressBar();
}

// تحديث البطاقات الإحصائية
function updateStatsCards() {
    const summary = dashboardData.summary;
    
    // إجمالي المهام
    document.getElementById('totalTasks').textContent = summary.totalTasks;
    
    // المهام المكتملة
    document.getElementById('completedTasks').textContent = summary.completedTasks;
    document.getElementById('completedPercentage').textContent = 
        Math.round((summary.completedTasks / summary.totalTasks) * 100) + '%';
    
    // المهام المتأخرة
    document.getElementById('delayedTasks').textContent = summary.delayedTasks;
    document.getElementById('delayedPercentage').textContent = 
        Math.round((summary.delayedTasks / summary.totalTasks) * 100) + '%';
    
    // المهام قيد العمل
    document.getElementById('inProgressTasks').textContent = summary.inProgressTasks;
    document.getElementById('inProgressPercentage').textContent = 
        Math.round((summary.inProgressTasks / summary.totalTasks) * 100) + '%';
    
    // تحريك الأرقام
    animateNumbers();
}

// تحريك الأرقام
function animateNumbers() {
    const numbers = document.querySelectorAll('.stats-number');
    
    numbers.forEach(element => {
        const target = parseInt(element.textContent);
        let current = 0;
        const increment = target / 50;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current);
        }, 20);
    });
}

// إنشاء الرسوم البيانية
function createCharts() {
    createStatusChart();
    createDepartmentChart();
}

// إنشاء رسم بياني لحالات المهام
function createStatusChart() {
    const ctx = document.getElementById('statusChart').getContext('2d');
    const summary = dashboardData.summary;
    
    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['المكتملة', 'المتأخرة', 'قيد العمل'],
            datasets: [{
                data: [summary.completedTasks, summary.delayedTasks, summary.inProgressTasks],
                backgroundColor: [
                    '#4CAF50',
                    '#f44336',
                    '#ff9800'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            family: 'Cairo',
                            size: 12
                        },
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((context.parsed / total) * 100);
                            return context.label + ': ' + context.parsed + ' (' + percentage + '%)';
                        }
                    },
                    titleFont: {
                        family: 'Cairo'
                    },
                    bodyFont: {
                        family: 'Cairo'
                    }
                }
            },
            animation: {
                animateRotate: true,
                duration: 2000
            }
        }
    });
}

// إنشاء رسم بياني للإدارات
function createDepartmentChart() {
    const ctx = document.getElementById('departmentChart').getContext('2d');
    const summary = dashboardData.summary;
    
    // حساب توزيع المهام حسب الإدارات
    const departmentCounts = {};
    dashboardData.tasks.forEach(task => {
        const dept = task['الإدارة'] || 'غير محدد';
        departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });
    
    const labels = Object.keys(departmentCounts);
    const data = Object.values(departmentCounts);
    
    departmentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'عدد المهام',
                data: data,
                backgroundColor: '#006C35',
                borderColor: '#004d26',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    titleFont: {
                        family: 'Cairo'
                    },
                    bodyFont: {
                        family: 'Cairo'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            family: 'Cairo'
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: 'Cairo'
                        },
                        maxRotation: 45
                    }
                }
            },
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

// تحديث قوائم المعلومات
function updateInfoLists() {
    // قائمة الإدارات
    const departmentsList = document.getElementById('departmentsList');
    departmentsList.innerHTML = '';
    
    dashboardData.summary.departments.forEach(dept => {
        const li = document.createElement('li');
        li.textContent = dept;
        departmentsList.appendChild(li);
    });
    
    // قائمة المسؤولين
    const responsibleList = document.getElementById('responsibleList');
    responsibleList.innerHTML = '';
    
    // عرض أول 10 مسؤولين فقط
    const responsiblePersons = dashboardData.summary.responsiblePersons.slice(0, 10);
    responsiblePersons.forEach(person => {
        const li = document.createElement('li');
        li.textContent = person;
        responsibleList.appendChild(li);
    });
    
    // إضافة رسالة إذا كان هناك المزيد
    if (dashboardData.summary.responsiblePersons.length > 10) {
        const li = document.createElement('li');
        li.textContent = `... و ${dashboardData.summary.responsiblePersons.length - 10} آخرين`;
        li.style.fontStyle = 'italic';
        li.style.color = '#6c757d';
        responsibleList.appendChild(li);
    }
}

// تحديث معاينة الجدول
function updateTablePreview() {
    const tbody = document.getElementById('tasksPreviewBody');
    tbody.innerHTML = '';
    
    // عرض أول 5 مهام
    const previewTasks = dashboardData.tasks.slice(0, 5);
    
    previewTasks.forEach(task => {
        const row = document.createElement('tr');
        
        // الموضوع/المهمة
        const taskCell = document.createElement('td');
        taskCell.textContent = task['الموضوع/المهمة'] || '-';
        taskCell.style.maxWidth = '200px';
        taskCell.style.overflow = 'hidden';
        taskCell.style.textOverflow = 'ellipsis';
        taskCell.style.whiteSpace = 'nowrap';
        row.appendChild(taskCell);
        
        // الإدارة
        const deptCell = document.createElement('td');
        deptCell.textContent = task['الإدارة'] || '-';
        row.appendChild(deptCell);
        
        // المسؤول
        const responsibleCell = document.createElement('td');
        responsibleCell.textContent = task['المسؤول عن المهمه'] || '-';
        row.appendChild(responsibleCell);
        
        // الحالة
        const statusCell = document.createElement('td');
        const statusBadge = document.createElement('span');
        const status = task['الحالة'] || '';
        
        statusBadge.textContent = status || 'غير محدد';
        statusBadge.className = 'status-badge';
        
        if (status.includes('مكتمل')) {
            statusBadge.classList.add('status-completed');
        } else if (status.includes('متأخر')) {
            statusBadge.classList.add('status-delayed');
        } else {
            statusBadge.classList.add('status-in-progress');
        }
        
        statusCell.appendChild(statusBadge);
        row.appendChild(statusCell);
        
        // نسبة التقدم
        const progressCell = document.createElement('td');
        const progress = task['نسبة التقدم'] || 0;
        progressCell.textContent = progress ? (progress * 100).toFixed(0) + '%' : '-';
        row.appendChild(progressCell);
        
        tbody.appendChild(row);
    });
}

// تحديث شريط التقدم
function updateProgressBar() {
    const summary = dashboardData.summary;
    const completionRate = summary.completionRate;
    
    document.getElementById('overallProgress').textContent = completionRate + '%';
    
    // تحريك شريط التقدم
    setTimeout(() => {
        document.getElementById('progressFill').style.width = completionRate + '%';
    }, 500);
}

// عرض حالة عدم وجود بيانات
function showNoDataState() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('dashboardContent').style.display = 'none';
    document.getElementById('noDataState').style.display = 'block';
}

// العودة للصفحة الرئيسية
function goBack() {
    window.location.href = 'index.html';
}

// عرض الجدول الكامل
function showFullTable() {
    window.location.href = 'full-table.html';
}

// تنظيف الرسوم البيانية عند إغلاق الصفحة
window.addEventListener('beforeunload', function() {
    if (statusChart) {
        statusChart.destroy();
    }
    if (departmentChart) {
        departmentChart.destroy();
    }
});

// إعادة تحجيم الرسوم البيانية عند تغيير حجم النافذة
window.addEventListener('resize', function() {
    if (statusChart) {
        statusChart.resize();
    }
    if (departmentChart) {
        departmentChart.resize();
    }
});

