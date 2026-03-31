const API_CONFIG = {
    URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
         ? 'http://localhost:5239/api' 
         : 'https://noor-muzdalifah.runasp.net/api'
};



function getAuthHeader() {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function apiFetch(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('token');



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
        // Errors (403, 400, net::ERR_CONNECTION_REFUSED) will be propagated!
        throw error;
    }
}



// Auth Actions
async function login(username, password, role) {
    try {
        const response = await fetch(`${API_CONFIG.URL}/Auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role })
        });

        if (response.ok) {
            const data = await response.json();
            // Data expected: { token, username, role }
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify({
                id: data.userId,
                username: data.username || username,
                role: data.role || role
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


