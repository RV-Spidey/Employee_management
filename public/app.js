// Employee Management System - Vanilla JavaScript

let employees = [];
let filteredEmployees = [];
let currentPage = 1;
let rowsPerPage = 10;
let sortField = 'name';
let sortDirection = 'asc';

// DOM Elements
const employeeForm = document.getElementById('employee-form');
const editEmployeeForm = document.getElementById('edit-employee-form');
const tableBody = document.getElementById('employees-table-body');
const searchInput = document.getElementById('search-input');
const filterDepartment = document.getElementById('filter-department');
const rowsPerPageSelect = document.getElementById('rows-per-page');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const exportCsvBtn = document.getElementById('export-csv');
const exportExcelBtn = document.getElementById('export-excel');
const editModal = document.getElementById('edit-modal');
const closeModalBtn = document.getElementById('close-modal');
const totalResultsEl = document.getElementById('total-results');
const pageInfoEl = document.getElementById('page-info');
const logoutBtn = document.getElementById('logout-btn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndInit();
});

async function checkAuthAndInit() {
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
            window.location.href = '/login.html';
            return;
        }
        await loadEmployees();
        setupEventListeners();
    } catch (err) {
        window.location.href = '/login.html';
    }
}

// Event Listeners
function setupEventListeners() {
    employeeForm.addEventListener('submit', handleAddEmployee);
    editEmployeeForm.addEventListener('submit', handleEditEmployee);
    searchInput.addEventListener('input', handleSearch);
    filterDepartment.addEventListener('change', handleFilter);
    rowsPerPageSelect.addEventListener('change', handleRowsPerPageChange);
    prevPageBtn.addEventListener('click', () => changePage(currentPage - 1));
    nextPageBtn.addEventListener('click', () => changePage(currentPage + 1));
    exportCsvBtn.addEventListener('click', exportToCSV);
    exportExcelBtn.addEventListener('click', exportToExcel);
    closeModalBtn.addEventListener('click', closeModal);
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) closeModal();
    });

    // Table sorting
    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const field = header.dataset.sort;
            handleSort(field);
        });
    });

    // Logout button
    logoutBtn.addEventListener('click', handleLogout);
}

// Logout handler
function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) return;
    fetch('/api/auth/logout', { method: 'POST' })
        .then(() => {
            window.location.href = '/login.html';
        })
        .catch(() => {
            window.location.href = '/login.html';
        });
}

// API Calls
async function loadEmployees() {
    try {
        const response = await fetch('/api/employees');
        if (!response.ok) throw new Error('Failed to fetch employees');
        employees = await response.json();
        applyFilters();
    } catch (error) {
        showToast('Error', 'Failed to load employees', 'destructive');
        console.error(error);
    }
}

async function addEmployee(employeeData) {
    try {
        const response = await fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(employeeData)
        });
        
        if (!response.ok) {
            const errText = await response.text();
            try {
                const errJson = JSON.parse(errText);
                throw new Error(errJson.message || 'Failed to add employee');
            } catch (_) {
                throw new Error('Failed to add employee');
            }
        }
        
        const newEmployee = await response.json();
        employees.push(newEmployee);
        applyFilters();
        showToast('Employee Added', `${employeeData.firstName} ${employeeData.lastName} has been added successfully.`);
    } catch (error) {
        showToast('Error', error.message || 'Failed to add employee', 'destructive');
        console.error(error);
    }
}

async function updateEmployee(id, employeeData) {
    try {
        const response = await fetch(`/api/employees/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(employeeData)
        });
        
        if (!response.ok) {
            const errText = await response.text();
            try {
                const errJson = JSON.parse(errText);
                throw new Error(errJson.message || 'Failed to update employee');
            } catch (_) {
                throw new Error('Failed to update employee');
            }
        }
        
        const updatedEmployee = await response.json();
        const index = employees.findIndex(emp => emp.id === id);
        if (index !== -1) {
            employees[index] = updatedEmployee;
            applyFilters();
            showToast('Employee Updated', `${employeeData.firstName} ${employeeData.lastName} has been updated successfully.`);
        }
    } catch (error) {
        showToast('Error', error.message || 'Failed to update employee', 'destructive');
        console.error(error);
    }
}

async function deleteEmployee(id) {
    const employee = employees.find(emp => emp.id === id);
    if (!employee) return;

    if (!confirm(`Are you sure you want to delete ${employee.firstName} ${employee.lastName}?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/employees/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete employee');
        
        employees = employees.filter(emp => emp.id !== id);
        applyFilters();
        showToast('Employee Deleted', `${employee.firstName} ${employee.lastName} has been removed.`, 'destructive');
    } catch (error) {
        showToast('Error', 'Failed to delete employee', 'destructive');
        console.error(error);
    }
}

// Form Handlers
function handleAddEmployee(e) {
    e.preventDefault();
    
    const formData = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        department: document.getElementById('department').value,
        salary: parseInt(document.getElementById('salary').value)
    };

    // Client-side duplicate email check (case-insensitive)
    const emailExists = employees.some(emp => emp.email.toLowerCase() === formData.email.toLowerCase());
    if (emailExists) {
        showToast('Duplicate Email', 'An employee with this email already exists.', 'destructive');
        return;
    }

    addEmployee(formData);
    employeeForm.reset();
}

function handleEditEmployee(e) {
    e.preventDefault();
    
    const id = document.getElementById('edit-employee-id').value;
    const formData = {
        firstName: document.getElementById('edit-firstName').value,
        lastName: document.getElementById('edit-lastName').value,
        email: document.getElementById('edit-email').value,
        department: document.getElementById('edit-department').value,
        salary: parseInt(document.getElementById('edit-salary').value)
    };

    updateEmployee(id, formData);
    closeModal();
}

