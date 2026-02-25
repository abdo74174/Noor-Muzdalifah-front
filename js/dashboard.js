// Check Auth
const user = getUser();
if (!user) window.location.href = 'index.html';

document.getElementById('welcomeMsg').innerText = `Hello, ${user.username} (${user.role})`;

// Role-based visibility
if (user.role === 'Admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('d-none'));
} else {
    // Users can only add data, forms are shown by default
}

// Tab Switching
function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tab.slice(0, 3) + 'Tab').classList.add('active');

    document.getElementById('revenuesSection').classList.add('d-none');
    document.getElementById('expensesSection').classList.add('d-none');
    document.getElementById('summarySection').classList.add('d-none');

    document.getElementById(tab + 'Section').classList.remove('d-none');

    if (tab === 'summary') loadSummary();
}

// SUCCESS MESSAGE Helper
function showSuccess() {
    const el = document.getElementById('successMsg');
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
}

// --- REVENUES ---
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
        if (user.role !== 'Admin') {
            // "Hide the row from the screen" - technically hides the form since they only add
            document.getElementById('revenueFormContainer').classList.add('d-none');
            setTimeout(() => document.getElementById('revenueFormContainer').classList.remove('d-none'), 2000);
        } else {
            loadRevenues();
        }
    } catch (err) { alert(err.message); }
});

async function loadRevenues() {
    if (user.role !== 'Admin') return;
    const searchEl = document.getElementById('revSearch');
    const fromEl = document.getElementById('revFrom');
    const toEl = document.getElementById('revTo');

    const search = searchEl ? searchEl.value : '';
    const from = fromEl ? fromEl.value : '';
    const to = toEl ? toEl.value : '';

    try {
        const reports = await apiFetch(`/Dashboard/reports?from=${from}&to=${to}`);
        renderGroupedRevenues(reports);
    } catch (err) { console.error("Error loading revenues:", err); }
}

function renderGroupedRevenues(reports) {
    const container = document.getElementById('revenueReportsContainer');
    if (!container) return;
    container.innerHTML = '';

    reports.forEach(report => {
        const section = document.createElement('div');
        section.innerHTML = `
            <div class="month-group-header">${report.monthName}</div>
            <div class="table-container month-group-table">
                <table>
                    <thead>
                        <tr>
                            <th data-key="client_name">Client</th>
                            <th data-key="operation_type">Type</th>
                            <th data-key="offer_price">Offer</th>
                            <th data-key="paid_amount">Paid</th>
                            <th data-key="remaining">Rem</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.revenues.map(r => `
                            <tr>
                                <td>${r.clientName}</td>
                                <td>${t(r.operationType.toLowerCase().replace(' ', '_'))}</td>
                                <td>${r.offerPrice.toFixed(2)}</td>
                                <td>${r.paidAmount.toFixed(2)}</td>
                                <td class="text-danger">${r.remaining.toFixed(2)}</td>
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

// --- EXPENSES ---
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
    const search = searchEl ? searchEl.value : '';

    try {
        const reports = await apiFetch(`/Dashboard/reports`);
        renderGroupedExpenses(reports);
    } catch (err) { console.error("Error loading expenses:", err); }
}

function renderGroupedExpenses(reports) {
    const container = document.getElementById('expenseReportsContainer');
    if (!container) return;
    container.innerHTML = '';
    reports.forEach(report => {
        if (report.expenses.length === 0) return;
        const section = document.createElement('div');
        section.innerHTML = `
            <div class="month-group-header">${report.monthName}</div>
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
                                <td>${t(e.expenseType.toLowerCase())}</td>
                                <td>${e.amount.toFixed(2)}</td>
                                <td>${e.notes || ''}</td>
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

// --- SUMMARY ---
async function loadSummary() {
    const data = await apiFetch('/Dashboard/summary');
    document.getElementById('statTotalRev').innerText = `$${data.totalRevenue.toLocaleString()}`;
    document.getElementById('statTotalPaid').innerText = `$${data.totalPaid.toLocaleString()}`;
    document.getElementById('statTotalRem').innerText = `$${data.totalRemaining.toLocaleString()}`;
    document.getElementById('statTotalExp').innerText = `$${data.totalExpenses.toLocaleString()}`;
    document.getElementById('statNetProfit').innerText = `$${data.netProfit.toLocaleString()}`;
}

// Initial Data Load
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
    // Also re-load summary if it's visible or just apply translations
    const summarySection = document.getElementById('summarySection');
    if (!summarySection.classList.contains('d-none')) {
        loadSummary();
    }
});
