/**
 * Function to create a custom OIDC application in Okta.
 *
 * @param {Object} args - Arguments for creating the application.
 * @param {string} args.label - The label for the application.
 * @param {string} args.applicationType - The application type: 'native', 'web', 'browser' (SPA), or 'service'.
 * @param {string[]} [args.redirectUris] - Redirect URIs (required for native, web, and SPA apps).
 * @param {string[]} [args.postLogoutRedirectUris] - Post logout redirect URIs (optional for web and SPA apps).
 * @param {string[]} [args.grantTypes] - Grant types (auto-configured based on app type if not provided).
 * @param {string[]} [args.responseTypes] - Response types (auto-configured based on app type if not provided).
 * @param {string} [args.tokenEndpointAuthMethod] - Token endpoint auth method (auto-configured if not provided).
 * @param {boolean} [args.pkceRequired] - Whether PKCE is required (auto-configured based on app type if not provided).
 * @param {Object} [args.additionalSettings] - Additional application settings.
 * @returns {Promise<Object>} - The result of the application creation.
 */
const executeFunction = async ({ 
  name,
  label, 
  signOnMode,
  applicationType = 'service', // Default to service if not provided
  redirectUris = [], 
  postLogoutRedirectUris = [],
  redirectUri, // Single redirect URI as fallback
  postLogoutRedirectUri, // Single post logout redirect URI as fallback  
  grantTypes,
  responseTypes,
  tokenEndpointAuthMethod,
  pkceRequired,
  additionalSettings = {}
}) => {
  // Debug logging for received parameters
  console.log('=== CREATE APPLICATION DEBUG ===');
  console.log('Received parameters:');
  console.log('name:', name, typeof name);
  console.log('label:', label, typeof label);
  console.log('signOnMode:', signOnMode, typeof signOnMode);
  console.log('applicationType:', applicationType, typeof applicationType);
  console.log('redirectUris:', redirectUris, typeof redirectUris);
  console.log('postLogoutRedirectUris:', postLogoutRedirectUris, typeof postLogoutRedirectUris);
  console.log('redirectUri:', redirectUri, typeof redirectUri);
  console.log('postLogoutRedirectUri:', postLogoutRedirectUri, typeof postLogoutRedirectUri);
  console.log('grantTypes:', grantTypes, typeof grantTypes);
  console.log('responseTypes:', responseTypes, typeof responseTypes);
  console.log('================================');

  // Handle array parameters - ensure they're properly formatted
  if (redirectUris && !Array.isArray(redirectUris)) {
    if (typeof redirectUris === 'string') {
      try {
        redirectUris = JSON.parse(redirectUris);
        console.log('Parsed redirectUris:', redirectUris);
      } catch (e) {
        console.error('Failed to parse redirectUris, using redirectUri fallback:', e);
        redirectUris = redirectUri ? [redirectUri] : [];
      }
    } else {
      redirectUris = redirectUri ? [redirectUri] : [];
    }
  } else if (!redirectUris && redirectUri) {
    redirectUris = [redirectUri];
  } else if (!redirectUris) {
    redirectUris = [];
  }
  
  if (postLogoutRedirectUris && !Array.isArray(postLogoutRedirectUris)) {
    if (typeof postLogoutRedirectUris === 'string') {
      try {
        postLogoutRedirectUris = JSON.parse(postLogoutRedirectUris);
        console.log('Parsed postLogoutRedirectUris:', postLogoutRedirectUris);
      } catch (e) {
        console.error('Failed to parse postLogoutRedirectUris, using postLogoutRedirectUri fallback:', e);
        postLogoutRedirectUris = postLogoutRedirectUri ? [postLogoutRedirectUri] : [];
      }
    } else {
      postLogoutRedirectUris = postLogoutRedirectUri ? [postLogoutRedirectUri] : [];
    }
  } else if (!postLogoutRedirectUris && postLogoutRedirectUri) {
    postLogoutRedirectUris = [postLogoutRedirectUri];
  } else if (!postLogoutRedirectUris) {
    postLogoutRedirectUris = [];
  }

  console.log('Final redirectUris:', redirectUris);
  console.log('Final postLogoutRedirectUris:', postLogoutRedirectUris);

  if (!process.env.OKTA_DOMAIN) {
    throw new Error('OKTA_DOMAIN environment variable is not set');
  }
  const baseUrl = `https://${process.env.OKTA_DOMAIN}`;
  const apiToken = process.env.OKTA_API_KEY;

  // Validate application type
  const validAppTypes = ['native', 'web', 'spa', 'service'];
  if (!validAppTypes.includes(applicationType)) {
    throw new Error(`Invalid application type. Must be one of: ${validAppTypes.join(', ')}`);
  }

  // Validate redirect URIs for non-service apps
  if (applicationType !== 'service' && (!redirectUris || redirectUris.length === 0)) {
    throw new Error(`Redirect URIs are required for ${applicationType} applications`);
  }

  // Auto-configure settings based on application type
  let defaultGrantTypes, defaultResponseTypes, defaultTokenAuthMethod, defaultPkceRequired;

  switch (applicationType) {
    case 'native':
      defaultGrantTypes = ['authorization_code', 'refresh_token'];
      defaultResponseTypes = ['code'];
      defaultTokenAuthMethod = 'none'; // Public client
      defaultPkceRequired = true;
      break;
    case 'web':
      defaultGrantTypes = ['authorization_code', 'refresh_token'];
      defaultResponseTypes = ['code'];
      defaultTokenAuthMethod = 'client_secret_basic';
      defaultPkceRequired = false;
      break;
    case 'spa': // Single Page Application
      defaultGrantTypes = ['authorization_code', 'refresh_token', 'interaction_code'];
      defaultResponseTypes = ['code'];
      defaultTokenAuthMethod = 'none'; // Public client
      defaultPkceRequired = true;
      break;
    case 'service':
      defaultGrantTypes = ['client_credentials'];
      defaultResponseTypes = ['token'];
      defaultTokenAuthMethod = 'client_secret_basic';
      defaultPkceRequired = false;
      break;
  }

  // Use provided values or defaults
  const finalGrantTypes = grantTypes || defaultGrantTypes;
  const finalResponseTypes = responseTypes || defaultResponseTypes;
  const finalTokenAuthMethod = tokenEndpointAuthMethod || defaultTokenAuthMethod;
  const finalPkceRequired = pkceRequired !== undefined ? pkceRequired : defaultPkceRequired;

  // Map application type to Okta's expected values
  const oktaApplicationType = applicationType === 'spa' ? 'browser' : applicationType;

  // Build the request body - use different structure for SPA apps
  let requestBody;
  
  if (applicationType === 'spa') {
    // Special handling for SPA applications based on working examples
    requestBody = {
      name: 'oidc_client',
      label: label,
      signOnMode: 'OPENID_CONNECT',
      settings: {
        oauthClient: {
          client_uri: null,
          logo_uri: null,
          redirect_uris: redirectUris,
          response_types: finalResponseTypes,
          grant_types: finalGrantTypes,
          application_type: oktaApplicationType,
          consent_method: 'REQUIRED',
          issuer_mode: 'DYNAMIC'
        }
      }
    };
    
    // Add optional SPA fields
    if (postLogoutRedirectUris && postLogoutRedirectUris.length > 0) {
      requestBody.settings.oauthClient.post_logout_redirect_uris = postLogoutRedirectUris;
    }
    
  } else if (applicationType === 'web') {
    // Special handling for web applications based on working demo-web-app structure
    requestBody = {
      name: 'oidc_client',
      label: label,
      signOnMode: 'OPENID_CONNECT',
      settings: {
        oauthClient: {
          client_uri: null,
          logo_uri: null,
          redirect_uris: redirectUris,
          response_types: finalResponseTypes,
          grant_types: finalGrantTypes,
          application_type: oktaApplicationType,
          consent_method: 'REQUIRED',
          issuer_mode: 'DYNAMIC'
        }
      }
    };
    
    // Add optional web fields
    if (postLogoutRedirectUris && postLogoutRedirectUris.length > 0) {
      requestBody.settings.oauthClient.post_logout_redirect_uris = postLogoutRedirectUris;
    }
    
  } else if (applicationType === 'native') {
    // Special handling for native applications based on working demo-native structure
    requestBody = {
      name: 'oidc_client',
      label: label,
      signOnMode: 'OPENID_CONNECT',
      settings: {
        oauthClient: {
          client_uri: null,
          logo_uri: null,
          redirect_uris: redirectUris,
          response_types: finalResponseTypes,
          grant_types: finalGrantTypes,
          application_type: oktaApplicationType,
          consent_method: 'REQUIRED',
          issuer_mode: 'DYNAMIC'
        }
      }
    };
    
    // Add optional native fields
    if (postLogoutRedirectUris && postLogoutRedirectUris.length > 0) {
      requestBody.settings.oauthClient.post_logout_redirect_uris = postLogoutRedirectUris;
    }
    
  } else {
    // Standard structure for service apps
    requestBody = {
      name: 'oidc_client',
      label: label,
      signOnMode: 'OPENID_CONNECT',
      settings: {
        oauthClient: {
          application_type: oktaApplicationType,
          grant_types: finalGrantTypes,
          response_types: finalResponseTypes,
          ...additionalSettings
        }
      }
    };
  }

  // Debug logging
  console.log('Creating application with request body:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(`${baseUrl}/api/v1/apps`, {
      method: 'POST',
      headers: {
        'Authorization': `SSWS ${apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Okta API Error:', errorText);
      console.error('Request body that was sent:', JSON.stringify(requestBody, null, 2));
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)} | Request body: ${JSON.stringify(requestBody)}`);
    }

    const data = await response.json();
    
    // If it's a SPA, web app, or native app, we need to update it with additional settings that can't be set during creation
    if (applicationType === 'spa' || applicationType === 'web' || applicationType === 'native') {
      try {
        let updateBody;
        if (applicationType === 'spa') {
          updateBody = {
            settings: {
              oauthClient: {
                token_endpoint_auth_method: finalTokenAuthMethod,
                pkce_required: finalPkceRequired,
                idp_initiated_login: {
                  mode: 'DISABLED',
                  default_scope: []
                },
                wildcard_redirect: 'DISABLED',
                dpop_bound_access_tokens: false,
                participate_slo: false
              }
            }
          };
        } else if (applicationType === 'web') {
          updateBody = {
            settings: {
              oauthClient: {
                token_endpoint_auth_method: finalTokenAuthMethod,
                pkce_required: finalPkceRequired
              }
            }
          };
        } else if (applicationType === 'native') {
          updateBody = {
            settings: {
              oauthClient: {
                token_endpoint_auth_method: finalTokenAuthMethod,
                pkce_required: finalPkceRequired
              }
            }
          };
        }
        
        const updateResponse = await fetch(`${baseUrl}/api/v1/apps/${data.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `SSWS ${apiToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(updateBody)
        });
        
        if (updateResponse.ok) {
          const updatedData = await updateResponse.json();
          console.log(`${applicationType.toUpperCase()} successfully updated with additional settings`);
          data.settings = updatedData.settings; // Update with the latest settings
        }
      } catch (updateError) {
        console.warn('Warning: Failed to update SPA with additional settings:', updateError.message);
      }
    }
    
    // Return useful information about the created app
    return {
      id: data.id,
      label: data.label,
      name: data.name,
      status: data.status,
      signOnMode: data.signOnMode,
      applicationType: data.settings?.oauthClient?.application_type,
      clientId: data.settings?.oauthClient?.client_id,
      clientSecret: data.settings?.oauthClient?.client_secret,
      grantTypes: data.settings?.oauthClient?.grant_types,
      responseTypes: data.settings?.oauthClient?.response_types,
      redirectUris: data.settings?.oauthClient?.redirect_uris,
      postLogoutRedirectUris: data.settings?.oauthClient?.post_logout_redirect_uris,
      tokenEndpointAuthMethod: data.settings?.oauthClient?.token_endpoint_auth_method,
      pkceRequired: data.settings?.oauthClient?.pkce_required,
      created: data.created,
      _links: data._links
    };
  } catch (error) {
    console.error('Error creating OIDC application:', error);
    return { error: `An error occurred while creating the OIDC application: ${error.message}` };
  }
};

