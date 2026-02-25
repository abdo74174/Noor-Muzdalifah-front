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
                { clientName: 'Mock Client A (Visa)', operationType: 'Visa', contractPrice: 1500, offerPrice: 1500, paidAmount: 1000, remaining: 500 },
                { clientName: 'Mock Client B (Umrah)', operationType: 'Umrah', contractPrice: 2000, offerPrice: 2200, paidAmount: 2200, remaining: 0 }
            ],
            expenses: [
                { expenseType: 'Salaries', amount: 5000, notes: 'Staff Salaries' },
                { expenseType: 'Electricity', amount: 200, notes: 'Office Light' }
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
    // Simulate network delay
    return new Promise(resolve => {
        setTimeout(() => {
            if (endpoint.includes('/Auth/login')) resolve(MOCK_DATA.user);
            else if (endpoint.includes('/Dashboard/summary')) resolve(MOCK_DATA.summary);
            else if (endpoint.includes('/Dashboard/reports')) resolve(MOCK_DATA.reports);

            // For POST requests (Add Revenue/Expense), just return success
            else if (method === 'POST') resolve({ message: 'Mock Success' });

            else resolve(null);
        }, 500);
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
