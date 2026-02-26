const API_URL = 'http://localhost:5239/api';

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
                { id: 1, clientName: 'Ahmed Ali', operationType: 'Visa', contractPrice: 1200, offerPrice: 1500, paidAmount: 1000, remaining: 500, revenue: 300, rest: 500 },
                { id: 2, clientName: 'Mohammed Hassan', operationType: 'Umrah', contractPrice: 1800, offerPrice: 2200, paidAmount: 2200, remaining: 0, revenue: 400, rest: 0 },
                { id: 3, clientName: 'Abdullah Omar', operationType: 'Work Contract', contractPrice: 3000, offerPrice: 3500, paidAmount: 2000, remaining: 1500, revenue: 500, rest: 1500 },
                { id: 4, clientName: 'Ahmed Ali', operationType: 'Hajj', contractPrice: 4000, offerPrice: 4800, paidAmount: 3000, remaining: 1800, revenue: 800, rest: 1800 }
            ],
            expenses: [
                { id: 1, expenseType: 'Salaries', amount: 5000, notes: 'Staff Salaries for January' },
                { id: 2, expenseType: 'Electricity', amount: 200, notes: 'Office Electricity Bill' },
                { id: 3, expenseType: 'Water', amount: 80, notes: 'Water Supply' }
            ]
        },
        {
            monthName: 'February 2026',
            revenues: [
                { id: 5, clientName: 'Khaled Ibrahim', operationType: 'Visa', contractPrice: 1000, offerPrice: 1300, paidAmount: 1300, remaining: 0, revenue: 300, rest: 0 },
                { id: 6, clientName: 'Ahmed Ali', operationType: 'Umrah', contractPrice: 2500, offerPrice: 3000, paidAmount: 1500, remaining: 1500, revenue: 500, rest: 1500 },
                { id: 7, clientName: 'Sami Youssef', operationType: 'Work Contract', contractPrice: 2200, offerPrice: 2800, paidAmount: 2800, remaining: 0, revenue: 600, rest: 0 }
            ],
            expenses: [
                { id: 4, expenseType: 'Salaries', amount: 5000, notes: 'Staff Salaries for February' },
                { id: 5, expenseType: 'Procedures', amount: 350, notes: 'Government Fees' },
                { id: 6, expenseType: 'Other', amount: 120, notes: 'Office Supplies' }
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

    // DEMO MODE: If we are using the mock token, bypass network entirely
    if (token === 'mock-token') {
        console.log('Demo Mode: Using mock data for', endpoint);
        return getMockResponse(endpoint, method, body);
    }

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
        }
    };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);

        if (response.status === 401) {
            logout();
            return null;
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'API Error');
        }

        return response.status !== 204 ? await response.json() : null;

    } catch (error) {
        console.warn('Backend unavailable or error, using mock data for:', endpoint);
        return getMockResponse(endpoint, method, body);
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

                let filtered = MOCK_DATA.reports.map(report => ({
                    ...report,
                    revenues: report.revenues.filter(r =>
                        !search ||
                        r.clientName.toLowerCase().includes(search) ||
                        r.operationType.toLowerCase().includes(search)
                    ),
                    expenses: report.expenses.filter(e =>
                        !search ||
                        e.expenseType.toLowerCase().includes(search) ||
                        (e.notes || '').toLowerCase().includes(search)
                    )
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
            else if (method === 'DELETE') resolve({ message: 'Deleted Successfully' });
            else resolve(null);
        }, 300);
    });
}

// Auth Actions
async function login(username, password, role) {
    try {
        const data = await apiFetch('/Auth/login', 'POST', { username, password, role });
        if (data) {
            localStorage.setItem('token', data.token);
            // Ensure we store the role passed in if the mock doesn't dynamic it, 
            // but our MOCK_DATA has 'Admin'. Let's override it with the requested role for better demo user exp
            if (data.token === 'mock-token') {
                data.role = role || 'Admin';
                data.username = username || 'DemoUser';
            }
            localStorage.setItem('user', JSON.stringify(data));
            return true;
        }
    } catch (e) {
        console.error(e);
    }
    return false;
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
