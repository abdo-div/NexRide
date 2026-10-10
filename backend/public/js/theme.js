/**
 * NexRide Theme Manager
 * Handles light/dark mode toggle with localStorage persistence
 * and OS preference detection.
 */

(function () {
  const STORAGE_KEY = 'nexride-theme';
  const html = document.documentElement;
  const DARK_ICON = 'dark_mode';
  const LIGHT_ICON = 'light_mode';

  function isDark() {
    return html.classList.contains('dark');
  }

  function applyTheme(dark) {
    if (dark) {
      html.classList.add('dark');
      localStorage.setItem(STORAGE_KEY, 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem(STORAGE_KEY, 'light');
    }
    updateIcons(dark);
  }

  function updateIcons(dark) {
    // Update all theme toggle icons on the page
    document.querySelectorAll('#theme-icon').forEach(function (icon) {
      icon.textContent = dark ? LIGHT_ICON : DARK_ICON;
    });
    // Update aria-label on toggle buttons
    document.querySelectorAll('#theme-toggle').forEach(function (btn) {
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    });
  }

  // Global toggle function called by onclick handlers
  window.toggleTheme = function () {
    applyTheme(!isDark());
  };

  // Sync icons once DOM is ready (theme class is already applied by anti-FOUC script)
  document.addEventListener('DOMContentLoaded', function () {
    updateIcons(isDark());

    // Watch for OS theme changes (only when no saved preference)
    if (!localStorage.getItem(STORAGE_KEY)) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
        applyTheme(e.matches);
      });
    }
  });
})();
