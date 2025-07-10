import keytar from 'keytar';
import fs from 'fs';
import os from 'os';
import path from 'path';

const SERVICE_NAME = 'okta-mcp-server';
const DOMAIN_ACCOUNT = 'okta-domain';
const TOKEN_ACCOUNT = 'okta-api-token';
const METADATA_ACCOUNT = 'okta-metadata';

// File-based fallback paths
const configDir = path.join(os.homedir(), '.okta-mcp');
const configFile = path.join(configDir, 'config.json');

/**
 * Store Okta credentials securely - tries keychain first, then file fallback
 * @param {string} domain - Okta domain
 * @param {string} apiToken - Okta API token
 * @returns {Promise<void>}
 */
export async function storeCredentials(domain, apiToken) {
  // Try keychain first
  try {
    await keytar.setPassword(SERVICE_NAME, DOMAIN_ACCOUNT, domain);
    await keytar.setPassword(SERVICE_NAME, TOKEN_ACCOUNT, apiToken);
    
    // Store metadata (creation time, etc.)
    const metadata = {
      createdAt: new Date().toISOString(),
      version: '1.0.0',
      storage: 'keychain'
    };
    await keytar.setPassword(SERVICE_NAME, METADATA_ACCOUNT, JSON.stringify(metadata));
    
    console.log('🔒 Credentials stored securely in system keychain');
    return;
  } catch (keychainError) {
    console.warn('⚠️  Keychain not available, using secure file fallback...');
    
    // Fallback to secure file storage
    try {
      // Ensure config directory exists
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      const config = {
        domain,
        apiToken,
        createdAt: new Date().toISOString(),
        version: '1.0.0',
        storage: 'file'
      };
      
      // Write with restricted permissions (owner read/write only)
      fs.writeFileSync(configFile, JSON.stringify(config, null, 2), { mode: 0o600 });
      console.log('🔒 Credentials stored securely in file with restricted permissions');
      
    } catch (fileError) {
      throw new Error(`Failed to store credentials: Keychain (${keychainError.message}), File (${fileError.message})`);
    }
  }
}

/**
 * Retrieve Okta credentials - tries keychain, then file, then environment variables
 * @returns {Promise<Object|null>} Object with domain and apiToken, or null if not found
 */
export async function getCredentials() {
  // Try keychain first
  try {
    const domain = await keytar.getPassword(SERVICE_NAME, DOMAIN_ACCOUNT);
    const apiToken = await keytar.getPassword(SERVICE_NAME, TOKEN_ACCOUNT);
    
    if (domain && apiToken) {
      return { domain, apiToken, storage: 'keychain' };
    }
  } catch (keychainError) {
    // Keychain failed, continue to file fallback
  }
  
  // Try file-based storage
  if (fs.existsSync(configFile)) {
    try {
      const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      if (config.domain && config.apiToken) {
        return { 
          domain: config.domain, 
          apiToken: config.apiToken,
          storage: 'file'
        };
      }
    } catch (fileError) {
      console.warn('Warning: Error reading config file, trying environment variables...');
    }
  }
  
  // Final fallback to environment variables
  const domain = process.env.OKTA_DOMAIN;
  const apiToken = process.env.OKTA_API_KEY;
  
  if (domain && apiToken) {
    return { domain, apiToken, storage: 'environment' };
  }
  
  return null;
}

/**
 * Get session information including metadata
 * @returns {Promise<Object|null>} Session info or null if no session
 */
export async function getSessionInfo() {
  try {
    const credentials = await getCredentials();
    if (!credentials) {
      return null;
    }
    
    let metadata = {};
    
    // Get metadata based on storage type
    if (credentials.storage === 'keychain') {
      try {
        const metadataStr = await keytar.getPassword(SERVICE_NAME, METADATA_ACCOUNT);
        if (metadataStr) {
          metadata = JSON.parse(metadataStr);
        }
      } catch (e) {
        // Ignore keychain metadata errors
      }
    } else if (credentials.storage === 'file' && fs.existsSync(configFile)) {
      try {
        const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        metadata = {
          createdAt: config.createdAt,
          version: config.version,
          storage: config.storage
        };
      } catch (e) {
        // Ignore file metadata errors
      }
    } else if (credentials.storage === 'environment') {
      metadata = {
        storage: 'environment',
        createdAt: 'N/A',
        version: 'N/A'
      };
    }
    
    return {
      domain: credentials.domain,
      storage: credentials.storage || metadata.storage || 'unknown',
      createdAt: metadata.createdAt || 'Unknown',
      version: metadata.version || 'Unknown'
    };
  } catch (error) {
    console.warn('Warning: Error getting session info:', error.message);
    return null;
  }
}

/**
 * Clear all stored credentials from keychain and file
 * @returns {Promise<boolean>} True if credentials were cleared, false if none existed
 */
export async function clearCredentials() {
  const hadCredentials = await getCredentials() !== null;
  
  // Clear keychain entries (ignore errors if entries don't exist)
  try {
    await keytar.deletePassword(SERVICE_NAME, DOMAIN_ACCOUNT).catch(() => {});
    await keytar.deletePassword(SERVICE_NAME, TOKEN_ACCOUNT).catch(() => {});
    await keytar.deletePassword(SERVICE_NAME, METADATA_ACCOUNT).catch(() => {});
  } catch (keychainError) {
    // Ignore keychain errors during cleanup
  }
  
  // Clear file-based credentials
  if (fs.existsSync(configFile)) {
    try {
      fs.unlinkSync(configFile);
    } catch (fileError) {
      console.warn('Warning: Could not delete config file:', fileError.message);
    }
  }
  
  // Also try to remove the config directory if it's empty
  try {
    if (fs.existsSync(configDir)) {
      const files = fs.readdirSync(configDir);
      if (files.length === 0) {
        fs.rmdirSync(configDir);
      }
    }
  } catch (dirError) {
    // Ignore directory cleanup errors
  }
  
  return hadCredentials;
}

/**
 * Test if stored credentials are valid by making an API call
 * @returns {Promise<boolean>} True if credentials are valid
 */
export async function validateCredentials() {
  try {
    const credentials = await getCredentials();
    if (!credentials) {
      return false;
    }
    
    const response = await fetch(`https://${credentials.domain}/api/v1/apps?limit=1`, {
      headers: {
        'Authorization': `SSWS ${credentials.apiToken}`,
        'Accept': 'application/json'
      }
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Check if keychain is available on this system
 * @returns {Promise<boolean>} True if keychain is available
 */
export async function isKeychainAvailable() {
  try {
    // Try to access keychain with a test operation
    await keytar.findCredentials(SERVICE_NAME);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get available credential storage methods
 * @returns {Promise<Object>} Object with available storage methods
 */
export async function getStorageInfo() {
  const keychainAvailable = await isKeychainAvailable();
  const fileSupported = true; // File storage is always supported
  const envSupported = true;  // Environment variables are always supported
  
  return {
    keychain: keychainAvailable,
    file: fileSupported,
    environment: envSupported,
    preferred: keychainAvailable ? 'keychain' : 'file'
  };
} 