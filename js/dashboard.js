// Check Auth
const user = getUser();
if (!user) window.location.href = 'index.html';

document.getElementById('welcomeMsg').innerText = `${user.username} (${user.role})`;

// Role-based visibility
if (user.role === 'Admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('d-none'));
}

// Tab Switching (sidebar-based)
function switchTab(tab) {
    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navId = 'nav' + tab.charAt(0).toUpperCase() + tab.slice(1);
    const navEl = document.getElementById(navId);
    if (navEl) navEl.classList.add('active');

    // Update page title
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) {
        const titleKeys = {
            revenues: 'revenues',
            expenses: 'expenses',
            revenueList: 'revenue_list',
            expenseList: 'expense_list',
            customerProfile: 'customer_profile',
            summary: 'summary',
            profile: 'profile',
            userManagement: 'user_management'
        };
        titleEl.setAttribute('data-key', titleKeys[tab] || tab);
        applyTranslations();
    }

    // Toggle sections
    const allSections = [
        'revenuesSection', 'expensesSection', 'revenueListSection',
        'expenseListSection', 'summarySection', 'profileSection',
        'customerProfileSection', 'userManagementSection'
    ];
    allSections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('d-none');
    });
    document.getElementById(tab + 'Section').classList.remove('d-none');

    // Re-trigger animation
    const section = document.getElementById(tab + 'Section');
    section.classList.remove('section-animate');
    void section.offsetWidth;
    section.classList.add('section-animate');

    // Load data for relevant sections
    if (tab === 'summary') loadSummary();
    if (tab === 'revenueList') loadRevenues();
    if (tab === 'expenseList') loadExpenses();
    if (tab === 'profile') loadProfile();

    // Close sidebar on mobile
    if (window.innerWidth <= 1024) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }
}

// SUCCESS MESSAGE Helper
function showSuccess(msg) {
    const el = document.getElementById('successMsg');
    if (msg) {
        el.querySelector('span').innerText = msg;
    }
    el.style.display = 'flex';
    setTimeout(() => el.style.display = 'none', 3000);
}

// =============================================
// REVENUES
// =============================================
document.getElementById('revenueForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        clientName: document.getElementById('clientName').value,
        operationType: document.getElementById('opType').value,
        contractPrice: parseFloat(document.getElementById('contractPrice').value),
        offerPrice: parseFloat(document.getElementById('offerPrice').value),
        paidAmount: parseFloat(document.getElementById('paidAmount').value)
    };

    try {
        await apiFetch('/Revenues', 'POST', payload);
        showSuccess();
        e.target.reset();
        const revEl = document.getElementById('revenueAuto');
        const restEl = document.getElementById('restAuto');
        if (revEl) revEl.value = '';
        if (restEl) restEl.value = '';

        if (user.role !== 'Admin') {
            document.getElementById('revenueFormContainer').classList.add('d-none');
            setTimeout(() => document.getElementById('revenueFormContainer').classList.remove('d-none'), 2000);
        } else {
            loadRevenues();
        }
    } catch (err) { alert(err.message); }
});

// Auto Calculation for Revenue Form
function updateRevenueAutoCalculations() {
    const cp = parseFloat(document.getElementById('contractPrice')?.value || 0);
    const op = parseFloat(document.getElementById('offerPrice')?.value || 0);
    const paid = parseFloat(document.getElementById('paidAmount')?.value || 0);
    const profit = op - cp;
    const rest = op - paid;
    const revEl = document.getElementById('revenueAuto');
    const restEl = document.getElementById('restAuto');
    if (revEl) revEl.value = profit.toFixed(2);
    if (restEl) restEl.value = rest.toFixed(2);
}

document.getElementById('contractPrice')?.addEventListener('input', updateRevenueAutoCalculations);
document.getElementById('offerPrice')?.addEventListener('input', updateRevenueAutoCalculations);
document.getElementById('paidAmount')?.addEventListener('input', updateRevenueAutoCalculations);

async function loadRevenues() {
    if (user.role !== 'Admin') return;
    const searchEl = document.getElementById('revSearch');
    const fromEl = document.getElementById('revFrom');
    const toEl = document.getElementById('revTo');

    const search = searchEl ? searchEl.value : '';
    const from = fromEl ? fromEl.value : '';
    const to = toEl ? toEl.value : '';

    try {
        const reports = await apiFetch(`/Dashboard/reports?search=${search}&from=${from}&to=${to}`);
        renderGroupedRevenues(reports);
    } catch (err) { console.error("Error loading revenues:", err); }
}

