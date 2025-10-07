# Configuration Setup

## Overview
The application now uses a **single source of truth** for the script URL configuration: the `env/.env` file.

## File Structure
```
env/
├── .env          # Single source of truth for configuration
└── config.js     # Configuration loader (reads from .env)
```

## What Was Fixed

### Before:
- Script URL was defined in **TWO places**:
  1. `env/.env` file
  2. `env/config.js` as `defaultConfig` fallback
- This created confusion and potential inconsistencies

### After:
- Script URL is defined in **ONE place only**: `env/.env`
- `config.js` only loads from `.env` (no hardcoded fallback)
- If `.env` fails to load, an error is thrown (fail-fast approach)

## How It Works

1. **Configuration File** (`env/.env`):
   ```env
   SCRIPT_URL="https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
   ```

2. **Configuration Loader** (`env/config.js`):
   - Fetches and parses the `.env` file
   - Provides the `getScriptUrl()` method
   - No hardcoded URLs - reads exclusively from `.env`

3. **Usage in Application**:
   - Both `user.html` and `admin.html` load `config.js`
   - JavaScript files call `await window.config.load()`
   - Access the URL via `window.config.getScriptUrl()`

## To Update the Script URL

**Simply edit the `env/.env` file:**
```env
SCRIPT_URL="https://your-new-script-url-here/exec"
```

No need to modify any JavaScript files!

## Benefits

✅ **Single Source of Truth**: Only one place to manage the script URL  
✅ **Easy Updates**: Change the URL in one file, affects entire application  
✅ **Clear Separation**: Environment config separate from code logic  
✅ **Fail-Fast**: Clear error if configuration fails to load  
✅ **No Duplication**: No hardcoded fallback URLs
