// متغيرات عامة
let tableData = null;
let filteredData = null;
let currentPage = 1;
let pageSize = 25;
let sortColumn = null;
let sortDirection = 'asc';

// عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    initializeTable();
    setupEventListeners();
});

// تهيئة الجدول
function initializeTable() {
    // محاولة تحميل البيانات من localStorage
    const storedData = localStorage.getItem('excelData');
    
    if (storedData) {
        try {
            tableData = JSON.parse(storedData);
            filteredData = [...tableData.tasks];
            
            // تهيئة الفلاتر
            initializeFilters();
            
            // عرض الجدول
            renderTable();
            
            // تحديث معلومات النتائج
            updateResultsInfo();
            
        } catch (error) {
            console.error('خطأ في تحليل البيانات المحفوظة:', error);
            showNoDataState();
        }
    } else {
        showNoDataState();
    }
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // البحث
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 300));
    
    // الفلاتر
    document.getElementById('departmentFilter').addEventListener('change', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('responsibleFilter').addEventListener('change', applyFilters);
    document.getElementById('startDateFrom').addEventListener('change', applyFilters);
    document.getElementById('startDateTo').addEventListener('change', applyFilters);
    
    // فلتر نسبة التقدم
    const progressFilter = document.getElementById('progressFilter');
    progressFilter.addEventListener('input', function() {
        document.getElementById('progressValue').textContent = this.value + '%';
        applyFilters();
    });
    
    // مسح الفلاتر
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    document.getElementById('resetFilters').addEventListener('click', clearFilters);
    
    // حجم الصفحة
    document.getElementById('pageSize').addEventListener('change', function() {
        pageSize = this.value === 'all' ? filteredData.length : parseInt(this.value);
        currentPage = 1;
        renderTable();
        renderPagination();
    });
    
    // أزرار التصدير
    document.getElementById('exportExcel').addEventListener('click', exportToExcel);
    document.getElementById('exportPDF').addEventListener('click', exportToPDF);
    document.getElementById('printTable').addEventListener('click', printTable);
    
    // الترتيب
    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', function() {
            const column = this.dataset.column;
            handleSort(column);
        });
    });
}

// تهيئة الفلاتر
function initializeFilters() {
    // فلتر الإدارات
    const departmentFilter = document.getElementById('departmentFilter');
    const departments = [...new Set(tableData.tasks.map(task => task['الإدارة']).filter(dept => dept))];
    
    departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        departmentFilter.appendChild(option);
    });
    
    // فلتر المسؤولين
    const responsibleFilter = document.getElementById('responsibleFilter');
    const responsiblePersons = [...new Set(tableData.tasks.map(task => task['المسؤول عن المهمه']).filter(person => person))];
    
    responsiblePersons.forEach(person => {
        const option = document.createElement('option');
        option.value = person;
        option.textContent = person;
        responsibleFilter.appendChild(option);
    });
}

// تطبيق الفلاتر
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const departmentFilter = document.getElementById('departmentFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const responsibleFilter = document.getElementById('responsibleFilter').value;
    const startDateFrom = document.getElementById('startDateFrom').value;
    const startDateTo = document.getElementById('startDateTo').value;
    const progressFilter = parseInt(document.getElementById('progressFilter').value) / 100;
    
    filteredData = tableData.tasks.filter(task => {
        // فلتر البحث
        if (searchTerm && !task['الموضوع/المهمة'].toLowerCase().includes(searchTerm)) {
            return false;
        }
        
        // فلتر الإدارة
        if (departmentFilter && task['الإدارة'] !== departmentFilter) {
            return false;
        }
        
        // فلتر الحالة
        if (statusFilter && !task['الحالة'].includes(statusFilter)) {
            return false;
        }
        
        // فلتر المسؤول
        if (responsibleFilter && task['المسؤول عن المهمه'] !== responsibleFilter) {
            return false;
        }
        
        // فلتر تاريخ البدء
        if (startDateFrom && task['تاريخ  بدء المهمه'] < startDateFrom) {
            return false;
        }
        
        if (startDateTo && task['تاريخ  بدء المهمه'] > startDateTo) {
            return false;
        }
        
        // فلتر نسبة التقدم
        const taskProgress = parseFloat(task['نسبة التقدم']) || 0;
        if (taskProgress < progressFilter) {
            return false;
        }
        
        return true;
    });
    
    // إعادة تعيين الصفحة الحالية
    currentPage = 1;
    
    // عرض النتائج
    if (filteredData.length === 0) {
        showNoResults();
    } else {
        hideNoResults();
        renderTable();
        renderPagination();
    }
    
    // تحديث معلومات النتائج
    updateResultsInfo();
}