function renderGroupedRevenues(reports) {
    const container = document.getElementById('revenueReportsContainer');
    if (!container) return;
    container.innerHTML = '';

    if (!reports || reports.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="ri-inbox-line"></i><p>No revenue records found</p></div>';
        return;
    }

    reports.forEach(report => {
        if (report.revenues.length === 0) return;
        const section = document.createElement('div');
        section.innerHTML = `
            <div class="month-group-header">
                <i class="ri-calendar-line"></i> ${report.monthName}
            </div>
            <div class="table-container month-group-table">
                <table>
                    <thead>
                        <tr>
                            <th data-key="client_name">Client</th>
                            <th data-key="operation_type">Type</th>
                            <th data-key="contract_price">Contract</th>
                            <th data-key="offer_price">Offer</th>
                            <th data-key="paid_amount">Paid</th>
                            <th data-key="remaining">Remaining</th>
                            <th data-key="revenue">Revenue</th>
                            <th data-key="rest">Rest</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.revenues.map(r => `
                            <tr class="clickable-row" onclick="openCustomerFromList('${r.clientName.replace(/'/g, "\\'")}')">
                                <td><strong>${r.clientName}</strong></td>
                                <td><span class="badge">${t(r.operationType.toLowerCase().replace(' ', '_'))}</span></td>
                                <td>${r.contractPrice.toFixed(2)}</td>
                                <td>${r.offerPrice.toFixed(2)}</td>
                                <td class="text-success">${r.paidAmount.toFixed(2)}</td>
                                <td class="text-danger">${r.remaining.toFixed(2)}</td>
                                <td class="text-success">${r.revenue.toFixed(2)}</td>
                                <td>${r.rest.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        container.appendChild(section);
    });
    applyTranslations();
}

// =============================================
// EXPENSES
// =============================================
document.getElementById('expenseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        expenseType: document.getElementById('expType').value,
        amount: parseFloat(document.getElementById('expAmount').value),
        notes: document.getElementById('expNotes').value
    };

    try {
        await apiFetch('/Expenses', 'POST', payload);
        showSuccess();
        e.target.reset();
        if (user.role !== 'Admin') {
            document.getElementById('expenseFormContainer').classList.add('d-none');
            setTimeout(() => document.getElementById('expenseFormContainer').classList.remove('d-none'), 2000);
        } else {
            loadExpenses();
        }
    } catch (err) { alert(err.message); }
});

async function loadExpenses() {
    if (user.role !== 'Admin') return;
    const searchEl = document.getElementById('expSearch');
    const fromEl = document.getElementById('expFrom');
    const toEl = document.getElementById('expTo');

    const search = searchEl ? searchEl.value : '';
    const from = fromEl ? fromEl.value : '';
    const to = toEl ? toEl.value : '';

    try {
        const reports = await apiFetch(`/Dashboard/reports?search=${search}&from=${from}&to=${to}`);
        renderGroupedExpenses(reports);
    } catch (err) { console.error("Error loading expenses:", err); }
}