/**
 * Tool configuration for creating a custom OIDC application in Okta.
 * @type {Object}
 */
const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'create_application',
      description: 'Create a custom OIDC application in Okta. Supports native, web, spa (Single Page Application), and service applications with client credentials.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name of the application (typically "oidc_client" for OIDC apps).'
          },
          label: {
            type: 'string',
            description: 'The display label for the application.'
          },
                    signOnMode: {
            type: 'string',
            description: 'The sign-on mode for the application (typically "OPENID_CONNECT").'
          },
          applicationType: {
          type: 'string',
          enum: ['native', 'web', 'spa', 'service'],
          description: 'The application type: native (mobile), web (server-side), spa (Single Page Application), or service (M2M with client credentials).'
        },
          redirectUris: {
            type: 'array',
            items: { type: 'string' },
            description: 'Redirect URIs for the application. Required for native, web, and spa apps. Not used for service apps.'
          },
          postLogoutRedirectUris: {
            type: 'array',
            items: { type: 'string' },
            description: 'Post logout redirect URIs. Optional for web and spa apps.'
          },
          redirectUri: {
            type: 'string',
            description: 'Single redirect URI as fallback for redirectUris.'
          },
          postLogoutRedirectUri: {
            type: 'string',
            description: 'Single post logout redirect URI as fallback for postLogoutRedirectUris.'
          },
          grantTypes: {
            type: 'array',
            items: { 
              type: 'string',
              enum: ['authorization_code', 'refresh_token', 'client_credentials', 'implicit', 'password']
            },
            description: 'OAuth grant types. Auto-configured based on app type if not provided.'
          },
          responseTypes: {
            type: 'array',
            items: { 
              type: 'string',
              enum: ['code', 'token', 'id_token']
            },
            description: 'OAuth response types. Auto-configured based on app type if not provided.'
          },
          tokenEndpointAuthMethod: {
            type: 'string',
            enum: ['client_secret_basic', 'client_secret_post', 'client_secret_jwt', 'private_key_jwt', 'none'],
            description: 'Token endpoint authentication method. Auto-configured based on app type if not provided.'
          },
          pkceRequired: {
            type: 'boolean',
            description: 'Whether PKCE is required. Auto-configured based on app type if not provided (true for native and spa, false for web and service).'
          },
          additionalSettings: {
            type: 'object',
            description: 'Additional OAuth client settings as key-value pairs.'
          }
        },
        required: ['name', 'label', 'signOnMode']
      }
    }
  }
};

export { apiTool };