// مسح الفلاتر
function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('departmentFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('responsibleFilter').value = '';
    document.getElementById('startDateFrom').value = '';
    document.getElementById('startDateTo').value = '';
    document.getElementById('progressFilter').value = '0';
    document.getElementById('progressValue').textContent = '0%';
    
    // إعادة تطبيق الفلاتر
    applyFilters();
}

// معالجة الترتيب
function handleSort(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    
    // تحديث أيقونات الترتيب
    document.querySelectorAll('.sortable').forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
    });
    
    const currentHeader = document.querySelector(`[data-column="${column}"]`);
    currentHeader.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
    
    // ترتيب البيانات
    filteredData.sort((a, b) => {
        let valueA = a[column] || '';
        let valueB = b[column] || '';
        
        // معالجة التواريخ
        if (column.includes('تاريخ')) {
            valueA = new Date(valueA);
            valueB = new Date(valueB);
        }
        
        // معالجة الأرقام
        if (column === 'نسبة التقدم') {
            valueA = parseFloat(valueA) || 0;
            valueB = parseFloat(valueB) || 0;
        }
        
        if (valueA < valueB) {
            return sortDirection === 'asc' ? -1 : 1;
        }
        if (valueA > valueB) {
            return sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
    });
    
    // إعادة عرض الجدول
    renderTable();
}

// عرض الجدول
function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    // حساب البيانات للصفحة الحالية
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = pageSize === filteredData.length ? filteredData.length : startIndex + pageSize;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    pageData.forEach((task, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" 
                     title="${task['الموضوع/المهمة'] || '-'}">
                    ${highlightSearchTerm(task['الموضوع/المهمة'] || '-')}
                </div>
            </td>
            <td>${task['الإدارة'] || '-'}</td>
            <td>${task['المسؤول عن المهمه'] || '-'}</td>
            <td>${formatDate(task['تاريخ  بدء المهمه'])}</td>
            <td>${formatDate(task['التاريخ المتوقع لانهاء المهمة'])}</td>
            <td>${createStatusBadge(task['الحالة'])}</td>
            <td class="progress-bar-cell">${createProgressBar(task['نسبة التقدم'])}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="viewTaskDetails(${startIndex + index})" title="عرض التفاصيل">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // عرض ترقيم الصفحات
    renderPagination();
}

// إنشاء شارة الحالة
function createStatusBadge(status) {
    if (!status) return '<span class="status-badge">غير محدد</span>';
    
    let badgeClass = 'status-badge';
    if (status.includes('مكتمل')) {
        badgeClass += ' status-completed';
    } else if (status.includes('متأخر')) {
        badgeClass += ' status-delayed';
    } else {
        badgeClass += ' status-in-progress';
    }
    
    return `<span class="${badgeClass}">${status}</span>`;
}

// إنشاء شريط التقدم
function createProgressBar(progress) {
    const percentage = Math.round((parseFloat(progress) || 0) * 100);
    
    return `
        <div class="progress-bar-small">
            <div class="progress-fill-small" style="width: ${percentage}%"></div>
        </div>
        <div class="progress-text">${percentage}%</div>
    `;
}

// تمييز مصطلح البحث
function highlightSearchTerm(text) {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// تنسيق التاريخ
function formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA');
    } catch (error) {
        return dateString;
    }
}

// عرض ترقيم الصفحات
function renderPagination() {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    if (pageSize >= filteredData.length) return;
    
    const totalPages = Math.ceil(filteredData.length / pageSize);
    
    // زر السابق
    const prevButton = document.createElement('li');
    prevButton.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevButton.innerHTML = `<a class="page-link" href="#" onclick="changePage(${currentPage - 1})">السابق</a>`;
    pagination.appendChild(prevButton);
    
    // أرقام الصفحات
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('li');
        pageButton.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageButton.innerHTML = `<a class="page-link" href="#" onclick="changePage(${i})">${i}</a>`;
        pagination.appendChild(pageButton);
    }
    
    // زر التالي
    const nextButton = document.createElement('li');
    nextButton.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextButton.innerHTML = `<a class="page-link" href="#" onclick="changePage(${currentPage + 1})">التالي</a>`;
    pagination.appendChild(nextButton);
}