function renderGroupedExpenses(reports) {
    const container = document.getElementById('expenseReportsContainer');
    if (!container) return;
    container.innerHTML = '';

    let hasExpenses = false;
    reports.forEach(report => {
        if (report.expenses.length === 0) return;
        hasExpenses = true;
        const section = document.createElement('div');
        section.innerHTML = `
            <div class="month-group-header">
                <i class="ri-calendar-line"></i> ${report.monthName}
            </div>
            <div class="table-container month-group-table">
                <table>
                    <thead>
                        <tr>
                            <th data-key="expense_type">Type</th>
                            <th data-key="amount">Amount</th>
                            <th data-key="notes">Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.expenses.map(e => `
                            <tr>
                                <td><span class="badge badge-expense">${t(e.expenseType.toLowerCase())}</span></td>
                                <td class="text-danger">${e.amount.toFixed(2)}</td>
                                <td>${e.notes || '—'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        container.appendChild(section);
    });

    if (!hasExpenses) {
        container.innerHTML = '<div class="empty-state"><i class="ri-inbox-line"></i><p>No expense records found</p></div>';
    }
    applyTranslations();
}

// =============================================
// SUMMARY
// =============================================
async function loadSummary() {
    const data = await apiFetch('/Dashboard/summary');
    document.getElementById('statTotalRev').innerText = `$${data.totalRevenue.toLocaleString()}`;
    document.getElementById('statTotalPaid').innerText = `$${data.totalPaid.toLocaleString()}`;
    document.getElementById('statTotalRem').innerText = `$${data.totalRemaining.toLocaleString()}`;
    document.getElementById('statTotalExp').innerText = `$${data.totalExpenses.toLocaleString()}`;
    document.getElementById('statNetProfit').innerText = `$${data.netProfit.toLocaleString()}`;
}

// =============================================
// PROFILE
// =============================================
function loadProfile() {
    document.getElementById('profileUsername').innerText = user.username || '—';
    document.getElementById('profileRole').innerText = user.role || '—';
    document.getElementById('profileUsernameVal').innerText = user.username || '—';
    document.getElementById('profileRoleVal').innerText = user.role || '—';

    if (user.expiration) {
        const exp = new Date(user.expiration);
        document.getElementById('profileExpiry').innerText = exp.toLocaleString();
    }

    // Color the role badge
    const badge = document.getElementById('profileRole');
    if (user.role === 'Admin') {
        badge.style.background = 'linear-gradient(135deg, var(--primary), var(--accent))';
    } else {
        badge.style.background = 'linear-gradient(135deg, var(--success), #059669)';
    }
}

// =============================================
// CUSTOMER PROFILE (Admin)
// =============================================
let allRevenueData = []; // cache for customer search

async function searchCustomers() {
    const query = document.getElementById('customerSearchInput')?.value?.trim() || '';
    const resultsContainer = document.getElementById('customerSearchResults');
    if (!resultsContainer) return;

    if (query.length < 1) {
        resultsContainer.innerHTML = '';
        document.getElementById('customerDetailCard')?.classList.add('d-none');
        return;
    }

    try {
        const reports = await apiFetch(`/Dashboard/reports?search=${query}`);
        // Collect all unique customers
        const customerMap = {};
        reports.forEach(report => {
            report.revenues.forEach(r => {
                const name = r.clientName;
                if (!customerMap[name]) {
                    customerMap[name] = { records: [], totalRest: 0, totalPaid: 0 };
                }
                customerMap[name].records.push({ ...r, monthName: report.monthName });
                customerMap[name].totalRest += (r.rest || 0);
                customerMap[name].totalPaid += (r.paidAmount || 0);
            });
        });

        const customers = Object.keys(customerMap);

        if (customers.length === 0) {
            resultsContainer.innerHTML = '<div class="empty-state" style="padding:1.5rem;"><i class="ri-user-unfollow-line"></i><p>No customers found</p></div>';
            return;
        }

        resultsContainer.innerHTML = customers.map(name => `
            <div class="customer-result-item" onclick="loadCustomerProfile('${name.replace(/'/g, "\\'")}')">
                <div class="customer-result-avatar"><i class="ri-user-3-line"></i></div>
                <div class="customer-result-info">
                    <strong>${name}</strong>
                    <span>${customerMap[name].records.length} record(s) — Rest: $${customerMap[name].totalRest.toFixed(2)}</span>
                </div>
                <i class="ri-arrow-right-s-line" style="color:var(--text-muted);font-size:1.25rem;"></i>
            </div>
        `).join('');

        // Cache the data
        allRevenueData = reports;

    } catch (err) { console.error("Error searching customers:", err); }
}

// Quick navigate from revenue list row click
function openCustomerFromList(clientName) {
    switchTab('customerProfile');
    const searchInput = document.getElementById('customerSearchInput');
    if (searchInput) searchInput.value = clientName;
    setTimeout(() => {
        searchCustomers().then(() => loadCustomerProfile(clientName));
    }, 100);
}

async function loadCustomerProfile(clientName) {
    const detailCard = document.getElementById('customerDetailCard');
    if (!detailCard) return;
    detailCard.classList.remove('d-none');

    // Fetch fresh data for this customer
    let reports;
    try {
        reports = await apiFetch(`/Dashboard/reports?search=${clientName}`);
    } catch (err) {
        reports = allRevenueData;
    }

    // Collect records for this client
    let records = [];
    reports.forEach(report => {
        report.revenues.forEach(r => {
            if (r.clientName === clientName) {
                records.push({ ...r, monthName: report.monthName });
            }
        });
    });

    const totalRest = records.reduce((s, r) => s + (r.rest || 0), 0);
    const totalPaid = records.reduce((s, r) => s + (r.paidAmount || 0), 0);
    const totalRevenue = records.reduce((s, r) => s + (r.revenue || 0), 0);

    document.getElementById('customerDetailName').innerText = clientName;
    document.getElementById('customerDetailStats').innerText =
        `${records.length} record(s)  •  Total Paid: $${totalPaid.toFixed(2)}  •  Total Rest: $${totalRest.toFixed(2)}  •  Total Revenue: $${totalRevenue.toFixed(2)}`;

    // Render records table
    const tableContainer = document.getElementById('customerRecordsTable');
    if (records.length === 0) {
        tableContainer.innerHTML = '<div class="empty-state"><i class="ri-inbox-line"></i><p>No records found</p></div>';
        return;
    }

    tableContainer.innerHTML = `
        <div class="table-container" style="margin-top:1.5rem;">
            <table>
                <thead>
                    <tr>
                        <th data-key="operation_type">Type</th>
                        <th data-key="contract_price">Contract</th>
                        <th data-key="offer_price">Offer</th>
                        <th data-key="paid_amount">Paid</th>
                        <th data-key="remaining">Remaining</th>
                        <th data-key="revenue">Revenue</th>
                        <th data-key="rest">Rest</th>
                        <th data-key="edit_record">Edit</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.map(r => `
                        <tr>
                            <td><span class="badge">${t(r.operationType.toLowerCase().replace(' ', '_'))}</span></td>
                            <td>${r.contractPrice.toFixed(2)}</td>
                            <td>${r.offerPrice.toFixed(2)}</td>
                            <td class="text-success">${r.paidAmount.toFixed(2)}</td>
                            <td class="text-danger">${r.remaining.toFixed(2)}</td>
                            <td class="text-success">${r.revenue.toFixed(2)}</td>
                            <td class="${r.rest > 0 ? 'text-danger' : 'text-success'}">${r.rest.toFixed(2)}</td>
                            <td>
                                <button class="btn-edit" onclick="openEditModal(${r.id}, '${r.clientName.replace(/'/g, "\\'")}', '${r.operationType}', ${r.contractPrice}, ${r.offerPrice}, ${r.paidAmount})">
                                    <i class="ri-edit-line"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    applyTranslations();
}

