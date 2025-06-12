// js/i18n.js

window.i18nInitialized = new Promise((resolve, reject) => {
  window.i18nResolve = resolve;
  window.i18nReject = reject;
});

// Function to get user's language preference from Supabase
async function getUserLangPreference() {
  if (!window._supabase) {
    console.warn('Supabase client not available for getting lang pref.');
    return null;
  }
  try {
    const { data: { user } } = await window._supabase.auth.getUser();
    if (user) {
      const { data: profile, error } = await window._supabase
        .from('profiles')
        .select('preferred_ui_language')
        .eq('id', user.id)
        .single();
      if (error) {
        console.error('Error fetching language preference:', error.message);
        return null;
      }
      return profile && profile.preferred_ui_language ? profile.preferred_ui_language : null;
    }
  } catch (e) {
    console.error('Exception fetching language preference:', e);
  }
  return null;
}

// Function to save user's language preference to Supabase
async function saveUserLangPreference(lang) {
  if (!window._supabase) {
    console.warn('Supabase client not available for saving lang pref.');
    return;
  }
  try {
    const { data: { user } } = await window._supabase.auth.getUser();
    if (user) {
      const { error } = await window._supabase
        .from('profiles')
        .update({ preferred_ui_language: lang })
        .eq('id', user.id);
      if (error) {
        console.error('Error saving language preference:', error.message);
      } else {
        console.log('Language preference saved to Supabase:', lang);
      }
    }
  } catch (e) {
    console.error('Exception saving language preference:', e);
  }
}

// i18next initialization
async function initI18n() {
  try {
    let preferredLang = localStorage.getItem('preferredLang'); // Get from localStorage first
    if (!preferredLang && window._supabase) { // If not in localStorage, try Supabase
        const userLang = await getUserLangPreference();
        if (userLang) preferredLang = userLang;
    }
    if (!preferredLang) preferredLang = 'en'; // Default to English

    // Determine resource path
    const isIndexPage = window.location.pathname === '/' || window.location.pathname.endsWith('/index.html') || window.location.pathname.endsWith('/');
    const basePath = isIndexPage ? '' : '../';
    
    const enResources = await fetch(`${basePath}locales/en.json`).then(res => res.json());
    const deResources = await fetch(`${basePath}locales/de.json`).then(res => res.json());

    await i18next.init({
      lng: preferredLang,
      debug: true,
      resources: {
        en: { translation: enResources },
        de: { translation: deResources }
      },
      fallbackLng: 'en'
    });
    updateContent();
    updateLanguageSelector(preferredLang); // Update selector to current language
    if (window.i18nResolve) {
      window.i18nResolve();
      window.i18nResolve = null; // Clean up
      window.i18nReject = null; // Clean up
    }
  } catch (error) {
    console.error('Error initializing i18next:', error);
    if (window.i18nReject) {
      window.i18nReject(error);
      window.i18nResolve = null; // Clean up
      window.i18nReject = null; // Clean up
    }
    updateContentDirectlyIfAble();
  }
}

function updateContent() {
  if (!i18next.isInitialized) {
    console.warn('i18next not initialized, attempting direct update.');
    updateContentDirectlyIfAble();
    return;
  }
  const pageTitleKey = document.querySelector('title[data-i18n-title]')?.getAttribute('data-i18n-title');
  if (pageTitleKey) {
    document.title = i18next.t(pageTitleKey);
  }

  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
        
    if (key.startsWith('[') && key.includes(']')) {
        const attrMatch = key.match(/\[(.*?)\](.*)/);
        if (attrMatch && attrMatch.length === 3) {
            const attrName = attrMatch[1];
            const actualKey = attrMatch[2];
            const attrTranslation = i18next.t(actualKey);
            el.setAttribute(attrName, attrTranslation);
            // If an attribute was specifically targeted, do not attempt to set innerHTML with the [attr]key
            return; 
        }
    }

    // If not an attribute-specific key, proceed to get the translation for innerHTML/value/placeholder
    let translation = i18next.t(key);

    // Basic interpolation for count - can be expanded
    if (el.dataset.i18nCount) { // Corrected from i118nCount
        translation = i18next.t(key, { count: parseInt(el.dataset.i18nCount) });
    }
    // Add more complex interpolation logic here if needed based on element data attributes

    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      if (el.type === 'submit' || el.type === 'button') {
        el.value = translation;
      } else {
        el.placeholder = translation;
      }
    } else {
      el.innerHTML = translation;
    }
  });
}

function updateContentDirectlyIfAble() {
  // Fallback logic (simplified)
  const pageTitleKey = document.querySelector('title[data-i18n-title]')?.getAttribute('data-i18n-title');
  if (pageTitleKey) document.title = pageTitleKey; // Show key as title
}

function updateLanguageSelector(lang) {
  const selector = document.getElementById('languageSelector');
  if (selector) {
    selector.value = lang;
  }
}

window.i18next = i18next;
window.updateContent = updateContent;
window.changeLanguage = async (lang) => {
  if (!i18next.isInitialized) {
    console.error('i18next not initialized. Cannot change language.');
    return;
  }
  await i18next.changeLanguage(lang);
  localStorage.setItem('preferredLang', lang); // Save to localStorage
  await saveUserLangPreference(lang); // Save to Supabase
  updateContent();
  updateLanguageSelector(lang);
};

initI18n(); // Call initialization
