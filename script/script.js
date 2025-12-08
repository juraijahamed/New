// Data storage
            let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
            let sales = JSON.parse(localStorage.getItem('sales')) || [];
            let supplierPayments = JSON.parse(localStorage.getItem('supplierPayments')) || [];
            let staffMembers = JSON.parse(localStorage.getItem('staffMembers')) || [];
            let salaryPayments = JSON.parse(localStorage.getItem('salaryPayments')) || [];
            let remarks = JSON.parse(localStorage.getItem('remarks')) || {};
            
            // Chart instances
            let trendsChart = null;
            
            // Clock variables
            let baseIST = null;
            let baseLocal = null;
            let clockAnimationStarted = false;
            
            // Initialize the application
            document.addEventListener('DOMContentLoaded', function() {
                // Set current date in footer
                document.getElementById('currentDate').textContent = new Date().toLocaleDateString();
                
                // Initialize clock ticks
                buildClockTicks();
                
                // Start the clocks with API synchronization
                fetchIST();
                
                initializeDashboard();
                
                // Restore last active page
                restoreActivePage();
            });

            function restoreActivePage() {
                const activePage = localStorage.getItem('activePage') || 'dashboard';
                const navLinks = document.querySelectorAll('.nav-link');
                const pageSections = document.querySelectorAll('.page-section');
                
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('data-target') === activePage) {
                        link.classList.add('active');
                    }
                });
                
                pageSections.forEach(section => {
                    section.classList.remove('active');
                    if (section.id === activePage) {
                        section.classList.add('active');
                    }
                });
                
                // Special handling for reports page
                if (activePage === 'reports') {
                    generateTransactionReports('all');
                }
            }

            // Clock Functions
            function buildClockTicks() {
                // India clock ticks
                const indiaTicks = document.getElementById('indiaTicks');
                for (let i = 0; i < 60; i++) {
                    const isHour = i % 5 === 0;
                    const len = isHour ? 9 : 5;
                    const stroke = isHour ? 3 : 2;
                    const angle = i * 6;
                    const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    tick.setAttribute('x1', '0');
                    tick.setAttribute('y1', String(-86 - len));
                    tick.setAttribute('x2', '0');
                    tick.setAttribute('y2', String(-86));
                    tick.setAttribute('stroke', '#8B7355');
                    tick.setAttribute('stroke-width', String(stroke));
                    tick.setAttribute('stroke-linecap', 'round');
                    tick.setAttribute('transform', `rotate(${angle})`);
                    indiaTicks.appendChild(tick);
                }
                
                // UAE clock ticks
                const uaeTicks = document.getElementById('uaeTicks');
                for (let i = 0; i < 60; i++) {
                    const isHour = i % 5 === 0;
                    const len = isHour ? 9 : 5;
                    const stroke = isHour ? 3 : 2;
                    const angle = i * 6;
                    const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    tick.setAttribute('x1', '0');
                    tick.setAttribute('y1', String(-86 - len));
                    tick.setAttribute('x2', '0');
                    tick.setAttribute('y2', String(-86));
                    tick.setAttribute('stroke', '#8B7355');
                    tick.setAttribute('stroke-width', String(stroke));
                    tick.setAttribute('stroke-linecap', 'round');
                    tick.setAttribute('transform', `rotate(${angle})`);
                    uaeTicks.appendChild(tick);
                }
            }

            async function fetchIST() {
                try {
                    const res = await fetch("https://worldtimeapi.org/api/timezone/Asia/Kolkata");
                    if (!res.ok) throw new Error("Network response not ok");
                    const data = await res.json();
                    baseIST = new Date(data.datetime);
                    baseLocal = new Date();
                    
                    // Hide loading dots
                    document.getElementById('indiaLoading').style.display = "none";
                    document.getElementById('uaeLoading').style.display = "none";
                    
                    if (!clockAnimationStarted) {
                        clockAnimationStarted = true;
                        requestAnimationFrame(updateClocks);
                    }
                } catch (err) {
                    // Fallback to device time
                    baseIST = new Date();
                    baseLocal = new Date();
                    
                    // Hide loading dots
                    document.getElementById('indiaLoading').style.display = "none";
                    document.getElementById('uaeLoading').style.display = "none";
                    
                    if (!clockAnimationStarted) {
                        clockAnimationStarted = true;
                        requestAnimationFrame(updateClocks);
                    }
                    
                    // Retry silently after 5 seconds
                    setTimeout(fetchIST, 5000);
                }
            }

            function getISTParts() {
                if (!baseIST) return { h:0, m:0, s:0, ms:0 };
                const nowLocal = new Date();
                const elapsed = nowLocal - baseLocal;
                const nowIST = new Date(baseIST.getTime() + elapsed);
                return {
                    h: nowIST.getHours(),
                    m: nowIST.getMinutes(),
                    s: nowIST.getSeconds(),
                    ms: nowIST.getMilliseconds()
                };
            }

            function updateClocks() {
                const { h, m, s, ms } = getISTParts();
                
                // India Time (IST = GMT+5:30)
                const indiaTime = new Date();
                indiaTime.setHours(h, m, s, ms);
                
                // UAE Time (GST = GMT+4)
                const uaeTime = new Date(indiaTime);
                uaeTime.setHours(uaeTime.getHours() - 1.5);
                
                // Update digital displays
                const pad = n => String(n).padStart(2, '0');
                document.getElementById('indiaTimeDisplay').textContent = `${pad(indiaTime.getHours())}:${pad(indiaTime.getMinutes())}:${pad(indiaTime.getSeconds())}`;
                document.getElementById('indiaDateDisplay').textContent = formatClockDate(indiaTime);
                
                document.getElementById('uaeTimeDisplay').textContent = `${pad(uaeTime.getHours())}:${pad(uaeTime.getMinutes())}:${pad(uaeTime.getSeconds())}`;
                document.getElementById('uaeDateDisplay').textContent = formatClockDate(uaeTime);
                
                // Update analog clocks
                updateAnalogClock('india', indiaTime);
                updateAnalogClock('uae', uaeTime);
                
                requestAnimationFrame(updateClocks);
            }

            function updateAnalogClock(prefix, time) {
                const hours = time.getHours();
                const minutes = time.getMinutes();
                const seconds = time.getSeconds();
                const milliseconds = time.getMilliseconds();
                
                const secAngle = (seconds + milliseconds / 1000) * 6;
                const minAngle = (minutes + (seconds + milliseconds / 1000) / 60) * 6;
                const hourAngle = ((hours % 12) + minutes / 60 + seconds / 3600) * 30;
                
                document.getElementById(`${prefix}HourHand`).setAttribute('transform', `translate(100,100) rotate(${hourAngle})`);
                document.getElementById(`${prefix}MinuteHand`).setAttribute('transform', `translate(100,100) rotate(${minAngle})`);
                document.getElementById(`${prefix}SecondHand`).setAttribute('transform', `translate(100,100) rotate(${secAngle})`);
            }

            function formatClockDate(date) {
                return date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }

            function initializeDashboard() {
                // Initialize charts
                initializeTrendsChart();
                
                // Setup event listeners
                setupNavigation();
                setupModals();
                setupChartControls();
                setupExportButtons();
                setupStaffManagement();
                setupRemarksSystem();
                setupClearData();
                setupExpenseTabs();
                setupReportFilters();
                
                // Initial render
                renderExpensesTable();
                renderSalesTable();
                renderSupplierPaymentsTable();
                renderStaffList();
                renderSalaryTable();
                updateDashboardStats();
                updateAllProgressBars();
                generateAutoNotes();
            }

            // Navigation
            function setupNavigation() {
                const navLinks = document.querySelectorAll('.nav-link');
                const pageSections = document.querySelectorAll('.page-section');
                const mainContent = document.querySelector('.main-content');
                
                navLinks.forEach(link => {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        
                        const targetId = this.getAttribute('data-target');
                        
                        // Save active page
                        localStorage.setItem('activePage', targetId);
                        
                        navLinks.forEach(l => l.classList.remove('active'));
                        pageSections.forEach(s => s.classList.remove('active'));
                        
                        this.classList.add('active');
                        document.getElementById(targetId).classList.add('active');
                        
                        // Scroll to top when changing pages
                        mainContent.scrollTop = 0;
                        
                        // Special handling for reports page
                        if (targetId === 'reports') {
                            generateTransactionReports('all');
                            generateAutoNotes();
                        }
                        
                        if (targetId === 'dashboard') {
                            updateAllCharts();
                        }
                        
                        if (targetId === 'expenses') {
                            updateSalaryStats();
                        }
                    });
                });

                document.getElementById('userProfileBtn').addEventListener('click', function() {
                    const targetId = 'settings';
                    localStorage.setItem('activePage', targetId);
                    
                    navLinks.forEach(l => l.classList.remove('active'));
                    pageSections.forEach(s => s.classList.remove('active'));
                    
                    document.getElementById('settings').classList.add('active');
                    document.querySelector('.nav-link[data-target="settings"]').classList.add('active');
                    
                    // Scroll to top
                    mainContent.scrollTop = 0;
                    renderStaffList();
                });
            }

            // Setup expense tabs
            function setupExpenseTabs() {
                const expenseTabs = document.querySelectorAll('.expense-tab');
                const expenseTabContents = document.querySelectorAll('.expense-tab-content');
                
                expenseTabs.forEach(tab => {
                    tab.addEventListener('click', function() {
                        const tabId = this.getAttribute('data-tab');
                        
                        // Update active tab
                        expenseTabs.forEach(t => t.classList.remove('active'));
                        this.classList.add('active');
                        
                        // Show corresponding content
                        expenseTabContents.forEach(content => {
                            content.classList.remove('active');
                            if (content.id === `${tabId}ExpensesTab`) {
                                content.classList.add('active');
                            }
                        });
                    });
                });
            }

            // Setup report filters
            function setupReportFilters() {
                const reportButtons = document.querySelectorAll('.report-type-btn');
                
                reportButtons.forEach(btn => {
                    btn.addEventListener('click', function() {
                        reportButtons.forEach(b => b.classList.remove('active'));
                        this.classList.add('active');
                        
                        const reportType = this.getAttribute('data-report');
                        generateTransactionReports(reportType);
                    });
                });
            }

            // Setup modals
            function setupModals() {
                // Expense Modal with Tabs
                const expenseModal = document.getElementById('expenseModal');
                const addExpenseBtn = document.getElementById('addExpenseBtn');
                const closeExpenseBtn = expenseModal.querySelector('.close-btn');
                const cancelExpenseBtn = document.getElementById('cancelExpenseBtn');
                const saveExpenseBtn = document.getElementById('saveExpenseBtn');
                const expenseForm = document.getElementById('expenseForm');
                const salaryForm = document.getElementById('salaryForm');
                const expenseTabs = document.querySelectorAll('.form-tab');
                const tabContents = document.querySelectorAll('.tab-content');
                
                // Tab switching
                expenseTabs.forEach(tab => {
                    tab.addEventListener('click', function() {
                        const tabId = this.getAttribute('data-tab');
                        
                        // Update active tab
                        expenseTabs.forEach(t => t.classList.remove('active'));
                        this.classList.add('active');
                        
                        // Show corresponding content
                        tabContents.forEach(content => {
                            content.classList.remove('active');
                            if (content.id === `${tabId}ExpenseTab` || content.id === `${tabId}PaymentTab`) {
                                content.classList.add('active');
                            }
                        });
                        
                        // Update save button text
                        if (tabId === 'salary') {
                            document.getElementById('saveExpenseBtn').textContent = 'Save Salary Payment';
                            updateSalaryCalculation();
                        } else {
                            document.getElementById('saveExpenseBtn').textContent = 'Save Expense';
                        }
                    });
                });

                // File upload for expense modal
                const expenseFileUploadContainer = document.getElementById('expenseFileUploadContainer');
                const expenseFileInput = document.getElementById('expenseReceipt');
                const expenseFileNameDisplay = document.getElementById('expenseFileName');
                const expenseCategorySelect = document.getElementById('expenseCategory');
                const expenseCategoryOtherInput = document.getElementById('expenseCategoryOther');

                expenseFileUploadContainer.addEventListener('click', () => expenseFileInput.click());
                expenseFileInput.addEventListener('change', function() {
                    if (this.files.length > 0) {
                        expenseFileNameDisplay.textContent = `Selected file: ${this.files[0].name}`;
                    } else {
                        expenseFileNameDisplay.textContent = '';
                    }
                });

                expenseCategorySelect.addEventListener('change', function() {
                    if (this.value === 'Other') {
                        expenseCategoryOtherInput.style.display = 'block';
                        expenseCategoryOtherInput.required = true;
                    } else {
                        expenseCategoryOtherInput.style.display = 'none';
                        expenseCategoryOtherInput.required = false;
                    }
                });

                // Salary calculation
                const salaryStaffSelect = document.getElementById('salaryStaffName');
                const advanceAmountInput = document.getElementById('advanceAmount');
                const staffSalaryAmountInput = document.getElementById('staffSalaryAmount');
                const salaryAmountInput = document.getElementById('salaryAmount');
                const totalSalaryAmountInput = document.getElementById('totalSalaryAmount');

                salaryStaffSelect.addEventListener('change', updateSalaryCalculation);
                advanceAmountInput.addEventListener('input', updateSalaryCalculation);

                function updateSalaryCalculation() {
                    const staffId = salaryStaffSelect.value;
                    const staff = staffMembers.find(s => s.id == staffId);
                    
                    if (staff) {
                        const staffSalary = staff.salary || 0;
                        staffSalaryAmountInput.value = staffSalary.toFixed(2);
                        
                        const advanceAmount = parseFloat(advanceAmountInput.value) || 0;
                        const pendingSalary = Math.max(staffSalary - advanceAmount, 0);
                        
                        salaryAmountInput.value = pendingSalary.toFixed(2);
                        totalSalaryAmountInput.value = (advanceAmount + pendingSalary).toFixed(2);
                    } else {
                        staffSalaryAmountInput.value = '';
                        salaryAmountInput.value = '';
                        totalSalaryAmountInput.value = '';
                    }
                }

                addExpenseBtn.addEventListener('click', function() {
                    document.getElementById('expenseModalTitle').textContent = 'Add New Expense';
                    expenseModal.style.display = 'flex';
                    expenseForm.reset();
                    salaryForm.reset();
                    expenseFileNameDisplay.textContent = '';
                    document.getElementById('expenseId').value = '';
                    document.getElementById('expenseDate').valueAsDate = new Date();
                    document.getElementById('salaryDate').valueAsDate = new Date();
                    
                    // Set current month for salary
                    const now = new Date();
                    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
                    document.getElementById('salaryForMonth').value = currentMonth;
                    
                    expenseCategoryOtherInput.style.display = 'none';
                    
                    // Reset to general expense tab
                    expenseTabs.forEach(t => t.classList.remove('active'));
                    tabContents.forEach(c => c.classList.remove('active'));
                    document.querySelector('.form-tab[data-tab="general"]').classList.add('active');
                    document.getElementById('generalExpenseTab').classList.add('active');
                    document.getElementById('saveExpenseBtn').textContent = 'Save Expense';
                    
                    // Populate staff dropdown
                    updateStaffDropdown();
                });

                function closeExpenseModal() {
                    expenseModal.style.display = 'none';
                }

                closeExpenseBtn.addEventListener('click', closeExpenseModal);
                cancelExpenseBtn.addEventListener('click', closeExpenseModal);

                saveExpenseBtn.addEventListener('click', function() {
                    const activeTab = document.querySelector('.form-tab.active');
                    if (activeTab && activeTab.getAttribute('data-tab') === 'salary') {
                        saveSalary();
                    } else {
                        saveExpense();
                    }
                });

                // Salary file upload
                const salaryFileUploadContainer = document.getElementById('salaryFileUploadContainer');
                const salaryFileInput = document.getElementById('salaryReceipt');
                const salaryFileNameDisplay = document.getElementById('salaryFileName');

                salaryFileUploadContainer.addEventListener('click', () => salaryFileInput.click());
                salaryFileInput.addEventListener('change', function() {
                    if (this.files.length > 0) {
                        salaryFileNameDisplay.textContent = `Selected file: ${this.files[0].name}`;
                    } else {
                        salaryFileNameDisplay.textContent = '';
                    }
                });

                // Sale Modal
                const saleModal = document.getElementById('saleModal');
                const addSaleBtn = document.getElementById('addSaleBtn');
                const closeSaleBtn = saleModal.querySelector('.close-btn');
                const cancelSaleBtn = document.getElementById('cancelSaleBtn');
                const saveSaleBtn = document.getElementById('saveSaleBtn');
                const saleForm = document.getElementById('saleForm');
                const saleFileUploadContainer = document.getElementById('saleFileUploadContainer');
                const saleFileInput = document.getElementById('saleDocuments');
                const saleFileNameDisplay = document.getElementById('saleFileName');
                const saleNationalSelect = document.getElementById('saleNational');
                const saleNationalOtherInput = document.getElementById('saleNationalOther');
                const saleServiceTypeSelect = document.getElementById('saleServiceType');
                const saleServiceTypeOtherInput = document.getElementById('saleServiceTypeOther');

                saleFileUploadContainer.addEventListener('click', () => saleFileInput.click());
                saleFileInput.addEventListener('change', function() {
                    if (this.files.length > 0) {
                        let fileNames = [];
                        for (let i = 0; i < this.files.length; i++) {
                            fileNames.push(this.files[i].name);
                        }
                        saleFileNameDisplay.textContent = `Selected files: ${fileNames.join(', ')}`;
                    } else {
                        saleFileNameDisplay.textContent = '';
                    }
                });

                saleNationalSelect.addEventListener('change', function() {
                    if (this.value === 'Other') {
                        saleNationalOtherInput.style.display = 'block';
                        saleNationalOtherInput.required = true;
                    } else {
                        saleNationalOtherInput.style.display = 'none';
                        saleNationalOtherInput.required = false;
                    }
                });

                saleServiceTypeSelect.addEventListener('change', function() {
                    if (this.value === 'Other') {
                        saleServiceTypeOtherInput.style.display = 'block';
                        saleServiceTypeOtherInput.required = true;
                    } else {
                        saleServiceTypeOtherInput.style.display = 'none';
                        saleServiceTypeOtherInput.required = false;
                    }
                });

                document.getElementById('saleNetRate').addEventListener('input', calculateProfit);
                document.getElementById('saleSalesRate').addEventListener('input', calculateProfit);

                function calculateProfit() {
                    const netRate = parseFloat(document.getElementById('saleNetRate').value) || 0;
                    const salesRate = parseFloat(document.getElementById('saleSalesRate').value) || 0;
                    const profit = salesRate - netRate;
                    document.getElementById('saleProfit').value = profit.toFixed(2);
                }

                addSaleBtn.addEventListener('click', function() {
                    document.getElementById('saleModalTitle').textContent = 'Add New Sale';
                    saleModal.style.display = 'flex';
                    saleForm.reset();
                    saleFileNameDisplay.textContent = '';
                    document.getElementById('saleId').value = '';
                    document.getElementById('saleDate').valueAsDate = new Date();
                    document.getElementById('saleProfit').value = '';
                    saleNationalOtherInput.style.display = 'none';
                    saleServiceTypeOtherInput.style.display = 'none';
                });

                function closeSaleModal() {
                    saleModal.style.display = 'none';
                }

                closeSaleBtn.addEventListener('click', closeSaleModal);
                cancelSaleBtn.addEventListener('click', closeSaleModal);
                saveSaleBtn.addEventListener('click', saveSale);

                // Supplier Payment Modal
                const supplierPaymentModal = document.getElementById('supplierPaymentModal');
                const addSupplierPaymentBtn = document.getElementById('addSupplierPaymentBtn');
                const closeSupplierPaymentBtn = supplierPaymentModal.querySelector('.close-btn');
                const cancelSupplierPaymentBtn = document.getElementById('cancelSupplierPaymentBtn');
                const saveSupplierPaymentBtn = document.getElementById('saveSupplierPaymentBtn');
                const supplierPaymentForm = document.getElementById('supplierPaymentForm');
                const supplierFileUploadContainer = document.getElementById('supplierFileUploadContainer');
                const supplierFileInput = document.getElementById('supplierReceipt');
                const supplierFileNameDisplay = document.getElementById('supplierFileName');

                supplierFileUploadContainer.addEventListener('click', () => supplierFileInput.click());
                supplierFileInput.addEventListener('change', function() {
                    if (this.files.length > 0) {
                        supplierFileNameDisplay.textContent = `Selected file: ${this.files[0].name}`;
                    } else {
                        supplierFileNameDisplay.textContent = '';
                    }
                });

                addSupplierPaymentBtn.addEventListener('click', function() {
                    document.getElementById('supplierPaymentModalTitle').textContent = 'Add Supplier Payment';
                    supplierPaymentModal.style.display = 'flex';
                    supplierPaymentForm.reset();
                    supplierFileNameDisplay.textContent = '';
                    document.getElementById('supplierPaymentId').value = '';
                    document.getElementById('supplierDate').valueAsDate = new Date();
                });

                function closeSupplierPaymentModal() {
                    supplierPaymentModal.style.display = 'none';
                }

                closeSupplierPaymentBtn.addEventListener('click', closeSupplierPaymentModal);
                cancelSupplierPaymentBtn.addEventListener('click', closeSupplierPaymentModal);
                saveSupplierPaymentBtn.addEventListener('click', saveSupplierPayment);

                // Staff Modal
                const staffModal = document.getElementById('staffModal');
                const addStaffBtn = document.getElementById('addStaffBtn');
                const closeStaffBtn = staffModal.querySelector('.close-btn');
                const cancelStaffBtn = document.getElementById('cancelStaffBtn');
                const saveStaffBtn = document.getElementById('saveStaffBtn');
                const staffForm = document.getElementById('staffForm');
                const staffRoleSelect = document.getElementById('staffRole');
                const staffRoleOtherInput = document.getElementById('staffRoleOther');

                staffRoleSelect.addEventListener('change', function() {
                    if (this.value === 'Other') {
                        staffRoleOtherInput.style.display = 'block';
                        staffRoleOtherInput.required = true;
                    } else {
                        staffRoleOtherInput.style.display = 'none';
                        staffRoleOtherInput.required = false;
                    }
                });

                addStaffBtn.addEventListener('click', function() {
                    document.getElementById('staffModalTitle').textContent = 'Add Staff Member';
                    staffModal.style.display = 'flex';
                    staffForm.reset();
                    document.getElementById('staffId').value = '';
                    document.getElementById('staffJoinDate').valueAsDate = new Date();
                    staffRoleOtherInput.style.display = 'none';
                });

                function closeStaffModal() {
                    staffModal.style.display = 'none';
                }

                closeStaffBtn.addEventListener('click', closeStaffModal);
                cancelStaffBtn.addEventListener('click', closeStaffModal);
                saveStaffBtn.addEventListener('click', saveStaff);

                // Close modals when clicking outside
                window.addEventListener('click', function(e) {
                    if (e.target === expenseModal) closeExpenseModal();
                    if (e.target === saleModal) closeSaleModal();
                    if (e.target === supplierPaymentModal) closeSupplierPaymentModal();
                    if (e.target === staffModal) closeStaffModal();
                });
            }

            // Save functions - REMOVED ALERTS
            function saveExpense() {
                if (!document.getElementById('expenseForm').checkValidity()) {
                    document.getElementById('expenseForm').reportValidity();
                    return;
                }

                const id = document.getElementById('expenseId').value;
                let category = document.getElementById('expenseCategory').value;
                if (category === 'Other') {
                    category = document.getElementById('expenseCategoryOther').value;
                }
                const amount = parseFloat(document.getElementById('expenseAmount').value);
                const date = document.getElementById('expenseDate').value;
                const description = document.getElementById('expenseDescription').value;
                
                let receiptFileName = null;
                const expenseFileInput = document.getElementById('expenseReceipt');
                if (expenseFileInput.files.length > 0) {
                    receiptFileName = `receipt_${Date.now()}_${expenseFileInput.files[0].name}`;
                }

                if (id) {
                    const expenseIndex = expenses.findIndex(e => e.id == id);
                    if (expenseIndex !== -1) {
                        expenses[expenseIndex] = {
                            ...expenses[expenseIndex],
                            category: category,
                            amount: amount,
                            date: date,
                            description: description,
                            receipt: receiptFileName || expenses[expenseIndex].receipt
                        };
                    }
                } else {
                    const newExpense = {
                        id: expenses.length > 0 ? Math.max(...expenses.map(e => e.id)) + 1 : 1,
                        category: category,
                        amount: amount,
                        date: date,
                        description: description,
                        receipt: receiptFileName,
                        type: 'general'
                    };
                    expenses.push(newExpense);
                }

                localStorage.setItem('expenses', JSON.stringify(expenses));
                renderExpensesTable();
                updateDashboardStats();
                updateAllCharts();
                generateAutoNotes();
                document.getElementById('expenseModal').style.display = 'none';
            }

            function saveSalary() {
                if (!document.getElementById('salaryForm').checkValidity()) {
                    document.getElementById('salaryForm').reportValidity();
                    return;
                }

                const id = document.getElementById('salaryId').value;
                const staffId = document.getElementById('salaryStaffName').value;
                const staffMember = staffMembers.find(s => s.id == staffId);
                const staffSalary = parseFloat(document.getElementById('staffSalaryAmount').value) || 0;
                const advanceAmount = parseFloat(document.getElementById('advanceAmount').value) || 0;
                const salaryAmount = parseFloat(document.getElementById('salaryAmount').value) || 0;
                const totalAmount = advanceAmount + salaryAmount;
                const date = document.getElementById('salaryDate').value;
                const salaryForMonth = document.getElementById('salaryForMonth').value;
                const description = document.getElementById('salaryDescription').value;
                
                let receiptFileName = null;
                const salaryFileInput = document.getElementById('salaryReceipt');
                if (salaryFileInput.files.length > 0) {
                    receiptFileName = `salary_receipt_${Date.now()}_${salaryFileInput.files[0].name}`;
                }

                if (id) {
                    const salaryIndex = salaryPayments.findIndex(s => s.id == id);
                    if (salaryIndex !== -1) {
                        salaryPayments[salaryIndex] = {
                            ...salaryPayments[salaryIndex],
                            staffId: staffId,
                            staffName: staffMember.name,
                            staffSalary: staffSalary,
                            advanceAmount: advanceAmount,
                            salaryAmount: salaryAmount,
                            totalAmount: totalAmount,
                            date: date,
                            salaryForMonth: salaryForMonth,
                            description: description,
                            receipt: receiptFileName || salaryPayments[salaryIndex].receipt
                        };
                    }
                } else {
                    const newSalary = {
                        id: salaryPayments.length > 0 ? Math.max(...salaryPayments.map(s => s.id)) + 1 : 1,
                        staffId: staffId,
                        staffName: staffMember.name,
                        staffSalary: staffSalary,
                        advanceAmount: advanceAmount,
                        salaryAmount: salaryAmount,
                        totalAmount: totalAmount,
                        date: date,
                        salaryForMonth: salaryForMonth,
                        description: description,
                        receipt: receiptFileName
                    };
                    salaryPayments.push(newSalary);
                    
                    // Also add as expense for accounting
                    const newExpense = {
                        id: expenses.length > 0 ? Math.max(...expenses.map(e => e.id)) + 1 : 1,
                        category: 'Salaries',
                        amount: totalAmount,
                        date: date,
                        description: `Salary payment for ${staffMember.name} - ${salaryForMonth}`,
                        receipt: receiptFileName,
                        type: 'salary',
                        salaryId: newSalary.id
                    };
                    expenses.push(newExpense);
                }

                localStorage.setItem('salaryPayments', JSON.stringify(salaryPayments));
                localStorage.setItem('expenses', JSON.stringify(expenses));
                renderSalaryTable();
                renderExpensesTable();
                updateDashboardStats();
                updateAllCharts();
                updateSalaryStats();
                generateAutoNotes();
                document.getElementById('expenseModal').style.display = 'none';
            }

            function saveSale() {
                if (!document.getElementById('saleForm').checkValidity()) {
                    document.getElementById('saleForm').reportValidity();
                    return;
                }

                const id = document.getElementById('saleId').value;
                const agencyName = document.getElementById('saleAgencyName').value;
                const supplierName = document.getElementById('saleSupplierName').value;
                let national = document.getElementById('saleNational').value;
                if (national === 'Other') {
                    national = document.getElementById('saleNationalOther').value;
                }
                const passportNumber = document.getElementById('salePassportNumber').value;
                let serviceType = document.getElementById('saleServiceType').value;
                if (serviceType === 'Other') {
                    serviceType = document.getElementById('saleServiceTypeOther').value;
                }
                const date = document.getElementById('saleDate').value;
                const netRate = parseFloat(document.getElementById('saleNetRate').value);
                const salesRate = parseFloat(document.getElementById('saleSalesRate').value);
                const profit = parseFloat(document.getElementById('saleProfit').value);
                const comment = document.getElementById('saleComment').value;
                
                let documentFileNames = [];
                const saleFileInput = document.getElementById('saleDocuments');
                if (saleFileInput.files.length > 0) {
                    for (let i = 0; i < saleFileInput.files.length; i++) {
                        documentFileNames.push(`doc_${Date.now()}_${i}_${saleFileInput.files[i].name}`);
                    }
                }

                if (id) {
                    const saleIndex = sales.findIndex(s => s.id == id);
                    if (saleIndex !== -1) {
                        sales[saleIndex] = {
                            ...sales[saleIndex],
                            agency: agencyName,
                            supplier: supplierName,
                            national: national,
                            passportNumber: passportNumber,
                            service: serviceType,
                            netRate: netRate,
                            salesRate: salesRate,
                            profit: profit,
                            comment: comment,
                            date: date,
                            documents: documentFileNames.length > 0 ? documentFileNames : sales[saleIndex].documents
                        };
                    }
                } else {
                    const newSale = {
                        id: sales.length > 0 ? Math.max(...sales.map(s => s.id)) + 1 : 1,
                        agency: agencyName,
                        supplier: supplierName,
                        national: national,
                        passportNumber: passportNumber,
                        service: serviceType,
                        netRate: netRate,
                        salesRate: salesRate,
                        profit: profit,
                        comment: comment,
                        date: date,
                        documents: documentFileNames
                    };
                    sales.push(newSale);
                }

                localStorage.setItem('sales', JSON.stringify(sales));
                renderSalesTable();
                updateDashboardStats();
                updateAllCharts();
                generateAutoNotes();
                document.getElementById('saleModal').style.display = 'none';
            }

            function saveSupplierPayment() {
                if (!document.getElementById('supplierPaymentForm').checkValidity()) {
                    document.getElementById('supplierPaymentForm').reportValidity();
                    return;
                }

                const id = document.getElementById('supplierPaymentId').value;
                const supplierName = document.getElementById('supplierName').value;
                const amount = parseFloat(document.getElementById('supplierAmount').value);
                const date = document.getElementById('supplierDate').value;
                
                let receiptFileName = null;
                const supplierFileInput = document.getElementById('supplierReceipt');
                if (supplierFileInput.files.length > 0) {
                    receiptFileName = `supplier_receipt_${Date.now()}_${supplierFileInput.files[0].name}`;
                }

                if (id) {
                    const paymentIndex = supplierPayments.findIndex(p => p.id == id);
                    if (paymentIndex !== -1) {
                        supplierPayments[paymentIndex] = {
                            ...supplierPayments[paymentIndex],
                            supplierName: supplierName,
                            amount: amount,
                            date: date,
                            receipt: receiptFileName || supplierPayments[paymentIndex].receipt
                        };
                    }
                } else {
                    const newPayment = {
                        id: supplierPayments.length > 0 ? Math.max(...supplierPayments.map(p => p.id)) + 1 : 1,
                        supplierName: supplierName,
                        amount: amount,
                        date: date,
                        receipt: receiptFileName
                    };
                    supplierPayments.push(newPayment);
                }

                localStorage.setItem('supplierPayments', JSON.stringify(supplierPayments));
                renderSupplierPaymentsTable();
                updateDashboardStats();
                updateAllCharts();
                generateAutoNotes();
                document.getElementById('supplierPaymentModal').style.display = 'none';
            }

            function saveStaff() {
                if (!document.getElementById('staffForm').checkValidity()) {
                    document.getElementById('staffForm').reportValidity();
                    return;
                }

                const id = document.getElementById('staffId').value;
                const name = document.getElementById('staffName').value;
                const staffIdNumber = document.getElementById('staffIdNumber').value;
                let role = document.getElementById('staffRole').value;
                if (role === 'Other') {
                    role = document.getElementById('staffRoleOther').value;
                }
                const phone = document.getElementById('staffPhone').value;
                const email = document.getElementById('staffEmail').value;
                const address = document.getElementById('staffAddress').value;
                const joinDate = document.getElementById('staffJoinDate').value;
                const salary = parseFloat(document.getElementById('staffSalary').value) || 0;

                if (id) {
                    const staffIndex = staffMembers.findIndex(s => s.id == id);
                    if (staffIndex !== -1) {
                        staffMembers[staffIndex] = {
                            ...staffMembers[staffIndex],
                            name: name,
                            staffId: staffIdNumber,
                            role: role,
                            phone: phone,
                            email: email,
                            address: address,
                            joinDate: joinDate,
                            salary: salary
                        };
                    }
                } else {
                    const newStaff = {
                        id: staffMembers.length > 0 ? Math.max(...staffMembers.map(s => s.id)) + 1 : 1,
                        name: name,
                        staffId: staffIdNumber,
                        role: role,
                        phone: phone,
                        email: email,
                        address: address,
                        joinDate: joinDate,
                        salary: salary
                    };
                    staffMembers.push(newStaff);
                }

                localStorage.setItem('staffMembers', JSON.stringify(staffMembers));
                renderStaffList();
                generateAutoNotes();
                document.getElementById('staffModal').style.display = 'none';
            }

            // Staff management functions
            function setupStaffManagement() {
                // Edit staff member
                document.addEventListener('click', function(e) {
                    if (e.target.closest('.edit-staff-btn')) {
                        const staffId = parseInt(e.target.closest('.edit-staff-btn').getAttribute('data-id'));
                        editStaff(staffId);
                    }
                    
                    if (e.target.closest('.delete-staff-btn')) {
                        const staffId = parseInt(e.target.closest('.delete-staff-btn').getAttribute('data-id'));
                        deleteStaff(staffId);
                    }
                    
                    if (e.target.closest('.edit-salary-btn')) {
                        const salaryId = parseInt(e.target.closest('.edit-salary-btn').getAttribute('data-id'));
                        editSalary(salaryId);
                    }
                    
                    // Edit buttons in tables
                    if (e.target.closest('.edit-expense-btn')) {
                        const expenseId = parseInt(e.target.closest('.edit-expense-btn').getAttribute('data-id'));
                        editExpense(expenseId);
                    }
                    
                    if (e.target.closest('.edit-sale-btn')) {
                        const saleId = parseInt(e.target.closest('.edit-sale-btn').getAttribute('data-id'));
                        editSale(saleId);
                    }
                    
                    if (e.target.closest('.edit-supplier-payment-btn')) {
                        const paymentId = parseInt(e.target.closest('.edit-supplier-payment-btn').getAttribute('data-id'));
                        editSupplierPayment(paymentId);
                    }
                });
            }

            function renderStaffList() {
                const staffList = document.getElementById('staffList');
                staffList.innerHTML = '';

                if (staffMembers.length === 0) {
                    staffList.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--gray);">No staff members added yet.</div>';
                    return;
                }

                staffMembers.forEach(staff => {
                    const staffItem = document.createElement('div');
                    staffItem.className = 'staff-item';
                    
                    staffItem.innerHTML = `
                        <div class="staff-info">
                            <div class="staff-name">${staff.name}</div>
                            <div class="staff-details">
                                <span class="staff-id">ID: ${staff.staffId}</span>
                                <span>•</span>
                                <span>${staff.role}</span>
                                ${staff.salary ? `<span>•</span><span>Salary: AED ${staff.salary.toFixed(2)}</span>` : ''}
                            </div>
                            ${staff.email ? `<div class="staff-details">${staff.email} • ${staff.phone || 'No phone'}</div>` : ''}
                            ${staff.address ? `<div class="staff-details" style="font-size: 12px; margin-top: 5px;">${staff.address}</div>` : ''}
                        </div>
                        <div class="staff-actions">
                            <button class="action-btn edit-staff-btn" data-id="${staff.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete-staff-btn" data-id="${staff.id}" style="color: var(--danger);">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                    
                    staffList.appendChild(staffItem);
                });
            }

            function updateStaffDropdown() {
                const staffDropdown = document.getElementById('salaryStaffName');
                staffDropdown.innerHTML = '<option value="">Select staff member</option>';
                
                staffMembers.forEach(staff => {
                    const option = document.createElement('option');
                    option.value = staff.id;
                    option.textContent = `${staff.name} (${staff.staffId}) - ${staff.role}`;
                    staffDropdown.appendChild(option);
                });
            }

            function editStaff(id) {
                const staff = staffMembers.find(s => s.id === id);
                if (staff) {
                    document.getElementById('staffModalTitle').textContent = 'Edit Staff Member';
                    document.getElementById('staffId').value = staff.id;
                    document.getElementById('staffName').value = staff.name;
                    document.getElementById('staffIdNumber').value = staff.staffId;
                    
                    const roleSelect = document.getElementById('staffRole');
                    let roleFound = false;
                    for (let i = 0; i < roleSelect.options.length; i++) {
                        if (roleSelect.options[i].value === staff.role) {
                            roleSelect.value = staff.role;
                            roleFound = true;
                            break;
                        }
                    }
                    
                    if (!roleFound && staff.role) {
                        roleSelect.value = 'Other';
                        const otherInput = document.getElementById('staffRoleOther');
                        otherInput.value = staff.role;
                        otherInput.style.display = 'block';
                    }
                    
                    document.getElementById('staffPhone').value = staff.phone || '';
                    document.getElementById('staffEmail').value = staff.email || '';
                    document.getElementById('staffAddress').value = staff.address || '';
                    document.getElementById('staffJoinDate').value = staff.joinDate;
                    document.getElementById('staffSalary').value = staff.salary || '';
                    
                    document.getElementById('staffModal').style.display = 'flex';
                }
            }

            function deleteStaff(id) {
                if (confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) {
                    // Check if staff has salary payments
                    const hasSalaryPayments = salaryPayments.some(p => p.staffId == id);
                    if (hasSalaryPayments) {
                        if (!confirm('This staff member has salary payments. Deleting them will also remove all associated salary records. Continue?')) {
                            return;
                        }
                        // Remove associated salary payments and expenses
                        salaryPayments = salaryPayments.filter(p => p.staffId != id);
                        expenses = expenses.filter(e => !e.salaryId || salaryPayments.some(s => s.id == e.salaryId));
                        localStorage.setItem('salaryPayments', JSON.stringify(salaryPayments));
                        localStorage.setItem('expenses', JSON.stringify(expenses));
                        renderSalaryTable();
                        renderExpensesTable();
                    }
                    
                    staffMembers = staffMembers.filter(s => s.id !== id);
                    localStorage.setItem('staffMembers', JSON.stringify(staffMembers));
                    renderStaffList();
                    updateStaffDropdown();
                    generateAutoNotes();
                }
            }

            // Salary table rendering
            function renderSalaryTable() {
                const tableBody = document.getElementById('salaryTableBody');
                tableBody.innerHTML = '';

                if (salaryPayments.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No salary payments found</td></tr>';
                    return;
                }

                const sortedSalaries = [...salaryPayments].sort((a, b) => new Date(b.date) - new Date(a.date));

                sortedSalaries.forEach(salary => {
                    const row = document.createElement('tr');
                    const dateObj = new Date(salary.date);
                    const formattedDate = dateObj.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                    
                    // Format month for display
                    const monthDate = new Date(salary.salaryForMonth + '-01');
                    const monthDisplay = monthDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long'
                    });
                    
                    // Get remarks for this salary
                    const salaryRemarks = remarks[`salary_${salary.id}`] || null;
                    
                    row.innerHTML = `
                        <td class="actions-cell">
                            <button class="action-btn edit-salary-btn" data-id="${salary.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                        <td>${formattedDate}</td>
                        <td>${salary.staffName}</td>
                        <td>${monthDisplay}</td>
                        <td class="amount cost-amount">AED ${salary.advanceAmount.toFixed(2)}</td>
                        <td class="amount cost-amount">AED ${salary.totalAmount.toFixed(2)}</td>
                        <td class="remarks-cell">
                            ${renderRemarksSelect(`salary_${salary.id}`, salaryRemarks)}
                        </td>
                    `;
                    
                    tableBody.appendChild(row);
                });
            }

            function editSalary(id) {
                const salary = salaryPayments.find(s => s.id === id);
                if (salary) {
                    // Switch to salary tab
                    document.querySelector('.form-tab[data-tab="general"]').classList.remove('active');
                    document.querySelector('.form-tab[data-tab="salary"]').classList.add('active');
                    document.getElementById('generalExpenseTab').classList.remove('active');
                    document.getElementById('salaryPaymentTab').classList.add('active');
                    document.getElementById('saveExpenseBtn').textContent = 'Save Salary Payment';
                    
                    document.getElementById('expenseModalTitle').textContent = 'Edit Salary Payment';
                    document.getElementById('salaryId').value = salary.id;
                    document.getElementById('salaryStaffName').value = salary.staffId;
                    document.getElementById('staffSalaryAmount').value = salary.staffSalary;
                    document.getElementById('advanceAmount').value = salary.advanceAmount;
                    document.getElementById('salaryAmount').value = salary.salaryAmount;
                    document.getElementById('totalSalaryAmount').value = salary.totalAmount;
                    document.getElementById('salaryDate').value = salary.date;
                    document.getElementById('salaryForMonth').value = salary.salaryForMonth;
                    document.getElementById('salaryDescription').value = salary.description || '';
                    document.getElementById('salaryFileName').textContent = salary.receipt ? `Current file: ${salary.receipt}` : '';
                    
                    // Update staff dropdown
                    updateStaffDropdown();
                    
                    document.getElementById('expenseModal').style.display = 'flex';
                }
            }

            // Enhanced Remarks System - FIXED: Stay as dropdown lists only
            function setupRemarksSystem() {
                document.addEventListener('change', function(e) {
                    if (e.target.classList.contains('remarks-select')) {
                        const id = e.target.getAttribute('data-id');
                        const remark = e.target.value;
                        saveRemark(id, remark);
                    }
                });
            }

            function renderRemarksSelect(id, currentRemark) {
                return `
                    <select class="remarks-select" data-id="${id}">
                        <option value="">Select Status</option>
                        <option value="pending" ${currentRemark === 'pending' ? 'selected' : ''}>Pending Payment</option>
                        <option value="credited" ${currentRemark === 'credited' ? 'selected' : ''}>Amount Credited</option>
                        <option value="transferred" ${currentRemark === 'transferred' ? 'selected' : ''}>Transferred to Bank</option>
                        <option value="canceled" ${currentRemark === 'canceled' ? 'selected' : ''}>Canceled</option>
                        <option value="cleared" ${currentRemark === 'cleared' ? 'selected' : ''}>Cleared</option>
                        <option value="on-hold" ${currentRemark === 'on-hold' ? 'selected' : ''}>On Hold</option>
                    </select>
                `;
            }

            function saveRemark(id, remark) {
                if (remark) {
                    remarks[id] = remark;
                    localStorage.setItem('remarks', JSON.stringify(remarks));
                    
                    // Re-render the affected table
                    const [type, itemId] = id.split('_');
                    
                    switch(type) {
                        case 'expense':
                            renderExpensesTable();
                            break;
                        case 'sale':
                            renderSalesTable();
                            break;
                        case 'supplier':
                            renderSupplierPaymentsTable();
                            break;
                        case 'salary':
                            renderSalaryTable();
                            break;
                    }
                    
                    generateAutoNotes();
                    generateTransactionReports('all');
                }
            }

            function formatRemarks(remark) {
                const remarkMap = {
                    'pending': 'Pending',
                    'credited': 'Credited',
                    'transferred': 'Transferred',
                    'canceled': 'Canceled',
                    'cleared': 'Cleared',
                    'on-hold': 'On Hold'
                };
                return remarkMap[remark] || remark;
            }

            // Table rendering functions with editable remarks
            function renderExpensesTable() {
                const tableBody = document.getElementById('expensesTableBody');
                tableBody.innerHTML = '';

                // Filter out salary expenses (they're shown separately)
                const generalExpenses = expenses.filter(e => e.type !== 'salary');

                if (generalExpenses.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No expenses found</td></tr>';
                    return;
                }

                const sortedExpenses = [...generalExpenses].sort((a, b) => new Date(b.date) - new Date(a.date));

                sortedExpenses.forEach(expense => {
                    const row = document.createElement('tr');
                    const dateObj = new Date(expense.date);
                    const formattedDate = dateObj.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                    
                    let receiptContent = '-';
                    if (expense.receipt) {
                        const fileExtension = expense.receipt.split('.').pop().toLowerCase();
                        const iconClass = fileExtension === 'pdf' ? 'fa-file-pdf' : 'fa-file-image';
                        receiptContent = `
                            <a href="#" class="documents-preview" data-file="${expense.receipt}">
                                <i class="fas ${iconClass} documents-icon"></i>
                                View
                            </a>
                        `;
                    }
                    
                    // Get remarks for this expense
                    const expenseRemarks = remarks[`expense_${expense.id}`] || null;
                    
                    row.innerHTML = `
                        <td class="actions-cell">
                            <button class="action-btn edit-expense-btn" data-id="${expense.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                        <td>${formattedDate}</td>
                        <td>${expense.description}</td>
                        <td>${expense.category}</td>
                        <td class="amount cost-amount">AED ${expense.amount.toFixed(2)}</td>
                        <td class="documents-cell">${receiptContent}</td>
                        <td class="remarks-cell">
                            ${renderRemarksSelect(`expense_${expense.id}`, expenseRemarks)}
                        </td>
                    `;
                    
                    tableBody.appendChild(row);
                });

                document.querySelectorAll('.documents-preview').forEach(link => {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        const fileName = this.getAttribute('data-file');
                        // Silent operation - no alert
                    });
                });

                updateExpensePageStats();
            }

            function renderSalesTable() {
                const tableBody = document.getElementById('salesTableBody');
                tableBody.innerHTML = '';

                if (sales.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="11" style="text-align: center;">No sales found</td></tr>';
                    return;
                }

                const sortedSales = [...sales].sort((a, b) => new Date(b.date) - new Date(a.date));

                sortedSales.forEach(sale => {
                    const row = document.createElement('tr');
                    const dateObj = new Date(sale.date);
                    const formattedDate = dateObj.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                    
                    let documentsContent = '-';
                    if (sale.documents && sale.documents.length > 0) {
                        documentsContent = `
                            <a href="#" class="documents-preview" data-files="${sale.documents.join(',')}">
                                <i class="fas fa-file-alt documents-icon"></i>
                                View (${sale.documents.length})
                            </a>
                        `;
                    }
                    
                    // Get remarks for this sale
                    const saleRemarks = remarks[`sale_${sale.id}`] || null;
                    
                    row.innerHTML = `
                        <td class="actions-cell">
                            <button class="action-btn edit-sale-btn" data-id="${sale.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                        <td>${formattedDate}</td>
                        <td>${sale.agency}</td>
                        <td>${sale.supplier}</td>
                        <td>${sale.national}</td>
                        <td>${sale.service}</td>
                        <td class="amount cost-amount">AED ${sale.netRate.toFixed(2)}</td>
                        <td class="amount customer-rate">AED ${sale.salesRate.toFixed(2)}</td>
                        <td class="amount profit-amount">AED ${sale.profit.toFixed(2)}</td>
                        <td class="documents-cell">${documentsContent}</td>
                        <td class="remarks-cell">
                            ${renderRemarksSelect(`sale_${sale.id}`, saleRemarks)}
                        </td>
                    `;
                    
                    tableBody.appendChild(row);
                });

                document.querySelectorAll('.documents-preview').forEach(link => {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        const fileNames = this.getAttribute('data-files').split(',');
                        // Silent operation - no alert
                    });
                });

                updateSalesPageStats();
            }

            function renderSupplierPaymentsTable() {
                const tableBody = document.getElementById('supplierPaymentsTableBody');
                tableBody.innerHTML = '';

                if (supplierPayments.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No supplier payments found</td></tr>';
                    return;
                }

                const sortedPayments = [...supplierPayments].sort((a, b) => new Date(b.date) - new Date(a.date));

                sortedPayments.forEach(payment => {
                    const row = document.createElement('tr');
                    const dateObj = new Date(payment.date);
                    const formattedDate = dateObj.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                    
                    let receiptContent = '-';
                    if (payment.receipt) {
                        const fileExtension = payment.receipt.split('.').pop().toLowerCase();
                        const iconClass = fileExtension === 'pdf' ? 'fa-file-pdf' : 'fa-file-image';
                        receiptContent = `
                            <a href="#" class="documents-preview" data-file="${payment.receipt}">
                                <i class="fas ${iconClass} documents-icon"></i>
                                View
                            </a>
                        `;
                    }
                    
                    // Get remarks for this payment
                    const paymentRemarks = remarks[`supplier_${payment.id}`] || null;
                    
                    row.innerHTML = `
                        <td class="actions-cell">
                            <button class="action-btn edit-supplier-payment-btn" data-id="${payment.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                        <td>${formattedDate}</td>
                        <td>${payment.supplierName}</td>
                        <td class="amount cost-amount">AED ${payment.amount.toFixed(2)}</td>
                        <td class="documents-cell">${receiptContent}</td>
                        <td class="remarks-cell">
                            ${renderRemarksSelect(`supplier_${payment.id}`, paymentRemarks)}
                        </td>
                    `;
                    
                    tableBody.appendChild(row);
                });

                document.querySelectorAll('.documents-preview').forEach(link => {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        const fileName = this.getAttribute('data-file');
                        // Silent operation - no alert
                    });
                });

                updateSupplierPaymentsPageStats();
            }

            // Edit functions
            function editExpense(id) {
                const expense = expenses.find(e => e.id === id);
                if (expense) {
                    // Make sure we're on the general expense tab
                    document.querySelector('.form-tab[data-tab="general"]').classList.add('active');
                    document.querySelector('.form-tab[data-tab="salary"]').classList.remove('active');
                    document.getElementById('generalExpenseTab').classList.add('active');
                    document.getElementById('salaryPaymentTab').classList.remove('active');
                    document.getElementById('saveExpenseBtn').textContent = 'Save Expense';
                    
                    document.getElementById('expenseModalTitle').textContent = 'Edit Expense';
                    document.getElementById('expenseId').value = expense.id;
                    
                    const categorySelect = document.getElementById('expenseCategory');
                    let categoryFound = false;
                    for (let i = 0; i < categorySelect.options.length; i++) {
                        if (categorySelect.options[i].value === expense.category) {
                            categorySelect.value = expense.category;
                            categoryFound = true;
                            break;
                        }
                    }
                    
                    if (!categoryFound && expense.category) {
                        categorySelect.value = 'Other';
                        const otherInput = document.getElementById('expenseCategoryOther');
                        otherInput.value = expense.category;
                        otherInput.style.display = 'block';
                    }
                    
                    document.getElementById('expenseAmount').value = expense.amount;
                    document.getElementById('expenseDate').value = expense.date;
                    document.getElementById('expenseDescription').value = expense.description;
                    document.getElementById('expenseFileName').textContent = expense.receipt ? `Current file: ${expense.receipt}` : '';
                    
                    document.getElementById('expenseModal').style.display = 'flex';
                }
            }

            function editSale(id) {
                const sale = sales.find(s => s.id === id);
                if (sale) {
                    document.getElementById('saleModalTitle').textContent = 'Edit Sale';
                    document.getElementById('saleId').value = sale.id;
                    document.getElementById('saleAgencyName').value = sale.agency;
                    document.getElementById('saleSupplierName').value = sale.supplier;
                    
                    const nationalSelect = document.getElementById('saleNational');
                    let nationalFound = false;
                    for (let i = 0; i < nationalSelect.options.length; i++) {
                        if (nationalSelect.options[i].value === sale.national) {
                            nationalSelect.value = sale.national;
                            nationalFound = true;
                            break;
                        }
                    }
                    
                    if (!nationalFound && sale.national) {
                        nationalSelect.value = 'Other';
                        const otherInput = document.getElementById('saleNationalOther');
                        otherInput.value = sale.national;
                        otherInput.style.display = 'block';
                    }
                    
                    document.getElementById('salePassportNumber').value = sale.passportNumber;
                    
                    const serviceSelect = document.getElementById('saleServiceType');
                    let serviceFound = false;
                    for (let i = 0; i < serviceSelect.options.length; i++) {
                        if (serviceSelect.options[i].value === sale.service) {
                            serviceSelect.value = sale.service;
                            serviceFound = true;
                            break;
                        }
                    }
                    
                    if (!serviceFound && sale.service) {
                        serviceSelect.value = 'Other';
                        const otherInput = document.getElementById('saleServiceTypeOther');
                        otherInput.value = sale.service;
                        otherInput.style.display = 'block';
                    }
                    
                    document.getElementById('saleDate').value = sale.date;
                    document.getElementById('saleNetRate').value = sale.netRate;
                    document.getElementById('saleSalesRate').value = sale.salesRate;
                    document.getElementById('saleProfit').value = sale.profit;
                    document.getElementById('saleComment').value = sale.comment || '';
                    document.getElementById('saleFileName').textContent = sale.documents && sale.documents.length > 0 ? 
                        `Current files: ${sale.documents.join(', ')}` : '';
                    
                    document.getElementById('saleModal').style.display = 'flex';
                }
            }

            function editSupplierPayment(id) {
                const payment = supplierPayments.find(p => p.id === id);
                if (payment) {
                    document.getElementById('supplierPaymentModalTitle').textContent = 'Edit Supplier Payment';
                    document.getElementById('supplierPaymentId').value = payment.id;
                    document.getElementById('supplierName').value = payment.supplierName;
                    document.getElementById('supplierAmount').value = payment.amount;
                    document.getElementById('supplierDate').value = payment.date;
                    document.getElementById('supplierFileName').textContent = payment.receipt ? `Current file: ${payment.receipt}` : '';
                    
                    document.getElementById('supplierPaymentModal').style.display = 'flex';
                }
            }

            // Dashboard statistics
            function updateDashboardStats() {
                const totalSales = sales.reduce((sum, sale) => sum + sale.salesRate, 0);
                const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
                const totalProfit = totalSales - totalExpenses;
                
                document.getElementById('totalSales').textContent = totalSales.toLocaleString();
                document.getElementById('totalExpenses').textContent = totalExpenses.toLocaleString();
                document.getElementById('totalProfit').textContent = totalProfit.toLocaleString();
                document.getElementById('netProfit').textContent = totalProfit.toLocaleString();
                
                document.getElementById('salesEntries').textContent = `${sales.length} entries`;
                document.getElementById('expensesEntries').textContent = `${expenses.length} entries`;
                
                // Update progress bars
                updateMonthlyProgressBars();
            }

            function updateExpensePageStats() {
                const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                
                const monthlyExpenses = expenses
                    .filter(expense => {
                        const expenseDate = new Date(expense.date);
                        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
                    })
                    .reduce((sum, expense) => sum + expense.amount, 0);
                
                document.getElementById('expensesTotal').textContent = totalExpenses.toLocaleString();
                document.getElementById('expensesCount').textContent = `${expenses.length} entries`;
                document.getElementById('monthlyExpenses').textContent = monthlyExpenses.toLocaleString();
            }

            function updateSalaryStats() {
                const totalSalary = salaryPayments.reduce((sum, salary) => sum + salary.totalAmount, 0);
                document.getElementById('salaryExpenses').textContent = totalSalary.toLocaleString();
                document.getElementById('salaryCount').textContent = `${salaryPayments.length} payments`;
            }

            function updateSalesPageStats() {
                const totalSales = sales.reduce((sum, sale) => sum + sale.salesRate, 0);
                const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                
                const monthlySales = sales
                    .filter(sale => {
                        const saleDate = new Date(sale.date);
                        return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
                    })
                    .reduce((sum, sale) => sum + sale.salesRate, 0);
                
                // Calculate average profit margin
                const avgProfitMargin = sales.length > 0 ? 
                    (sales.reduce((sum, sale) => sum + (sale.profit / sale.salesRate * 100), 0) / sales.length) : 0;
                
                document.getElementById('salesTotal').textContent = totalSales.toLocaleString();
                document.getElementById('salesCount').textContent = `${sales.length} entries`;
                document.getElementById('salesProfit').textContent = totalProfit.toLocaleString();
                document.getElementById('monthlySales').textContent = monthlySales.toLocaleString();
                document.getElementById('avgProfitMargin').textContent = avgProfitMargin.toFixed(1);
            }

            function updateSupplierPaymentsPageStats() {
                const totalPayments = supplierPayments.reduce((sum, payment) => sum + payment.amount, 0);
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                
                const monthlyPayments = supplierPayments
                    .filter(payment => {
                        const paymentDate = new Date(payment.date);
                        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
                    })
                    .reduce((sum, payment) => sum + payment.amount, 0);
                
                document.getElementById('supplierPaymentsTotal').textContent = totalPayments.toLocaleString();
                document.getElementById('supplierPaymentsCount').textContent = `${supplierPayments.length} entries`;
                document.getElementById('monthlySupplierPayments').textContent = monthlyPayments.toLocaleString();
            }

            // Monthly progress bars as block graph
            function updateMonthlyProgressBars() {
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
                
                // Current month data
                const monthSales = sales
                    .filter(sale => {
                        const saleDate = new Date(sale.date);
                        return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
                    })
                    .reduce((sum, sale) => sum + sale.salesRate, 0);
                    
                const monthExpenses = expenses
                    .filter(expense => {
                        const expenseDate = new Date(expense.date);
                        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
                    })
                    .reduce((sum, expense) => sum + expense.amount, 0);
                
                const monthProfit = monthSales - monthExpenses;
                
                // Previous month data
                const prevMonthSales = sales
                    .filter(sale => {
                        const saleDate = new Date(sale.date);
                        return saleDate.getMonth() === prevMonth && saleDate.getFullYear() === prevMonthYear;
                    })
                    .reduce((sum, sale) => sum + sale.salesRate, 0);
                
                const prevMonthExpenses = expenses
                    .filter(expense => {
                        const expenseDate = new Date(expense.date);
                        return expenseDate.getMonth() === prevMonth && expenseDate.getFullYear() === prevMonthYear;
                    })
                    .reduce((sum, expense) => sum + expense.amount, 0);
                
                // Calculate percentages
                const salesGrowth = prevMonthSales > 0 ? ((monthSales - prevMonthSales) / prevMonthSales * 100) : (monthSales > 0 ? 100 : 0);
                const expenseControl = prevMonthExpenses > 0 ? ((prevMonthExpenses - monthExpenses) / prevMonthExpenses * 100) : (monthExpenses > 0 ? -100 : 0);
                const profitMargin = monthSales > 0 ? (monthProfit / monthSales * 100) : 0;
                
                // Normalize values for display (0-100%)
                const salesGrowthDisplay = Math.min(Math.max(salesGrowth, 0), 100);
                const expenseControlDisplay = Math.min(Math.max(expenseControl, 0), 100);
                const profitMarginDisplay = Math.min(Math.max(profitMargin, 0), 100);
                
                // Update display
                document.getElementById('salesGrowthPercent').textContent = `${salesGrowth.toFixed(1)}%`;
                document.getElementById('expenseControlPercent').textContent = `${expenseControl.toFixed(1)}%`;
                document.getElementById('profitMarginPercent').textContent = `${profitMargin.toFixed(1)}%`;
                
                // Update block graph bars
                document.getElementById('salesGrowthBar').style.width = `${salesGrowthDisplay}%`;
                document.getElementById('salesGrowthValue').textContent = `${salesGrowth.toFixed(1)}%`;
                
                document.getElementById('expenseControlBar').style.width = `${expenseControlDisplay}%`;
                document.getElementById('expenseControlValue').textContent = `${expenseControl.toFixed(1)}%`;
                
                document.getElementById('profitMarginBar').style.width = `${profitMarginDisplay}%`;
                document.getElementById('profitMarginValue').textContent = `${profitMargin.toFixed(1)}%`;
            }

            // Progress bars update with auto-calculated growth rate
            function updateAllProgressBars() {
                // Update sales category progress
                const salesByService = {};
                sales.forEach(sale => {
                    salesByService[sale.service] = (salesByService[sale.service] || 0) + sale.salesRate;
                });
                
                let topSalesCategory = '-';
                let topSalesAmount = 0;
                let totalSalesAmount = 0;
                
                for (const service in salesByService) {
                    totalSalesAmount += salesByService[service];
                    if (salesByService[service] > topSalesAmount) {
                        topSalesAmount = salesByService[service];
                        topSalesCategory = service;
                    }
                }
                
                document.getElementById('topSalesCategory').textContent = topSalesCategory;
                const salesProgress = totalSalesAmount > 0 ? (topSalesAmount / totalSalesAmount * 100) : 0;
                document.getElementById('salesCategoryProgress').style.width = `${salesProgress}%`;
                
                // Update expense category progress (excluding salaries)
                const generalExpenses = expenses.filter(e => e.type !== 'salary');
                const expensesByCategory = {};
                generalExpenses.forEach(expense => {
                    expensesByCategory[expense.category] = (expensesByCategory[expense.category] || 0) + expense.amount;
                });
                
                // Add salaries as a category
                const totalSalary = salaryPayments.reduce((sum, salary) => sum + salary.totalAmount, 0);
                if (totalSalary > 0) {
                    expensesByCategory['Salaries'] = totalSalary;
                }
                
                let topExpenseCategory = '-';
                let topExpenseAmount = 0;
                let totalExpenseAmount = 0;
                
                for (const category in expensesByCategory) {
                    totalExpenseAmount += expensesByCategory[category];
                    if (expensesByCategory[category] > topExpenseAmount) {
                        topExpenseAmount = expensesByCategory[category];
                        topExpenseCategory = category;
                    }
                }
                
                document.getElementById('topExpenseCategory').textContent = topExpenseCategory;
                const expenseProgress = totalExpenseAmount > 0 ? (topExpenseAmount / totalExpenseAmount * 100) : 0;
                document.getElementById('expenseCategoryProgress').style.width = `${expenseProgress}%`;
                
                // Update profit margin progress
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                
                const monthSales = sales
                    .filter(sale => {
                        const saleDate = new Date(sale.date);
                        return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
                    })
                    .reduce((sum, sale) => sum + sale.salesRate, 0);
                    
                const monthExpenses = expenses
                    .filter(expense => {
                        const expenseDate = new Date(expense.date);
                        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
                    })
                    .reduce((sum, expense) => sum + expense.amount, 0);
                    
                const currentProfitMargin = monthSales > 0 ? ((monthSales - monthExpenses) / monthSales * 100) : 0;
                document.getElementById('currentProfitMargin').textContent = currentProfitMargin.toFixed(1) + '%';
                document.getElementById('profitMarginProgress').style.width = `${Math.min(currentProfitMargin, 100)}%`;
                
                // Auto-calculate growth rate
                const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
                
                const prevMonthSales = sales
                    .filter(sale => {
                        const saleDate = new Date(sale.date);
                        return saleDate.getMonth() === prevMonth && saleDate.getFullYear() === prevMonthYear;
                    })
                    .reduce((sum, sale) => sum + sale.salesRate, 0);
                    
                const salesGrowthRate = prevMonthSales > 0 ? ((monthSales - prevMonthSales) / prevMonthSales * 100) : (monthSales > 0 ? 100 : 0);
                document.getElementById('salesGrowthRate').textContent = salesGrowthRate.toFixed(1) + '%';
                const growthProgress = Math.min(Math.abs(salesGrowthRate), 100);
                document.getElementById('growthProgress').style.width = `${growthProgress}%`;
                
                // Update monthly progress bars
                updateMonthlyProgressBars();
            }

            // Chart functions
            function initializeTrendsChart() {
                const ctx = document.getElementById('trendsChart').getContext('2d');
                const chartData = getChartData('7d'); // Default to 7D
                
                trendsChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: chartData.labels,
                        datasets: [
                            {
                                label: 'Sales',
                                data: chartData.salesData,
                                borderColor: '#2e7d32',
                                backgroundColor: 'rgba(46, 125, 50, 0.1)',
                                tension: 0.4,
                                borderWidth: 2,
                                pointRadius: 3,
                                pointHoverRadius: 5
                            },
                            {
                                label: 'Expenses',
                                data: chartData.expensesData,
                                borderColor: '#c62828',
                                backgroundColor: 'rgba(198, 40, 40, 0.1)',
                                tension: 0.4,
                                borderWidth: 2,
                                pointRadius: 3,
                                pointHoverRadius: 5
                            },
                            {
                                label: 'Profit',
                                data: chartData.profitData,
                                borderColor: '#1565c0',
                                backgroundColor: 'rgba(21, 101, 192, 0.1)',
                                tension: 0.4,
                                borderWidth: 2,
                                pointRadius: 3,
                                pointHoverRadius: 5
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false,
                                callbacks: {
                                    label: function(context) {
                                        return `${context.dataset.label}: AED ${context.parsed.y.toLocaleString()}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        if (value >= 1000) {
                                            return 'AED ' + (value / 1000).toFixed(0) + 'K';
                                        }
                                        return 'AED ' + value;
                                    }
                                }
                            }
                        }
                    }
                });
            }

            function getChartData(range = '7d') {
                let days = 7; // Default to 7D
                switch(range) {
                    case '7d': days = 7; break;
                    case '30d': days = 30; break;
                    case '90d': days = 90; break;
                    default: days = 7;
                }
                
                const labels = [];
                const salesData = [];
                const expensesData = [];
                const profitData = [];
                
                const today = new Date();
                for (let i = days - 1; i >= 0; i--) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    
                    const dateStr = date.toISOString().split('T')[0];
                    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    labels.push(label);
                    
                    const daySales = sales
                        .filter(s => s.date === dateStr)
                        .reduce((sum, s) => sum + s.salesRate, 0);
                    
                    const dayExpenses = expenses
                        .filter(e => e.date === dateStr)
                        .reduce((sum, e) => sum + e.amount, 0);
                    
                    const dayProfit = daySales - dayExpenses;
                    
                    salesData.push(daySales);
                    expensesData.push(dayExpenses);
                    profitData.push(dayProfit);
                }
                
                return {
                    labels: labels,
                    salesData: salesData,
                    expensesData: expensesData,
                    profitData: profitData
                };
            }

            // Chart controls
            function setupChartControls() {
                // Main trends chart controls
                document.querySelectorAll('.date-range .date-item').forEach(item => {
                    item.addEventListener('click', function() {
                        document.querySelectorAll('.date-item').forEach(d => d.classList.remove('active'));
                        this.classList.add('active');
                        
                        updateTrendsChart(this.dataset.range);
                    });
                });
                
                // Set 7D as active by default
                const sevenDayBtn = document.querySelector('.date-item[data-range="7d"]');
                if (sevenDayBtn) {
                    sevenDayBtn.classList.add('active');
                }
            }

            function updateTrendsChart(range) {
                if (!trendsChart) return;
                
                const chartData = getChartData(range);
                trendsChart.data.labels = chartData.labels;
                trendsChart.data.datasets[0].data = chartData.salesData;
                trendsChart.data.datasets[1].data = chartData.expensesData;
                trendsChart.data.datasets[2].data = chartData.profitData;
                trendsChart.update();
            }

            // CSV Export functionality
            function setupExportButtons() {
                document.getElementById('exportCSVData').addEventListener('click', exportCSVData);
            }

            function exportCSVData() {
                let csvContent = "data:text/csv;charset=utf-8,";
                
                // Header
                csvContent += "HAWK TRAVELMATE - Financial Data Export\r\n";
                csvContent += `Generated on: ${new Date().toLocaleDateString()}\r\n\r\n`;
                
                // Sales Data
                csvContent += "SALES DATA\r\n";
                csvContent += "Date,Agency,Supplier,National,Passport,Service,Net Rate,Sales Rate,Profit,Status,Comments\r\n";
                sales.forEach(sale => {
                    const saleRemarks = remarks[`sale_${sale.id}`] || 'No Status';
                    csvContent += `${sale.date},${sale.agency},${sale.supplier},${sale.national},${sale.passportNumber},${sale.service},${sale.netRate},${sale.salesRate},${sale.profit},${formatRemarks(saleRemarks)},"${sale.comment || ''}"\r\n`;
                });
                csvContent += "\r\n";
                
                // Expenses Data (excluding salaries)
                csvContent += "EXPENSES DATA\r\n";
                csvContent += "Date,Category,Description,Amount,Receipt,Status\r\n";
                expenses.filter(e => e.type !== 'salary').forEach(expense => {
                    const expenseRemarks = remarks[`expense_${expense.id}`] || 'No Status';
                    csvContent += `${expense.date},${expense.category},"${expense.description}",${expense.amount},${expense.receipt || 'No Receipt'},${formatRemarks(expenseRemarks)}\r\n`;
                });
                csvContent += "\r\n";
                
                // Supplier Payments
                csvContent += "SUPPLIER PAYMENTS\r\n";
                csvContent += "Date,Supplier,Amount,Receipt,Status\r\n";
                supplierPayments.forEach(payment => {
                    const paymentRemarks = remarks[`supplier_${payment.id}`] || 'No Status';
                    csvContent += `${payment.date},${payment.supplierName},${payment.amount},${payment.receipt || 'No Receipt'},${formatRemarks(paymentRemarks)}\r\n`;
                });
                csvContent += "\r\n";
                
                // Salary Payments
                csvContent += "SALARY PAYMENTS\r\n";
                csvContent += "Date,Staff Name,Paid For Month,Advance,Salary,Total,Status\r\n";
                salaryPayments.forEach(salary => {
                    const salaryRemarks = remarks[`salary_${salary.id}`] || 'No Status';
                    csvContent += `${salary.date},${salary.staffName},${salary.salaryForMonth},${salary.advanceAmount},${salary.salaryAmount},${salary.totalAmount},${formatRemarks(salaryRemarks)}\r\n`;
                });
                csvContent += "\r\n";
                
                // Staff Data
                csvContent += "STAFF DATA\r\n";
                csvContent += "Name,Staff ID,Role,Salary,Phone,Email,Join Date\r\n";
                staffMembers.forEach(staff => {
                    csvContent += `${staff.name},${staff.staffId},${staff.role},${staff.salary || 0},${staff.phone || ''},${staff.email || ''},${staff.joinDate}\r\n`;
                });
                
                // Summary
                csvContent += "\r\nFINANCIAL SUMMARY\r\n";
                const totalSales = sales.reduce((sum, sale) => sum + sale.salesRate, 0);
                const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
                const totalProfit = totalSales - totalExpenses;
                csvContent += `Total Sales,AED ${totalSales.toLocaleString()}\r\n`;
                csvContent += `Total Expenses,AED ${totalExpenses.toLocaleString()}\r\n`;
                csvContent += `Net Profit,AED ${totalProfit.toLocaleString()}\r\n`;
                csvContent += `Profit Margin,${totalSales > 0 ? ((totalProfit / totalSales * 100).toFixed(2)) : 0}%\r\n`;
                
                // Create download link
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `hawk-financial-data-${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            // Clear all data
            function setupClearData() {
                document.getElementById('clearAllData').addEventListener('click', function() {
                    if (confirm('Are you sure you want to clear ALL data? This action cannot be undone and will delete all expenses, sales, supplier payments, staff members, salary payments, and remarks.')) {
                        localStorage.clear();
                        expenses = [];
                        sales = [];
                        supplierPayments = [];
                        staffMembers = [];
                        salaryPayments = [];
                        remarks = {};
                        
                        // Reset all tables and stats
                        renderExpensesTable();
                        renderSalesTable();
                        renderSupplierPaymentsTable();
                        renderStaffList();
                        renderSalaryTable();
                        updateDashboardStats();
                        updateAllProgressBars();
                        generateAutoNotes();
                        generateTransactionReports('all');
                    }
                });
            }

            function updateAllCharts() {
                updateTrendsChart('7d'); // Always update to 7D view
                updateAllProgressBars();
            }

            // Generate transaction reports
            function generateTransactionReports(type) {
                const tableBody = document.getElementById('transactionReportsBody');
                tableBody.innerHTML = '';
                
                let allTransactions = [];
                
                // Collect all transactions
                sales.forEach(sale => {
                    const saleRemarks = remarks[`sale_${sale.id}`] || null;
                    allTransactions.push({
                        date: new Date(sale.date),
                        type: 'Sale',
                        description: `${sale.agency} - ${sale.service}`,
                        amount: sale.salesRate,
                        status: saleRemarks ? formatRemarks(saleRemarks) : 'No Status',
                        details: `Net: AED ${sale.netRate}, Profit: AED ${sale.profit}`
                    });
                });
                
                expenses.filter(e => e.type !== 'salary').forEach(expense => {
                    const expenseRemarks = remarks[`expense_${expense.id}`] || null;
                    allTransactions.push({
                        date: new Date(expense.date),
                        type: 'Expense',
                        description: `${expense.category}: ${expense.description}`,
                        amount: -expense.amount,
                        status: expenseRemarks ? formatRemarks(expenseRemarks) : 'No Status',
                        details: `Receipt: ${expense.receipt ? 'Yes' : 'No'}`
                    });
                });
                
                supplierPayments.forEach(payment => {
                    const paymentRemarks = remarks[`supplier_${payment.id}`] || null;
                    allTransactions.push({
                        date: new Date(payment.date),
                        type: 'Supplier Payment',
                        description: `Payment to ${payment.supplierName}`,
                        amount: -payment.amount,
                        status: paymentRemarks ? formatRemarks(paymentRemarks) : 'No Status',
                        details: `Receipt: ${payment.receipt ? 'Yes' : 'No'}`
                    });
                });
                
                salaryPayments.forEach(salary => {
                    const salaryRemarks = remarks[`salary_${salary.id}`] || null;
                    allTransactions.push({
                        date: new Date(salary.date),
                        type: 'Salary Payment',
                        description: `Salary for ${salary.staffName} - ${salary.salaryForMonth}`,
                        amount: -salary.totalAmount,
                        status: salaryRemarks ? formatRemarks(salaryRemarks) : 'No Status',
                        details: `Advance: AED ${salary.advanceAmount}, Salary: AED ${salary.salaryAmount}`
                    });
                });
                
                staffMembers.forEach(staff => {
                    allTransactions.push({
                        date: new Date(staff.joinDate),
                        type: 'Staff Update',
                        description: `${staff.name} (${staff.staffId}) - ${staff.role}`,
                        amount: staff.salary || 0,
                        status: 'Active',
                        details: `Phone: ${staff.phone || 'N/A'}, Email: ${staff.email || 'N/A'}`
                    });
                });
                
                // Filter by type
                if (type !== 'all') {
                    allTransactions = allTransactions.filter(t => {
                        if (type === 'sales') return t.type === 'Sale';
                        if (type === 'expenses') return t.type === 'Expense';
                        if (type === 'suppliers') return t.type === 'Supplier Payment';
                        if (type === 'salaries') return t.type === 'Salary Payment';
                        if (type === 'staff') return t.type === 'Staff Update';
                        return true;
                    });
                }
                
                // Sort by date (newest first)
                allTransactions.sort((a, b) => b.date - a.date);
                
                // Display transactions
                if (allTransactions.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No transactions found</td></tr>';
                    return;
                }
                
                allTransactions.forEach(transaction => {
                    const row = document.createElement('tr');
                    const formattedDate = transaction.date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                    
                    const amountClass = transaction.amount >= 0 ? 'profit-amount' : 'cost-amount';
                    const amountPrefix = transaction.amount >= 0 ? '+' : '-';
                    const displayAmount = Math.abs(transaction.amount);
                    
                    // FIXED: Reports page now shows badges without dropdown functionality
                    const typeClass = transaction.type.toLowerCase().replace(' ', '-');
                    const statusClass = transaction.status.toLowerCase().replace(' ', '-');
                    
                    row.innerHTML = `
                        <td>${formattedDate}</td>
                        <td><span class="remarks-badge remarks-${typeClass}" style="background: ${getStatusColor(transaction.type)}">${transaction.type}</span></td>
                        <td>${transaction.description}</td>
                        <td class="amount ${amountClass}">${amountPrefix}AED ${displayAmount.toFixed(2)}</td>
                        <td><span class="remarks-badge remarks-${statusClass}">${transaction.status}</span></td>
                        <td>${transaction.details}</td>
                    `;
                    
                    tableBody.appendChild(row);
                });
            }
            
            function getStatusColor(type) {
                switch(type) {
                    case 'Sale': return 'rgba(46, 125, 50, 0.15)';
                    case 'Expense': return 'rgba(198, 40, 40, 0.15)';
                    case 'Supplier Payment': return 'rgba(245, 124, 0, 0.15)';
                    case 'Salary Payment': return 'rgba(21, 101, 192, 0.15)';
                    case 'Staff Update': return 'rgba(139, 115, 85, 0.15)';
                    default: return 'rgba(141, 110, 99, 0.15)';
                }
            }

            // Auto-generated notes/reports
            function generateAutoNotes() {
                const notesContainer = document.getElementById('autoGeneratedNotes');
                const timestampElement = document.getElementById('notesTimestamp');
                
                if (!notesContainer) return;
                
                // Update timestamp
                const now = new Date();
                timestampElement.textContent = `Generated on ${now.toLocaleDateString()}`;
                
                // Clear existing notes
                notesContainer.innerHTML = '';
                
                // Generate notes based on data
                const notes = [];
                
                // 1. Financial Summary Note
                const totalSales = sales.reduce((sum, sale) => sum + sale.salesRate, 0);
                const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
                const totalProfit = totalSales - totalExpenses;
                const profitMargin = totalSales > 0 ? (totalProfit / totalSales * 100) : 0;
                
                notes.push({
                    title: 'Financial Summary',
                    content: `Total Revenue: AED ${totalSales.toLocaleString()}<br>Net Profit: AED ${totalProfit.toLocaleString()}<br>Profit Margin: ${profitMargin.toFixed(1)}%`,
                    type: totalProfit >= 0 ? 'success' : 'danger',
                    icon: 'fas fa-chart-line'
                });
                
                // 2. Recent Activity Note
                const recentExpenses = expenses.filter(e => {
                    const expenseDate = new Date(e.date);
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    return expenseDate >= thirtyDaysAgo;
                });
                
                const recentSales = sales.filter(s => {
                    const saleDate = new Date(s.date);
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    return saleDate >= thirtyDaysAgo;
                });
                
                notes.push({
                    title: 'Recent Activity',
                    content: `${recentExpenses.length} expenses recorded<br>${recentSales.length} sales completed<br>30-day period`,
                    type: 'info',
                    icon: 'fas fa-history'
                });
                
                // 3. Staff & Salaries Note
                if (staffMembers.length > 0) {
                    const totalSalaryExpense = salaryPayments.reduce((sum, s) => sum + s.totalAmount, 0);
                    notes.push({
                        title: 'Staff Management',
                        content: `${staffMembers.length} staff members<br>${salaryPayments.length} salary payments<br>AED ${totalSalaryExpense.toLocaleString()} total`,
                        type: 'warning',
                        icon: 'fas fa-users'
                    });
                }
                
                // 4. Supplier Payments Note
                if (supplierPayments.length > 0) {
                    const totalSupplierPayments = supplierPayments.reduce((sum, p) => sum + p.amount, 0);
                    notes.push({
                        title: 'Supplier Payments',
                        content: `${supplierPayments.length} payments<br>${new Set(supplierPayments.map(p => p.supplierName)).size} suppliers<br>AED ${totalSupplierPayments.toLocaleString()} total`,
                        type: 'info',
                        icon: 'fas fa-truck'
                    });
                }
                
                // Render notes in grid
                notes.forEach(note => {
                    const noteCard = document.createElement('div');
                    noteCard.className = 'report-card';
                    
                    noteCard.innerHTML = `
                        <h3>
                            <i class="${note.icon}" style="color: ${getColorByType(note.type)}; margin-right: 8px;"></i>
                            ${note.title}
                        </h3>
                        <div style="font-size: 14px; color: var(--dark); line-height: 1.5;">
                            ${note.content}
                        </div>
                    `;
                    
                    notesContainer.appendChild(noteCard);
                });
                
                // If no notes generated
                if (notes.length === 0) {
                    notesContainer.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: var(--gray); grid-column: 1 / -1;">
                            <i class="fas fa-chart-pie" style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;"></i>
                            <h3>No Data Available</h3>
                            <p>Start adding expenses, sales, and staff data to generate automated reports.</p>
                        </div>
                    `;
                }
            }

            function getColorByType(type) {
                switch(type) {
                    case 'success': return 'var(--success)';
                    case 'danger': return 'var(--danger)';
                    case 'warning': return 'var(--warning)';
                    case 'info': return 'var(--info)';
                    default: return 'var(--primary)';
                }
            }