function openEditModal(employee) {
    document.getElementById('edit-employee-id').value = employee.id;
    document.getElementById('edit-firstName').value = employee.firstName;
    document.getElementById('edit-lastName').value = employee.lastName;
    document.getElementById('edit-email').value = employee.email;
    document.getElementById('edit-department').value = employee.department;
    document.getElementById('edit-salary').value = employee.salary;
    editModal.classList.add('active');
}

function closeModal() {
    editModal.classList.remove('active');
    editEmployeeForm.reset();
}

// Search & Filter
function handleSearch() {
    currentPage = 1;
    applyFilters();
}

function handleFilter() {
    currentPage = 1;
    applyFilters();
}

function applyFilters() {
    const searchQuery = searchInput.value.toLowerCase();
    const selectedDept = filterDepartment.value;

    filteredEmployees = employees.filter(emp => {
        const matchesSearch = !searchQuery || 
            `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery) ||
            emp.email.toLowerCase().includes(searchQuery) ||
            emp.department.toLowerCase().includes(searchQuery);

        const matchesDept = selectedDept === 'all' || emp.department === selectedDept;

        return matchesSearch && matchesDept;
    });

    sortEmployees();
    renderTable();
    updatePagination();
}

// Sorting
function handleSort(field) {
    if (sortField === field) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortField = field;
        sortDirection = 'asc';
    }

    updateSortIcons();
    sortEmployees();
    renderTable();
}

function sortEmployees() {
    filteredEmployees.sort((a, b) => {
        let aValue, bValue;

        if (sortField === 'name') {
            aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
            bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
        } else if (sortField === 'salary') {
            aValue = a.salary;
            bValue = b.salary;
        } else {
            aValue = a[sortField].toLowerCase();
            bValue = b[sortField].toLowerCase();
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
}

function updateSortIcons() {
    document.querySelectorAll('.sort-icon').forEach(icon => {
        icon.className = 'sort-icon';
    });

    const activeHeader = document.querySelector(`[data-sort="${sortField}"] .sort-icon`);
    if (activeHeader) {
        activeHeader.classList.add(sortDirection);
    }
}

// Pagination
function handleRowsPerPageChange() {
    rowsPerPage = parseInt(rowsPerPageSelect.value);
    currentPage = 1;
    renderTable();
    updatePagination();
}

function changePage(page) {
    const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderTable();
    updatePagination();
}

function updatePagination() {
    const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / rowsPerPage));
    
    totalResultsEl.textContent = `${filteredEmployees.length} results`;
    pageInfoEl.textContent = `Page ${currentPage} of ${totalPages}`;
    
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
}

// Render Table
function renderTable() {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedEmployees = filteredEmployees.slice(start, end);

    if (paginatedEmployees.length === 0) {
        tableBody.innerHTML = `
            <tr class="no-data">
                <td colspan="5">No employees found</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = paginatedEmployees.map(emp => `
        <tr data-testid="row-employee-${emp.id}">
            <td data-testid="text-name-${emp.id}">${emp.firstName} ${emp.lastName}</td>
            <td data-testid="text-email-${emp.id}">${emp.email}</td>
            <td data-testid="text-department-${emp.id}">${emp.department}</td>
            <td data-testid="text-salary-${emp.id}">₹${emp.salary.toLocaleString('en-IN')}</td>
            <td class="actions-column">
                <div class="action-buttons">
                    <button class="btn btn-secondary btn-sm" data-testid="button-edit-${emp.id}" onclick="openEditModal(${JSON.stringify(emp).replace(/"/g, '&quot;')})">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                    </button>
                    <button class="btn btn-destructive btn-sm" data-testid="button-delete-${emp.id}" onclick="deleteEmployee('${emp.id}')">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Export Functions
function exportToCSV() {
    const headers = ['Name', 'Email', 'Department', 'Salary (₹)'];
    const rows = filteredEmployees.map(emp => [
        `${emp.firstName} ${emp.lastName}`,
        emp.email,
        emp.department,
        emp.salary.toString()
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    showToast('CSV Exported', 'Employee data has been exported to CSV.');
}

async function exportToExcel() {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Employees');

        // Define columns with headers, keys, and widths
        worksheet.columns = [
            { header: 'Name', key: 'name', width: 28 },
            { header: 'Email', key: 'email', width: 32 },
            { header: 'Department', key: 'department', width: 18 },
            { header: 'Salary (₹)', key: 'salary', width: 14 }
        ];

        // Bold header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };

        // Add data rows
        filteredEmployees.forEach(emp => {
            worksheet.addRow({
                name: `${emp.firstName} ${emp.lastName}`,
                email: emp.email,
                department: emp.department,
                salary: emp.salary
            });
        });

        // Format salary as currency
        const salaryCol = worksheet.getColumn('salary');
        salaryCol.numFmt = '[$₹-4009]#,##0';

        // Generate and trigger download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'employees.xlsx';
        a.click();
        URL.revokeObjectURL(url);

        showToast('Excel Exported', 'Employee data has been exported to Excel.');
    } catch (err) {
        console.error(err);
        showToast('Error', 'Failed to export to Excel', 'destructive');
    }
}

// Toast Notifications
function showToast(title, description, variant = '') {
    const toast = document.createElement('div');
    toast.className = `toast ${variant}`;
    toast.innerHTML = `
        <div class="toast-title">${title}</div>
        <div class="toast-description">${description}</div>
    `;

    const container = document.getElementById('toast-container');
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.2s ease reverse';
        setTimeout(() => toast.remove(), 200);
    }, 3000);
}
