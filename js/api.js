const API_CONFIG = {
    URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
         ? 'http://localhost:5239/api' 
         : '/api',
    USE_MOCK: false // Toggle this to true to force mock data even if backend is up
};

const MOCK_DATA = {
    user: {
        token: 'mock-token',
        username: 'DemoAdmin',
        role: 'Admin',
        expiration: new Date(Date.now() + 86400000).toISOString()
    },
    summary: {
        totalRevenue: 50000,
        totalPaid: 35000,
        totalRemaining: 15000,
        totalExpenses: 12000,
        netProfit: 23000
    },
    reports: [
        {
            monthName: 'January 2026',
            revenues: [
                { id: 1, clientName: 'Ahmed Ali', operationType: 'Visa', contractPrice: 1200, offerPrice: 1500, paidAmount: 1000, remaining: 500, revenue: 300, rest: 500, date: '2026-01-10' },
                { id: 2, clientName: 'Mohammed Hassan', operationType: 'Umrah', contractPrice: 1800, offerPrice: 2200, paidAmount: 2200, remaining: 0, revenue: 400, rest: 0, date: '2026-01-15' },
                { id: 3, clientName: 'Abdullah Omar', operationType: 'Work Contract', contractPrice: 3000, offerPrice: 3500, paidAmount: 2000, remaining: 1500, revenue: 500, rest: 1500, date: '2026-01-20' },
                { id: 4, clientName: 'Ahmed Ali', operationType: 'Hajj', contractPrice: 4000, offerPrice: 4800, paidAmount: 3000, remaining: 1800, revenue: 800, rest: 1800, date: '2026-01-25' }
            ],
            expenses: [
                { id: 1, expenseType: 'Salaries', amount: 5000, notes: 'Staff Salaries for January', date: '2026-01-30' },
                { id: 2, expenseType: 'Electricity', amount: 200, notes: 'Office Electricity Bill', date: '2026-01-05' },
                { id: 3, expenseType: 'Water', amount: 80, notes: 'Water Supply', date: '2026-01-06' }
            ]
        },
        {
            monthName: 'February 2026',
            revenues: [
                { id: 5, clientName: 'Khaled Ibrahim', operationType: 'Visa', contractPrice: 1000, offerPrice: 1300, paidAmount: 1300, remaining: 0, revenue: 300, rest: 0, date: '2026-02-02' },
                { id: 6, clientName: 'Ahmed Ali', operationType: 'Umrah', contractPrice: 2500, offerPrice: 3000, paidAmount: 1500, remaining: 1500, revenue: 500, rest: 1500, date: '2026-02-12' },
                { id: 7, clientName: 'Sami Youssef', operationType: 'Work Contract', contractPrice: 2200, offerPrice: 2800, paidAmount: 2800, remaining: 0, revenue: 600, rest: 0, date: '2026-02-25' }
            ],
            expenses: [
                { id: 4, expenseType: 'Salaries', amount: 5000, notes: 'Staff Salaries for February', date: '2026-02-28' },
                { id: 5, expenseType: 'Procedures', amount: 350, notes: 'Government Fees', date: '2026-02-10' },
                { id: 6, expenseType: 'Other', amount: 120, notes: 'Office Supplies', date: '2026-02-15' }
            ]
        }
    ]
};

function getAuthHeader() {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function apiFetch(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('token');

    // DEMO/MOCK MODE: If token is mock-token OR USE_MOCK is forced
    if (token === 'mock-token' || API_CONFIG.USE_MOCK) {
        console.log('Demo/Mock Mode: Using mock data for', endpoint);
        return getMockResponse(endpoint, method, body);
    }

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
    };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(`${API_CONFIG.URL}${endpoint}`, options);

        if (response.status === 401) {
            logout();
            return null;
        }

        if (response.status === 403) {
            throw new Error('Access Denied (403): You do not have permission for this action.');
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'API Error: ' + response.statusText }));
            throw new Error(error.message || 'API Error');
        }

        return response.status !== 204 ? await response.json() : null;

    } catch (error) {
        // If the error is a standard network error (backend down)
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            console.warn('Backend server is down at:', API_CONFIG.URL, ' - Falling back to mock data.');
            return getMockResponse(endpoint, method, body);
        }
        // For logic errors (403, 400), propagate them!
        throw error;
    }
}

