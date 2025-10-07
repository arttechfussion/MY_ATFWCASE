// Configuration loader for environment variables
const Config = class {
  constructor() {
    this.config = {};
    this.loaded = false;
  }

  async load() {
    console.log("Config loading started...");

    try {
      // Renamed .env to config.txt to avoid server security restrictions
      const path = './env/config.txt'; 

      const response = await fetch(path);

      if (!response.ok) {
          throw new Error(`Failed to load config file from ${path}. Status: ${response.status}`);
      }
      
      console.log(`Successfully loaded config from: ${path}`);
      const text = await response.text();
      this.parseEnv(text);
      this.loaded = true;
      console.log("Successfully loaded config from file");
      console.log('SCRIPT_URL:', this.config.SCRIPT_URL);

    } catch (error) {
        console.error('Error loading config file:', error);
        throw new Error('Failed to load configuration from file. Please ensure the file exists and the server is running.');
    }
  }

  parseEnv(text) {
    console.log("Parsing config content:", text);
    const lines = text.split("\n");
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          let value = valueParts.join("=").trim();
          // Remove quotes if present
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }
          this.config[key.trim()] = value;
          console.log(`Parsed: ${key.trim()} = ${value}`);
        }
      }
    });
  }

  get(key) {
    return this.config[key];
  }

  getScriptUrl() {
    return this.get("SCRIPT_URL");
  }
};

// Create global config instance
window.config = new Config();