// =============================================
// EDIT MODAL
// =============================================
function openEditModal(id, clientName, opType, contractPrice, offerPrice, paidAmount) {
    document.getElementById('editRevId').value = id;
    document.getElementById('editClientName').value = clientName;
    document.getElementById('editOpType').value = opType;
    document.getElementById('editContractPrice').value = contractPrice;
    document.getElementById('editOfferPrice').value = offerPrice;
    document.getElementById('editPaidAmount').value = paidAmount;
    document.getElementById('editModal').classList.remove('d-none');
    applyTranslations();
}

function closeEditModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('editModal').classList.add('d-none');
}

async function saveEditedRevenue(e) {
    e.preventDefault();
    const id = document.getElementById('editRevId').value;
    const payload = {
        clientName: document.getElementById('editClientName').value,
        operationType: document.getElementById('editOpType').value,
        contractPrice: parseFloat(document.getElementById('editContractPrice').value),
        offerPrice: parseFloat(document.getElementById('editOfferPrice').value),
        paidAmount: parseFloat(document.getElementById('editPaidAmount').value)
    };

    try {
        await apiFetch(`/Revenues/${id}`, 'PUT', payload);
        closeEditModal();
        showSuccess();
        // Reload the customer profile
        const clientName = payload.clientName;
        loadCustomerProfile(clientName);
        loadRevenues();
    } catch (err) { alert(err.message || 'Error updating record'); }
}

// =============================================
// USER MANAGEMENT (Admin)
// =============================================
async function createNewUser(e) {
    e.preventDefault();
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newRole').value;

    if (!username || !password) return;

    try {
        await apiFetch('/Auth/register', 'POST', { username, password, role });
        showSuccess();
        document.getElementById('createUserForm').reset();
    } catch (err) { alert(err.message || 'Error creating user'); }
}

// =============================================
// INITIAL LOAD
// =============================================
if (user.role === 'Admin') {
    loadRevenues();
    loadExpenses();
}

// React to language changes
window.addEventListener('langChanged', () => {
    if (user.role === 'Admin') {
        loadRevenues();
        loadExpenses();
    }
    const summarySection = document.getElementById('summarySection');
    if (!summarySection.classList.contains('d-none')) {
        loadSummary();
    }
});