function getMockResponse(endpoint, method, body) {
    return new Promise(resolve => {
        setTimeout(() => {
            if (endpoint.includes('/Auth/login')) resolve(MOCK_DATA.user);
            else if (endpoint.includes('/Auth/register')) resolve({ message: 'User created successfully' });
            else if (endpoint.includes('/Dashboard/summary')) resolve(MOCK_DATA.summary);
            else if (endpoint.includes('/Dashboard/reports')) {
                // Client-side search filtering for mock data
                const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
                const search = (urlParams.get('search') || '').toLowerCase();
                const startDate = urlParams.get('startDate') || urlParams.get('from');
                const endDate = urlParams.get('endDate') || urlParams.get('to');

                let filtered = MOCK_DATA.reports.map(report => ({
                    ...report,
                    revenues: report.revenues.filter(r => {
                        const matchesSearch = !search ||
                            r.clientName.toLowerCase().includes(search) ||
                            r.operationType.toLowerCase().includes(search) ||
                            (r.date || '').includes(search);
                        
                        const inDateRange = (!startDate || r.date >= startDate) &&
                                            (!endDate || r.date <= endDate);
                        
                        return matchesSearch && inDateRange;
                    }),
                    expenses: report.expenses.filter(e => {
                        const matchesSearch = !search ||
                            e.expenseType.toLowerCase().includes(search) ||
                            (e.notes || '').toLowerCase().includes(search) ||
                            (e.date || '').includes(search);

                        const inDateRange = (!startDate || e.date >= startDate) &&
                                            (!endDate || e.date <= endDate);

                        return matchesSearch && inDateRange;
                    })
                }));

                resolve(filtered);
            }
            else if (endpoint.includes('/Revenues') && method === 'GET') {
                // Flat list of all revenues
                const allRevs = MOCK_DATA.reports.flatMap(r => r.revenues);
                resolve(allRevs);
            }
            // For POST/PUT requests, return success
            else if (method === 'POST') resolve({ message: 'Mock Success' });
            else if (method === 'PUT') {
                // Simulate updating a record
                if (body && body.clientName) {
                    const id = parseInt(endpoint.split('/').pop());
                    MOCK_DATA.reports.forEach(report => {
                        report.revenues.forEach((r, i) => {
                            if (r.id === id) {
                                report.revenues[i] = {
                                    ...r,
                                    ...body,
                                    remaining: body.offerPrice - body.paidAmount,
                                    revenue: body.offerPrice - body.contractPrice,
                                    rest: body.offerPrice - body.paidAmount
                                };
                            }
                        });
                    });
                }
                resolve({ message: 'Updated Successfully' });
            }
            else if (endpoint.includes('/Auth/update-profile')) {
                resolve({ message: 'Profile updated successfully' });
            }
            else if (method === 'DELETE') resolve({ message: 'Deleted Successfully' });
            else resolve(null);
        }, 300);
    });
}

// Auth Actions
async function login(username, password, role) {
    try {
        const response = await fetch(`${API_CONFIG.URL}/Auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            // Data expected: { token, username, role }
            localStorage.setItem('token', data.token);
            // Ensure the role from the backend matches what the user selected (if you want to enforce it),
            // but usually we just trust the backend role.
            localStorage.setItem('user', JSON.stringify({
                username: data.username || username,
                role: data.role || role // Priority to backend role
            }));
            return true;
        }
        return false;
    } catch (e) {
        console.error('Login error:', e);
        return false;
    }
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

function getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Explicit Demo Login
// Explicit Demo Login
async function demoLogin(role = 'Admin') {
    const data = { ...MOCK_DATA.user }; // Clone
    data.role = role;
    data.username = role === 'Admin' ? 'DemoAdmin' : 'DemoUser';

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    return true;
}
