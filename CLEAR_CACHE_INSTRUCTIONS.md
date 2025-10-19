# Clear Browser Cache - Fix Translation Issue

## Problem
You're seeing the old text "התקדמות ואבני דרך" instead of the new "🎯 תוכנית טיפול"

## Cause
Your browser has cached the old translation files from a previous deployment.

## Solution

### Option 1: Hard Refresh (Quickest)
1. Go to https://socio-sync-sepia.vercel.app
2. Press one of these key combinations:
   - **Windows/Linux**: `Ctrl + Shift + R`
   - **Mac**: `Cmd + Shift + R`
   - **Alternative**: `Ctrl + F5` (Windows) or `Cmd + Option + R` (Mac)

### Option 2: Clear Cache via DevTools
1. Open the website: https://socio-sync-sepia.vercel.app
2. Press `F12` to open Developer Tools
3. Right-click the **Reload button** (circular arrow next to address bar)
4. Select **"Empty Cache and Hard Reload"**

### Option 3: Incognito/Private Window
1. Open a new **Incognito** (Chrome) or **Private** (Firefox/Safari) window
2. Navigate to: https://socio-sync-sepia.vercel.app
3. The new translations will load fresh

### Option 4: Clear All Browser Data
1. **Chrome**: Settings → Privacy → Clear browsing data → Cached images and files
2. **Firefox**: Settings → Privacy → Clear Data → Cached Web Content
3. **Safari**: Develop → Empty Caches (or Settings → Advanced → Website Data → Remove All)

---

## Verification

After clearing cache, check that you see:
- ✅ Button text: **🎯 תוכנית טיפול**
- ✅ Section heading: **🎯 תוכנית טיפול**
- ❌ OLD text (should NOT appear): "התקדמות ואבני דרך"

---

## Technical Details

The translation has been updated in:
- ✅ `src/locales/he.json` - Line 281: `"progressMilestones": "🎯 תוכנית טיפול"`
- ✅ `src/locales/en.json` - Line 281: `"progressMilestones": "🎯 Treatment Plan"`

The code is deployed correctly to Vercel. This is **purely a browser caching issue**.