// تغيير الصفحة
function changePage(page) {
    const totalPages = Math.ceil(filteredData.length / pageSize);
    
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderTable();
}

// عرض تفاصيل المهمة
function viewTaskDetails(index) {
    const task = filteredData[index];
    const modalBody = document.getElementById('taskModalBody');
    
    modalBody.innerHTML = `
        <div class="task-detail-item">
            <span class="task-detail-label">الموضوع/المهمة:</span>
            <div class="task-detail-value">${task['الموضوع/المهمة'] || '-'}</div>
        </div>
        <div class="task-detail-item">
            <span class="task-detail-label">الإدارة:</span>
            <div class="task-detail-value">${task['الإدارة'] || '-'}</div>
        </div>
        <div class="task-detail-item">
            <span class="task-detail-label">المسؤول عن المهمة:</span>
            <div class="task-detail-value">${task['المسؤول عن المهمه'] || '-'}</div>
        </div>
        <div class="task-detail-item">
            <span class="task-detail-label">تاريخ بدء المهمة:</span>
            <div class="task-detail-value">${formatDate(task['تاريخ  بدء المهمه'])}</div>
        </div>
        <div class="task-detail-item">
            <span class="task-detail-label">التاريخ المتوقع لانتهاء المهمة:</span>
            <div class="task-detail-value">${formatDate(task['التاريخ المتوقع لانهاء المهمة'])}</div>
        </div>
        <div class="task-detail-item">
            <span class="task-detail-label">التاريخ الفعلي لانتهاء المهمة:</span>
            <div class="task-detail-value">${formatDate(task['التاريخ الفعلي لانتهاء المهمة'])}</div>
        </div>
        <div class="task-detail-item">
            <span class="task-detail-label">الحالة:</span>
            <div class="task-detail-value">${createStatusBadge(task['الحالة'])}</div>
        </div>
        <div class="task-detail-item">
            <span class="task-detail-label">نسبة التقدم:</span>
            <div class="task-detail-value">${createProgressBar(task['نسبة التقدم'])}</div>
        </div>
        <div class="task-detail-item">
            <span class="task-detail-label">النسبة المستهدفة:</span>
            <div class="task-detail-value">${Math.round((parseFloat(task['النسبة المستهدفة']) || 0) * 100)}%</div>
        </div>
        <div class="task-detail-item">
            <span class="task-detail-label">ملاحظات:</span>
            <div class="task-detail-value">${task['ملاحظات (ان وجدت)'] || 'لا توجد ملاحظات'}</div>
        </div>
    `;
    
    // عرض النافذة المنبثقة
    const modal = new bootstrap.Modal(document.getElementById('taskModal'));
    modal.show();
}

// تحديث معلومات النتائج
function updateResultsInfo() {
    document.getElementById('currentResults').textContent = filteredData.length;
    document.getElementById('totalResults').textContent = tableData ? tableData.tasks.length : 0;
}

// عرض حالة عدم وجود نتائج
function showNoResults() {
    document.getElementById('noDataState').style.display = 'block';
    document.querySelector('.table-card').style.display = 'none';
}

// إخفاء حالة عدم وجود نتائج
function hideNoResults() {
    document.getElementById('noDataState').style.display = 'none';
    document.querySelector('.table-card').style.display = 'block';
}

// عرض حالة عدم وجود بيانات
function showNoDataState() {
    document.getElementById('loadingState').style.display = 'none';
    document.querySelector('.filters-card').style.display = 'none';
    document.querySelector('.table-card').style.display = 'none';
    document.getElementById('noDataState').style.display = 'block';
    
    // تغيير النص
    document.querySelector('.no-data-content h3').textContent = 'لا توجد بيانات';
    document.querySelector('.no-data-content p').textContent = 'يرجى العودة إلى الصفحة الرئيسية وتحميل ملف البيانات أولاً';
}

// تصدير إلى Excel
function exportToExcel() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filteredData);
    
    XLSX.utils.book_append_sheet(wb, ws, 'المهام');
    XLSX.writeFile(wb, 'مهام_الهيئة.xlsx');
}

// تصدير إلى PDF
function exportToPDF() {
    window.print();
}

// طباعة الجدول
function printTable() {
    window.print();
}

// العودة للصفحة الرئيسية
function goBack() {
    window.location.href = 'index.html';
}

// الانتقال إلى لوحة المعلومات
function goToDashboard() {
    window.location.href = 'dashboard.html';
}

// دالة التأخير للبحث
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

