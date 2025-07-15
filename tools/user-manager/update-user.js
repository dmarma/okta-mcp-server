/**
 * Function to update a user's profile in an Okta organization.
 *
 * @param {Object} args - Arguments for updating the user.
 * @param {string} args.userId - User ID, login, or email to update.
 * @param {Object} args.profile - Profile fields to update.
 * @param {Object} [args.credentials] - Credentials to update (optional).
 * @param {boolean} [args.strict=false] - Whether to use strict update semantics.
 * @returns {Promise<Object>} - The updated user information.
 */
const executeFunction = async ({ 
  userId, 
  profile,
  credentials,
  strict = false
}) => {
  console.log('=== UPDATE USER DEBUG ===');
  console.log('User ID/Login:', userId);
  console.log('Profile updates:', profile);
  console.log('Has credentials:', !!credentials);
  console.log('Strict mode:', strict);
  console.log('==========================');

  // Import credentials helper from manual server
  const { getOktaCredentials } = await import('../../lib/tools.js');
  
  try {
    // Validate required parameters
    if (!userId) {
      throw new Error('userId is required (can be user ID, login, or email)');
    }

    if (!profile && !credentials) {
      throw new Error('Either profile or credentials must be provided');
    }

    const { domain, apiToken } = await getOktaCredentials();
    const baseUrl = `https://${domain}`;

    // First, get the current user to merge updates
    const getCurrentUserUrl = `${baseUrl}/api/v1/users/${encodeURIComponent(userId)}`;
    const currentUserResponse = await fetch(getCurrentUserUrl, {
      method: 'GET',
      headers: {
        'Authorization': `SSWS ${apiToken}`,
        'Accept': 'application/json'
      }
    });

    if (!currentUserResponse.ok) {
      if (currentUserResponse.status === 404) {
        throw new Error(`User not found: ${userId}. Check the user ID, login, or email.`);
      }
      throw new Error(`Failed to fetch current user: HTTP ${currentUserResponse.status}`);
    }

    const currentUser = await currentUserResponse.json();
    console.log(`Found existing user: ${currentUser.profile.login}`);

    // Build the update request body
    const updateBody = {
      // Keep existing profile and merge updates
      profile: {
        ...currentUser.profile,
        ...(profile && profile)
      }
    };

    // Add credentials if provided
    if (credentials) {
      updateBody.credentials = {};
      
      if (credentials.password) {
        updateBody.credentials.password = {
          value: credentials.password.value
        };
        console.log('Updating password credentials');
      }

      if (credentials.provider) {
        updateBody.credentials.provider = credentials.provider;
      }

      if (credentials.recovery_question) {
        updateBody.credentials.recovery_question = credentials.recovery_question;
      }
    }

    // Validate email format if email is being updated
    if (profile && profile.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profile.email)) {
        throw new Error('Invalid email format');
      }
    }

    // Build URL with query parameters
    const url = new URL(`${baseUrl}/api/v1/users/${encodeURIComponent(userId)}`);
    if (strict) {
      url.searchParams.append('strict', 'true');
    }

    console.log('Updating user with request body:', JSON.stringify(updateBody, null, 2));

    // Execute the update request
    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        'Authorization': `SSWS ${apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(updateBody)
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
          suggestion = 'The login/username is invalid or conflicts with existing user.';
        } else if (errorText.includes('email')) {
          suggestion = 'The email address format is invalid or already in use.';
        } else if (errorText.includes('password')) {
          suggestion = 'Password does not meet complexity requirements.';
        }
      } else if (response.status === 403) {
        suggestion = 'Insufficient permissions to update users. Check your API token permissions.';
      } else if (response.status === 409) {
        suggestion = 'Conflict with existing data. Login or email may already be in use.';
      }

      throw new Error(`${errorMessage}${suggestion ? ` Suggestion: ${suggestion}` : ''}`);
    }

    const updatedUser = await response.json();
    
    console.log(`✅ User updated successfully: ${updatedUser.profile.login}`);
    console.log(`   - Status: ${updatedUser.status}`);
    console.log(`   - Last Updated: ${updatedUser.lastUpdated}`);

    // Calculate what fields were actually changed
    const changedFields = [];
    if (profile) {
      Object.keys(profile).forEach(key => {
        if (currentUser.profile[key] !== updatedUser.profile[key]) {
          changedFields.push(key);
        }
      });
    }

    // Return clean, organized response with change summary
    return {
      id: updatedUser.id,
      status: updatedUser.status,
      created: updatedUser.created,
      activated: updatedUser.activated,
      lastUpdated: updatedUser.lastUpdated,
      profile: {
        login: updatedUser.profile.login,
        email: updatedUser.profile.email,
        firstName: updatedUser.profile.firstName,
        lastName: updatedUser.profile.lastName,
        displayName: updatedUser.profile.displayName,
        department: updatedUser.profile.department,
        title: updatedUser.profile.title,
        manager: updatedUser.profile.manager,
        mobilePhone: updatedUser.profile.mobilePhone,
        organization: updatedUser.profile.organization,
        city: updatedUser.profile.city,
        state: updatedUser.profile.state,
        zipCode: updatedUser.profile.zipCode,
        countryCode: updatedUser.profile.countryCode
      },
      credentials: updatedUser.credentials ? {
        provider: updatedUser.credentials.provider
      } : undefined,
      _links: updatedUser._links,
      updateSummary: {
        changedFields: changedFields,
        totalChanges: changedFields.length,
        strictMode: strict
      },
      message: `User '${updatedUser.profile.login}' updated successfully. ${changedFields.length} field(s) changed: ${changedFields.join(', ')}`
    };

  } catch (error) {
    console.error('Error updating user:', error);
    return { 
      error: `Failed to update user: ${error.message}`,
      suggestion: error.message.includes('Suggestion:') ? 
        undefined : 
        "Ensure the user exists and the field values are valid. Check for conflicts with existing users."
    };
  }
};

/**
 * Tool configuration for updating users in Okta.
 * @type {Object}
 */
const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'update_user',
      description: 'Update a user\'s profile and/or credentials in Okta. Supports partial updates and merges changes with existing profile data. Provides detailed change summary.',
      parameters: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'User identifier - can be user ID (00u...), login, or email address'
          },
          profile: {
            type: 'object',
            description: 'Profile fields to update (partial updates supported)',
            properties: {
              login: {
                type: 'string',
                description: 'User\'s unique login identifier'
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
                description: 'User\'s display name'
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
              managerId: {
                type: 'string',
                description: 'User\'s manager ID'
              },
              mobilePhone: {
                type: 'string',
                description: 'User\'s mobile phone number'
              },
              primaryPhone: {
                type: 'string',
                description: 'User\'s primary phone number'
              },
              secondEmail: {
                type: 'string',
                description: 'User\'s secondary email address'
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
              },
              timezone: {
                type: 'string',
                description: 'User\'s timezone'
              },
              locale: {
                type: 'string',
                description: 'User\'s locale'
              },
              preferredLanguage: {
                type: 'string',
                description: 'User\'s preferred language'
              },
              userType: {
                type: 'string',
                description: 'User\'s type'
              },
              employeeNumber: {
                type: 'string',
                description: 'User\'s employee number'
              },
              costCenter: {
                type: 'string',
                description: 'User\'s cost center'
              },
              division: {
                type: 'string',
                description: 'User\'s division'
              }
            }
          },
          credentials: {
            type: 'object',
            description: 'User credentials to update (optional)',
            properties: {
              password: {
                type: 'object',
                description: 'Password information',
                properties: {
                  value: {
                    type: 'string',
                    description: 'New plain text password'
                  }
                },
                required: ['value']
              },
              provider: {
                type: 'object',
                description: 'Authentication provider information',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['OKTA', 'ACTIVE_DIRECTORY', 'LDAP', 'FEDERATION', 'SOCIAL', 'IMPORT'],
                    description: 'Provider type'
                  },
                  name: {
                    type: 'string',
                    description: 'Provider name'
                  }
                }
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
          strict: {
            type: 'boolean',
            description: 'Whether to use strict update semantics (default: false)',
            default: false
          }
        },
        required: ['userId']
      }
    }
  }
};

export { apiTool }; 