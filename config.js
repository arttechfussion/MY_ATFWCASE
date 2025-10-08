/**
 * Configuration Loader
 * Reads API configuration from env/config.txt
 */

window.config = {
    scriptUrl: null,

    /**
     * Load configuration from env/config.txt
     */
    async load() {
        // If already loaded, return immediately
        if (this.scriptUrl) {
            console.log('Configuration already loaded:', this.scriptUrl);
            return;
        }

        try {
            // Determine base path based on current location
            const currentPath = window.location.pathname;
            let basePath = '';
            
            if (currentPath.includes('/admin/')) {
                basePath = '../';
            } else if (currentPath.includes('/user/')) {
                basePath = '../';
            }

            // Try to load config file
            const configPath = basePath + 'env/config.txt';
            console.log('Attempting to load config from:', configPath);
            
            try {
                const response = await fetch(configPath);
                if (response.ok) {
                    const configText = await response.text();
                    console.log('Configuration file loaded successfully');
                    this.parseConfig(configText);
                    return;
                }
            } catch (fetchError) {
                console.warn('Could not fetch config file:', fetchError);
            }

            // Fallback: Auto-detect API URL from current location
            console.warn('Using auto-detected API URL');
            const pathParts = window.location.pathname.split('/').filter(p => p);
            
            // Remove last part if it's a file
            if (pathParts.length > 0 && pathParts[pathParts.length - 1].includes('.')) {
                pathParts.pop();
            }
            
            // Remove 'admin' or 'user' if present
            if (pathParts.length > 0 && (pathParts[pathParts.length - 1] === 'admin' || pathParts[pathParts.length - 1] === 'user')) {
                pathParts.pop();
            }
            
            const basePath2 = pathParts.length > 0 ? '/' + pathParts.join('/') : '';
            this.scriptUrl = window.location.origin + basePath2 + '/api/';
            console.log('Auto-detected API URL:', this.scriptUrl);
            
        } catch (error) {
            console.error('Error loading configuration:', error);
            // Last resort: use /api/ relative to origin
            this.scriptUrl = window.location.origin + '/showcase/api/';
            console.warn('Using hardcoded fallback URL:', this.scriptUrl);
        }
    },

    /**
     * Parse configuration text (key=value format)
     * @param {string} configText
     */
    parseConfig(configText) {
        const lines = configText.split('\n');
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith('#')) {
                continue;
            }

            // Parse key=value
            const equalIndex = trimmedLine.indexOf('=');
            if (equalIndex === -1) {
                continue;
            }

            const key = trimmedLine.substring(0, equalIndex).trim();
            let value = trimmedLine.substring(equalIndex + 1).trim();

            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.substring(1, value.length - 1);
            }

            // Store SCRIPT_URL
            if (key === 'SCRIPT_URL') {
                this.scriptUrl = value;
            }
        }

        if (!this.scriptUrl) {
            throw new Error('SCRIPT_URL not found in configuration');
        }
    },

    /**
     * Get the script URL
     * @returns {string}
     */
    getScriptUrl() {
        if (!this.scriptUrl) {
            throw new Error('Configuration not loaded. Call load() first.');
        }
        return this.scriptUrl;
    }
};
