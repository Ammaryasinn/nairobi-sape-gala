// Theme Toggle Functionality
// Handles switching between dark and light themes with localStorage persistence

(function() {
    'use strict';
    
    const STORAGE_KEY = 'nairobi-sape-theme';
    const THEME_LIGHT = 'light';
    const THEME_DARK = 'dark';
    
    // Moon icon for dark theme
    const moonIcon = `
        <svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
    `;
    
    // Sun icon for light theme  
    const sunIcon = `
        <svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
    `;
    
    // Get current theme from localStorage or default to dark
    function getCurrentTheme() {
        return localStorage.getItem(STORAGE_KEY) || THEME_DARK;
    }
    
    // Set theme on document
    function setTheme(theme) {
        if (theme === THEME_LIGHT) {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        localStorage.setItem(STORAGE_KEY, theme);
        updateToggleButton(theme);
    }
    
    // Update toggle button appearance and text
    function updateToggleButton(theme) {
        const toggleBtn = document.getElementById('themeToggle');
        if (!toggleBtn) return;
        
        const themeText = toggleBtn.querySelector('.theme-text');
        const iconContainer = toggleBtn.querySelector('.theme-icon').parentElement;
        
        if (theme === THEME_LIGHT) {
            // Currently light, show option to switch to dark
            iconContainer.innerHTML = moonIcon;
            if (themeText) themeText.textContent = 'Dark';
        } else {
            // Currently dark, show option to switch to light
            iconContainer.innerHTML = sunIcon;
            if (themeText) themeText.textContent = 'Light';
        }
    }
    
    // Toggle between themes
    function toggleTheme() {
        const currentTheme = getCurrentTheme();
        const newTheme = currentTheme === THEME_LIGHT ? THEME_DARK : THEME_LIGHT;
        setTheme(newTheme);
    }
    
    // Initialize theme on page load
    function init() {
        const currentTheme = getCurrentTheme();
        setTheme(currentTheme);
        
        // Add click event to toggle button
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleTheme);
        }
    }
    
    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
