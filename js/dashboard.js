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
            userManagement: 'user_management',
            settings: 'settings'
        };
        titleEl.setAttribute('data-key', titleKeys[tab] || tab);
        applyTranslations();
    }

    // Toggle sections
    const allSections = [
        'revenuesSection', 'expensesSection', 'revenueListSection',
        'expenseListSection', 'summarySection', 'profileSection',
        'customerProfileSection', 'userManagementSection', 'settingsSection'
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
    if (tab === 'settings') syncSettingsUI();

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

// Toggle fields for "Ticket" type
function toggleTicketFields() {
    const opType = document.getElementById('opType').value;
    const paidGroup = document.getElementById('paidAmountGroup');
    const restGroup = document.getElementById('restGroup');
    const paidInput = document.getElementById('paidAmount');

    if (opType === 'Ticket') {
        paidGroup?.classList.add('d-none');
        restGroup?.classList.add('d-none');
        // Auto-fill paid amount to match offer price for tickets
        const offerPrice = parseFloat(document.getElementById('offerPrice').value || 0);
        if (paidInput) paidInput.value = offerPrice;
        paidInput.removeAttribute('required');
    } else {
        paidGroup?.classList.remove('d-none');
        restGroup?.classList.remove('d-none');
        paidInput.setAttribute('required', '');
    }
    updateRevenueAutoCalculations();
}

document.getElementById('opType')?.addEventListener('change', toggleTicketFields);
document.getElementById('offerPrice')?.addEventListener('input', () => {
    if (document.getElementById('opType').value === 'Ticket') {
        document.getElementById('paidAmount').value = document.getElementById('offerPrice').value;
    }
});

// ── Date mode state ──────────────────────────
let revDateMode = 'day';   // 'day' | 'range'
let expDateMode = 'day';

function setRevMode(mode) {
    revDateMode = mode;
    const dayBtn = document.getElementById('revModeDay');
    const rangeBtn = document.getElementById('revModeRange');
    const dayPic = document.getElementById('revDayPicker');
    const rFrom = document.getElementById('revRangeFrom');
    const rTo = document.getElementById('revRangeTo');

    if (mode === 'day') {
        dayBtn?.classList.add('active');
        rangeBtn?.classList.remove('active');
        dayPic?.classList.remove('d-none');
        rFrom?.classList.add('d-none');
        rTo?.classList.add('d-none');
        // clear range inputs
        if (document.getElementById('revFrom')) document.getElementById('revFrom').value = '';
        if (document.getElementById('revTo')) document.getElementById('revTo').value = '';
    } else {
        rangeBtn?.classList.add('active');
        dayBtn?.classList.remove('active');
        dayPic?.classList.add('d-none');
        rFrom?.classList.remove('d-none');
        rTo?.classList.remove('d-none');
        // clear single-day input
        if (document.getElementById('revDay')) document.getElementById('revDay').value = '';
    }
    loadRevenues();
}

function clearRevDates() {
    ['revDay', 'revFrom', 'revTo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    loadRevenues();
}

function setExpMode(mode) {
    expDateMode = mode;
    const dayBtn = document.getElementById('expModeDay');
    const rangeBtn = document.getElementById('expModeRange');
    const dayPic = document.getElementById('expDayPicker');
    const rFrom = document.getElementById('expRangeFrom');
    const rTo = document.getElementById('expRangeTo');

    if (mode === 'day') {
        dayBtn?.classList.add('active');
        rangeBtn?.classList.remove('active');
        dayPic?.classList.remove('d-none');
        rFrom?.classList.add('d-none');
        rTo?.classList.add('d-none');
        if (document.getElementById('expFrom')) document.getElementById('expFrom').value = '';
        if (document.getElementById('expTo')) document.getElementById('expTo').value = '';
    } else {
        rangeBtn?.classList.add('active');
        dayBtn?.classList.remove('active');
        dayPic?.classList.add('d-none');
        rFrom?.classList.remove('d-none');
        rTo?.classList.remove('d-none');
        if (document.getElementById('expDay')) document.getElementById('expDay').value = '';
    }
    loadExpenses();
}

function clearExpDates() {
    ['expDay', 'expFrom', 'expTo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    loadExpenses();
}
// ─────────────────────────────────────────────

async function loadRevenues() {
    if (user.role !== 'Admin') return;
    const search = document.getElementById('revSearch')?.value || '';

    let from = '', to = '';
    if (revDateMode === 'day') {
        const day = document.getElementById('revDay')?.value || '';
        from = day;
        to = day;   // same day = exact date filter
    } else {
        from = document.getElementById('revFrom')?.value || '';
        to = document.getElementById('revTo')?.value || '';
    }

    try {
        const reports = await apiFetch(`/Dashboard/reports?search=${search}&from=${from}&to=${to}`);
        renderGroupedRevenues(reports);
    } catch (err) { console.error('Error loading revenues:', err); }
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
    const search = document.getElementById('expSearch')?.value || '';

    let from = '', to = '';
    if (expDateMode === 'day') {
        const day = document.getElementById('expDay')?.value || '';
        from = day;
        to = day;
    } else {
        from = document.getElementById('expFrom')?.value || '';
        to = document.getElementById('expTo')?.value || '';
    }

    try {
        const reports = await apiFetch(`/Dashboard/expenses?search=${search}&from=${from}&to=${to}`);
        renderGroupedExpenses(reports);
    } catch (err) { console.error('Error loading expenses:', err); }
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

    // Set current values in edit form
    const nameInput = document.getElementById('newAdminName');
    if (nameInput) nameInput.value = user.username || '';
}

function scrollToEditProfile() {
    const card = document.getElementById('adminEditCard');
    if (!card) return;

    // If already visible, just scroll & focus
    if (!card.classList.contains('d-none')) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const nameInput = document.getElementById('newAdminName');
        if (nameInput) setTimeout(() => nameInput.focus(), 300);
        return;
    }

    // Reveal with animation
    card.classList.remove('d-none');
    card.style.opacity = '0';
    card.style.transform = 'translateY(16px)';
    card.style.transition = 'opacity 0.35s ease, transform 0.35s ease';

    // Trigger animation on next frame
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });
    });

    // Scroll smoothly to it
    setTimeout(() => {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);

    // Highlight the card border as a pulse
    setTimeout(() => {
        card.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.45), 0 8px 30px rgba(99,102,241,0.15)';
        setTimeout(() => { card.style.boxShadow = ''; }, 1600);
    }, 350);

    // Focus the name input
    const nameInput = document.getElementById('newAdminName');
    if (nameInput) setTimeout(() => nameInput.focus(), 500);
}

