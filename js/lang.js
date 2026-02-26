let currentLang = localStorage.getItem('lang') || 'ar'; // default Arabic
let translations = {};

/* ── Language ─────────────────────────────── */
async function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';

    await fetchTranslations();
    applyTranslations();

    // Highlight active lang btn everywhere
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    window.dispatchEvent(new Event('langChanged'));
}

async function fetchTranslations() {
    try {
        const res = await fetch(`lang/${currentLang}.json`);
        translations = await res.json();
    } catch (e) {
        console.error('Could not load translations:', e);
    }
}

function applyTranslations() {
    document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        if (!translations[key]) return;

        if (el.tagName === 'INPUT') {
            el.placeholder = translations[key];
        } else {
            const icon = el.querySelector('i');
            if (icon) {
                el.innerHTML = '';
                el.appendChild(icon);
                el.appendChild(document.createTextNode(' ' + translations[key]));
            } else {
                el.innerText = translations[key];
            }
        }
    });
}

/* ── Theme ────────────────────────────────── */
function setTheme(theme) {
    // theme: 'light' | 'dark' | 'system'
    localStorage.setItem('theme', theme);
    applyTheme(theme);

    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}

function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
        root.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
        root.setAttribute('data-theme', 'light');
    } else {
        // system
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
}

/* ── Initial Load ─────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    // Apply saved theme first to avoid flash
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    // Load language
    await setLang(currentLang);
});

/* ── Translation helper ───────────────────── */
function t(key) {
    return translations[key] || key;
}

/* ── Logout ───────────────────────────────── */
function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}
