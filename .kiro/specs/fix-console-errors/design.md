# Design Document

## Overview

This design addresses the console errors in the ATF-SHOWCASE application by fixing configuration loading issues, adding a favicon, and improving error handling. The solution focuses on making the configuration more robust and providing better user feedback when errors occur.

## Architecture

### Current Issues

1. **Configuration Loading**: The `config.js` file attempts to load from `/env/config.txt`, but the path resolution may fail depending on the current page location
2. **Whitespace in Config**: The SCRIPT_URL in `config.txt` has leading/trailing whitespace that needs to be trimmed
3. **Missing Favicon**: No favicon.ico file exists, causing 404 errors
4. **Error Handling**: Configuration errors don't prevent subsequent API calls, leading to cascading failures

### Proposed Solution

1. **Fix Configuration Path**: Update the config loader to use relative paths that work from any page location
2. **Trim Configuration Values**: Ensure all configuration values are trimmed of whitespace
3. **Add Favicon**: Create a simple favicon.ico file in the root directory
4. **Improve Error Handling**: Add better error states and prevent API calls when configuration fails

## Components and Interfaces

### 1. Configuration Loader (`config.js`)

**Current Implementation Issues:**
- Uses absolute path `/env/config.txt` which may fail from subdirectories
- Doesn't trim whitespace from parsed values
- Error handling exists but could be more robust

**Design Changes:**
```javascript
// Update parseEnv to trim all values
parseEnv(text) {
  lines.forEach((line) => {
    if (key && valueParts.length > 0) {
      let value = valueParts.join("=").trim(); // Already trims
      // Remove quotes and trim again
      value = value.slice(1, -1).trim(); // Add additional trim after quote removal
    }
  });
}
```

**Path Resolution Strategy:**
- Keep the current relative path approach (`../env/config.txt` from user/admin folders)
- The HTML files already load config.js with correct relative paths
- No changes needed to path resolution

### 2. Favicon

**Design:**
- Create a simple `favicon.ico` file in the root directory
- Use a basic icon that represents the application (globe or website icon)
- Size: 16x16 and 32x32 pixels (standard favicon sizes)

**Implementation:**
- Generate a simple SVG-based favicon
- Convert to ICO format or use a data URI in HTML

### 3. Error Handling Enhancement

**User Interface Changes:**

For `user/user.js`:
```javascript
// Add configuration validation before loading dashboard
async function loadUserDashboard() {
  if (!SCRIPT_URL || SCRIPT_URL.trim() === '') {
    showError('Configuration error: Script URL is not set. Please check your configuration.');
    return;
  }
  // ... rest of the function
}
```

For `admin/admin.js`:
```javascript
// Add configuration validation in checkLoginStatus
function checkLoginStatus() {
  if (!SCRIPT_URL || SCRIPT_URL.trim() === '') {
    showToast('Configuration error: Script URL is not set.', 'error');
    // Show error in login page
    return;
  }
  // ... rest of the function
}
```

### 4. Configuration File Update

**Current Content:**
```
# Environment Configuration
# Google Apps Script URL
SCRIPT_URL= https://script.google.com/macros/s/AKfycbz03TaFtno5GGb728D_hgfG8ZJxxpcZTPDe5cV6YCcCVOW1wSCkpvRIWPssC5XtxSFb/exec
```

**Issue:** Extra space after `=` sign

**Fix:** Remove the space:
```
SCRIPT_URL=https://script.google.com/macros/s/AKfycbz03TaFtno5GGb728D_hgfG8ZJxxpcZTPDe5cV6YCcCVOW1wSCkpvRIWPssC5XtxSFb/exec
```

## Data Models

No data model changes required. This is purely a configuration and error handling fix.

## Error Handling

### Configuration Loading Errors

**Error Types:**
1. **File Not Found (404)**: Config file doesn't exist
2. **Parse Error**: Config file format is invalid
3. **Empty Configuration**: SCRIPT_URL is missing or empty
4. **Network Error**: Server not running or CORS issues

**Handling Strategy:**
```javascript
// In config.js
async load() {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load config file from ${path}. Status: ${response.status}`);
    }
    const text = await response.text();
    this.parseEnv(text);
    
    // Validate required fields
    if (!this.config.SCRIPT_URL || this.config.SCRIPT_URL.trim() === '') {
      throw new Error('SCRIPT_URL is not configured in config file');
    }
    
    this.loaded = true;
  } catch (error) {
    this.loaded = false;
    throw error; // Re-throw to be handled by caller
  }
}
```

### User-Facing Error Messages

**Configuration Error Display:**
- User page: Show error card in the website list area
- Admin page: Show error message on login page
- Both: Provide actionable guidance (check configuration, ensure server is running)

## Testing Strategy

### Manual Testing Checklist

1. **Configuration Loading**
   - [ ] Load user page and verify no console errors
   - [ ] Load admin page and verify no console errors
   - [ ] Verify SCRIPT_URL is correctly loaded and trimmed
   - [ ] Test with missing config file (should show error)
   - [ ] Test with empty SCRIPT_URL (should show error)

2. **Favicon**
   - [ ] Verify favicon loads without 404 error
   - [ ] Check favicon appears in browser tab
   - [ ] Test on different pages (user, admin)

3. **Error Handling**
   - [ ] Simulate config file missing
   - [ ] Simulate invalid SCRIPT_URL
   - [ ] Verify error messages are user-friendly
   - [ ] Verify API calls don't proceed when config fails

4. **Cross-Browser Testing**
   - [ ] Test in Chrome
   - [ ] Test in Firefox
   - [ ] Test in Safari
   - [ ] Test in Edge

### Integration Testing

1. **End-to-End Flow**
   - Start with clean browser cache
   - Load application
   - Verify configuration loads
   - Verify API calls work
   - Check console for any errors

2. **Error Recovery**
   - Load with missing config
   - Fix config file
   - Refresh page
   - Verify application works

## Implementation Notes

### Priority Order

1. **High Priority**: Fix config.txt whitespace (immediate fix)
2. **High Priority**: Add favicon (eliminates console noise)
3. **Medium Priority**: Enhance error handling (improves UX)
4. **Low Priority**: Update documentation (maintenance)

### Backward Compatibility

All changes are backward compatible. Existing functionality remains unchanged, only error handling and configuration robustness are improved.

### Performance Impact

Minimal to none. The changes are primarily error handling and don't affect the main application flow.

## AppScript Changes

**Analysis:** No changes needed to the Google Apps Script backend. All issues are frontend-related:
- Configuration loading is a client-side concern
- Favicon is a static asset
- Error handling is in the frontend JavaScript

**Conclusion:** The `appscript.md` file does not need to be updated for this fix.