async function updateAdminProfile(e) {
    e.preventDefault();
    const newUsername = document.getElementById('newAdminName').value.trim();
    const newPassword = document.getElementById('newAdminPassword').value;

    if (!newUsername || !newPassword) return;

    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.7';
    }

    try {
        await apiFetch('/Auth/update-profile', 'PUT', { username: newUsername, password: newPassword });

        // Update local user object in memory and storage
        user.username = newUsername;
        localStorage.setItem('user', JSON.stringify(user));

        // Refresh profile display without full reload
        document.getElementById('profileUsername').innerText = newUsername;
        document.getElementById('profileUsernameVal').innerText = newUsername;
        document.getElementById('welcomeMsg').innerText = `${newUsername} (${user.role})`;

        // Clear password field for security
        document.getElementById('newAdminPassword').value = '';

        showSuccess();

    } catch (err) {
        alert(err.message || 'Error updating profile');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '';
        }
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

    // Toggle fields for edit modal if Ticket
    const paidGroup = document.getElementById('editPaidAmountGroup');
    const paidInput = document.getElementById('editPaidAmount');
    if (opType === 'Ticket') {
        paidGroup?.classList.add('d-none');
        paidInput.removeAttribute('required');
    } else {
        paidGroup?.classList.remove('d-none');
        paidInput.setAttribute('required', '');
    }

    document.getElementById('editModal').classList.remove('d-none');
    applyTranslations();
}

// Handler for edit modal type change
document.getElementById('editOpType')?.addEventListener('change', (e) => {
    const paidGroup = document.getElementById('editPaidAmountGroup');
    const paidInput = document.getElementById('editPaidAmount');
    if (e.target.value === 'Ticket') {
        paidGroup?.classList.add('d-none');
        paidInput.value = document.getElementById('editOfferPrice').value;
        paidInput.removeAttribute('required');
    } else {
        paidGroup?.classList.remove('d-none');
        paidInput.setAttribute('required', '');
    }
});

document.getElementById('editOfferPrice')?.addEventListener('input', (e) => {
    if (document.getElementById('editOpType').value === 'Ticket') {
        document.getElementById('editPaidAmount').value = e.target.value;
    }
});

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
    syncSettingsUI();
});

// =============================================
// SETTINGS
// =============================================
function syncSettingsUI() {
    const lang = localStorage.getItem('lang') || 'ar';
    const theme = localStorage.getItem('theme') || 'light';

    // Sync language buttons
    document.querySelectorAll('.settings-option-btn[data-lang]').forEach(btn => {
        const active = btn.dataset.lang === lang;
        btn.classList.toggle('settings-option-active', active);
    });

    // Sync theme buttons
    document.querySelectorAll('.settings-option-btn.theme-btn').forEach(btn => {
        const active = btn.dataset.theme === theme;
        btn.classList.toggle('settings-option-active', active);
    });
}

