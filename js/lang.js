let currentLang = localStorage.getItem('lang') || 'ar'; // Default to Arabic
let translations = {};

async function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;

    await fetchTranslations();
    applyTranslations();
    updateRTLStyles();

    // Notify other scripts to re-render dynamic content (like tables)
    window.dispatchEvent(new Event('langChanged'));
}

async function fetchTranslations() {
    try {
        const response = await fetch(`lang/${currentLang}.json`);
        translations = await response.json();
    } catch (e) {
        console.error("Could not load translations", e);
    }
}

function applyTranslations() {
    document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        if (translations[key]) {
            if (el.tagName === 'INPUT') {
                el.placeholder = translations[key];
            } else {
                // Check if element has an icon to preserve
                const icon = el.querySelector('i');
                if (icon) {
                    el.innerHTML = '';
                    el.appendChild(icon);
                    el.appendChild(document.createTextNode(' ' + translations[key]));
                } else {
                    el.innerText = translations[key];
                }
            }
        }
    });
}

function updateRTLStyles() {
    if (currentLang === 'ar') {
        document.body.dir = 'rtl';
        // Adjust inputs with icons
        document.querySelectorAll('.form-control').forEach(el => {
            if (el.style.paddingLeft === '2.8rem') {
                el.style.paddingLeft = '';
                el.style.paddingRight = '2.8rem';
            }
        });
        // Adjust icons
        document.querySelectorAll('.ri-user-line, .ri-lock-line, .ri-briefcase-line, .ri-search-line').forEach(el => {
            el.style.left = 'auto';
            el.style.right = '1rem';
        });
    } else {
        document.body.dir = 'ltr';
        document.querySelectorAll('.form-control').forEach(el => {
            if (el.style.paddingRight === '2.8rem') {
                el.style.paddingRight = '';
                el.style.paddingLeft = '2.8rem';
            }
        });
        document.querySelectorAll('.ri-user-line, .ri-lock-line, .ri-briefcase-line, .ri-search-line').forEach(el => {
            el.style.right = 'auto';
            el.style.left = '1rem';
        });
    }
}

// Initial load
document.addEventListener('DOMContentLoaded', async () => {
    await setLang(currentLang);
});

function t(key) {
    return translations[key] || key;
}

function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}
