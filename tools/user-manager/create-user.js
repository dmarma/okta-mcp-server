/**
 * Function to create a new user in an Okta organization.
 *
 * @param {Object} args - Arguments for creating the user.
 * @param {Object} args.profile - User profile information.
 * @param {string} args.profile.login - User's login/username (typically email).
 * @param {string} args.profile.email - User's email address.
 * @param {string} args.profile.firstName - User's first name.
 * @param {string} args.profile.lastName - User's last name.
 * @param {string} [args.profile.displayName] - User's display name.
 * @param {string} [args.profile.department] - User's department.
 * @param {string} [args.profile.title] - User's job title.
 * @param {string} [args.profile.manager] - User's manager.
 * @param {string} [args.profile.mobilePhone] - User's mobile phone.
 * @param {Object} [args.credentials] - User credentials.
 * @param {Object} [args.credentials.password] - Password information.
 * @param {string} [args.credentials.password.value] - Plain text password.
 * @param {boolean} [args.activate=true] - Whether to activate the user immediately.
 * @param {string} [args.nextLogin] - Next login behavior (changePassword, etc.).
 * @returns {Promise<Object>} - The result of the user creation.
 */
const executeFunction = async ({ 
  profile,
  credentials,
  activate = true,
  nextLogin
}) => {
  console.log('=== CREATE USER DEBUG ===');
  console.log('Profile:', profile);
  console.log('Has credentials:', !!credentials);
  console.log('Activate:', activate);
  console.log('=========================');

  // Import credentials helper from manual server
  const { getOktaCredentials } = await import('../../lib/tools.js');
  
  try {
    // Validate required profile fields
    if (!profile) {
      throw new Error('Profile object is required');
    }

    const requiredFields = ['login', 'email', 'firstName', 'lastName'];
    const missingFields = requiredFields.filter(field => !profile[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required profile fields: ${missingFields.join(', ')}`);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profile.email)) {
      throw new Error('Invalid email format');
    }

    // Auto-generate display name if not provided
    if (!profile.displayName) {
      profile.displayName = `${profile.firstName} ${profile.lastName}`;
      console.log(`Auto-generated displayName: ${profile.displayName}`);
    }

    const { domain, apiToken } = await getOktaCredentials();
    const baseUrl = `https://${domain}`;

    // Build the request body
    const requestBody = {
      profile: {
        login: profile.login,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        displayName: profile.displayName,
        // Optional fields
        ...(profile.department && { department: profile.department }),
        ...(profile.title && { title: profile.title }),
        ...(profile.manager && { manager: profile.manager }),
        ...(profile.mobilePhone && { mobilePhone: profile.mobilePhone }),
        ...(profile.organization && { organization: profile.organization }),
        ...(profile.city && { city: profile.city }),
        ...(profile.state && { state: profile.state }),
        ...(profile.zipCode && { zipCode: profile.zipCode }),
        ...(profile.countryCode && { countryCode: profile.countryCode })
      }
    };

    // Add credentials if provided
    if (credentials) {
      requestBody.credentials = {};
      
      if (credentials.password) {
        requestBody.credentials.password = {
          value: credentials.password.value
        };
        console.log('Including password credentials');
      }

      if (credentials.recovery_question) {
        requestBody.credentials.recovery_question = credentials.recovery_question;
      }
    }

    // Build URL with query parameters
    const url = new URL(`${baseUrl}/api/v1/users`);
    
    // Set activation behavior
    url.searchParams.append('activate', activate.toString());
    
    if (nextLogin) {
      url.searchParams.append('nextLogin', nextLogin);
    }

    console.log('Creating user with request body:', JSON.stringify(requestBody, null, 2));

    // Execute the request
    const response = await fetch(url.toString(), {
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
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }

      // Enhanced error handling with suggestions
      let errorMessage = `HTTP ${response.status}: ${JSON.stringify(errorData)}`;
      let suggestion = '';

      if (response.status === 400) {
        if (errorText.includes('login')) {
          suggestion = 'The login/username already exists or is invalid. Try a different login.';
        } else if (errorText.includes('email')) {
          suggestion = 'The email address is already in use or invalid format.';
        } else if (errorText.includes('password')) {
          suggestion = 'Password does not meet complexity requirements. Try a stronger password.';
        }
      } else if (response.status === 403) {
        suggestion = 'Insufficient permissions to create users. Check your API token permissions.';
      }

      throw new Error(`${errorMessage}${suggestion ? ` Suggestion: ${suggestion}` : ''}`);
    }

    const userData = await response.json();
    
    console.log(`✅ User created successfully: ${userData.profile.login}`);
    console.log(`   - Status: ${userData.status}`);
    console.log(`   - ID: ${userData.id}`);

    // Return clean, organized response
    return {
      id: userData.id,
      status: userData.status,
      created: userData.created,
      activated: userData.activated,
      lastUpdated: userData.lastUpdated,
      profile: {
        login: userData.profile.login,
        email: userData.profile.email,
        firstName: userData.profile.firstName,
        lastName: userData.profile.lastName,
        displayName: userData.profile.displayName,
        department: userData.profile.department,
        title: userData.profile.title,
        manager: userData.profile.manager,
        mobilePhone: userData.profile.mobilePhone
      },
      credentials: userData.credentials ? {
        provider: userData.credentials.provider
      } : undefined,
      _links: userData._links,
      message: `User '${userData.profile.login}' created successfully with status '${userData.status}'`
    };

  } catch (error) {
    console.error('Error creating user:', error);
    return { 
      error: `Failed to create user: ${error.message}`,
      suggestion: error.message.includes('Suggestion:') ? 
        undefined : 
        "Check that all required fields are provided and that the login/email doesn't already exist."
    };
  }
};

/**
 * Tool configuration for creating users in Okta.
 * @type {Object}
 */
const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'create_user',
      description: 'Create a new user in Okta with comprehensive profile information and optional credentials. Supports automatic activation.',
      parameters: {
        type: 'object',
        properties: {
          profile: {
            type: 'object',
            description: 'User profile information',
            properties: {
              login: {
                type: 'string',
                description: 'User\'s unique login identifier (typically email address)'
              },
              email: {
                type: 'string',
                format: 'email',
                description: 'User\'s email address'
              },
              firstName: {
                type: 'string',
                description: 'User\'s first name'
              },
              lastName: {
                type: 'string',
                description: 'User\'s last name'
              },
              displayName: {
                type: 'string',
                description: 'User\'s display name (auto-generated if not provided)'
              },
              department: {
                type: 'string',
                description: 'User\'s department'
              },
              title: {
                type: 'string',
                description: 'User\'s job title'
              },
              manager: {
                type: 'string',
                description: 'User\'s manager'
              },
              mobilePhone: {
                type: 'string',
                description: 'User\'s mobile phone number'
              },
              organization: {
                type: 'string',
                description: 'User\'s organization'
              },
              city: {
                type: 'string',
                description: 'User\'s city'
              },
              state: {
                type: 'string',
                description: 'User\'s state or province'
              },
              zipCode: {
                type: 'string',
                description: 'User\'s ZIP or postal code'
              },
              countryCode: {
                type: 'string',
                description: 'User\'s country code'
              }
            },
            required: ['login', 'email', 'firstName', 'lastName']
          },
          credentials: {
            type: 'object',
            description: 'User credentials (optional)',
            properties: {
              password: {
                type: 'object',
                description: 'Password information',
                properties: {
                  value: {
                    type: 'string',
                    description: 'Plain text password'
                  }
                },
                required: ['value']
              },
              recovery_question: {
                type: 'object',
                description: 'Security question for password recovery',
                properties: {
                  question: {
                    type: 'string',
                    description: 'Recovery question'
                  },
                  answer: {
                    type: 'string',
                    description: 'Answer to recovery question'
                  }
                },
                required: ['question', 'answer']
              }
            }
          },
          activate: {
            type: 'boolean',
            description: 'Whether to activate the user immediately (default: true)',
            default: true
          },
          nextLogin: {
            type: 'string',
            description: 'Behavior on next login',
            enum: ['changePassword']
          }
        },
        required: ['profile']
      }
    }
  }
};

export { apiTool }; 