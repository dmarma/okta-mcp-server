/**
 * Function to activate a user in an Okta organization.
 *
 * @param {Object} args - Arguments for activating the user.
 * @param {string} args.userId - User ID, login, or email to activate.
 * @param {boolean} [args.sendEmail=true] - Whether to send an activation email to the user.
 * @returns {Promise<Object>} - The result of the user activation.
 */
const executeFunction = async ({ 
  userId, 
  sendEmail = true 
}) => {
  console.log('=== ACTIVATE USER DEBUG ===');
  console.log('User ID/Login:', userId);
  console.log('Send email:', sendEmail);
  console.log('============================');

  // Import credentials helper from manual server
  const { getOktaCredentials } = await import('../../lib/tools.js');
  
  try {
    // Validate required parameter
    if (!userId) {
      throw new Error('userId is required (can be user ID, login, or email)');
    }

    const { domain, apiToken } = await getOktaCredentials();
    const baseUrl = `https://${domain}`;

    // First, get the current user to check status and get details
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
      throw new Error(`Failed to fetch user: HTTP ${currentUserResponse.status}`);
    }

    const currentUser = await currentUserResponse.json();
    console.log(`Found user: ${currentUser.profile.login} (Status: ${currentUser.status})`);

    // Check if user is already active
    if (currentUser.status === 'ACTIVE') {
      return {
        id: currentUser.id,
        status: currentUser.status,
        profile: {
          login: currentUser.profile.login,
          email: currentUser.profile.email,
          firstName: currentUser.profile.firstName,
          lastName: currentUser.profile.lastName,
          displayName: currentUser.profile.displayName
        },
        message: `User '${currentUser.profile.login}' is already active`,
        warning: 'No action taken - user was already in ACTIVE status'
      };
    }

    // Check if user can be activated
    const activatableStatuses = ['STAGED', 'PROVISIONED', 'DEPROVISIONED', 'SUSPENDED'];
    if (!activatableStatuses.includes(currentUser.status)) {
      throw new Error(`Cannot activate user with status '${currentUser.status}'. User must be in one of: ${activatableStatuses.join(', ')}`);
    }

    // Build URL for activation
    const url = new URL(`${baseUrl}/api/v1/users/${encodeURIComponent(userId)}/lifecycle/activate`);
    
    // Add sendEmail parameter
    url.searchParams.append('sendEmail', sendEmail.toString());
    
    if (sendEmail) {
      console.log('Activation email will be sent to user');
    } else {
      console.log('No activation email will be sent');
    }

    console.log(`Activating user: ${currentUser.profile.login}`);

    // Execute the activation request
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `SSWS ${apiToken}`,
        'Accept': 'application/json'
      }
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

      if (response.status === 403) {
        suggestion = 'Insufficient permissions to activate users. Check your API token permissions.';
      } else if (response.status === 400) {
        if (errorText.includes('password')) {
          suggestion = 'User may need a password set before activation. Try creating user with credentials first.';
        } else {
          suggestion = 'User cannot be activated in current state. Check user status and dependencies.';
        }
      }

      throw new Error(`${errorMessage}${suggestion ? ` Suggestion: ${suggestion}` : ''}`);
    }

    const activatedUser = await response.json();
    
    console.log(`✅ User activated successfully: ${activatedUser.profile.login}`);
    console.log(`   - New Status: ${activatedUser.status}`);
    console.log(`   - Status Changed: ${activatedUser.statusChanged}`);

    // Return comprehensive response
    return {
      id: activatedUser.id,
      status: activatedUser.status,
      previousStatus: currentUser.status,
      statusChanged: activatedUser.statusChanged,
      activated: activatedUser.activated,
      lastUpdated: activatedUser.lastUpdated,
      profile: {
        login: activatedUser.profile.login,
        email: activatedUser.profile.email,
        firstName: activatedUser.profile.firstName,
        lastName: activatedUser.profile.lastName,
        displayName: activatedUser.profile.displayName,
        department: activatedUser.profile.department,
        title: activatedUser.profile.title
      },
      _links: activatedUser._links,
      activationSummary: {
        emailSent: sendEmail,
        previousStatus: currentUser.status,
        newStatus: activatedUser.status,
        activatedDate: activatedUser.activated,
        canLogin: activatedUser.status === 'ACTIVE'
      },
      message: `User '${activatedUser.profile.login}' has been activated. Status changed from '${currentUser.status}' to '${activatedUser.status}'${sendEmail ? '. Activation email sent.' : '.'}`
    };

  } catch (error) {
    console.error('Error activating user:', error);
    return { 
      error: `Failed to activate user: ${error.message}`,
      suggestion: error.message.includes('Suggestion:') ? 
        undefined : 
        "Ensure the user exists and is in a status that allows activation (STAGED, PROVISIONED, DEPROVISIONED, SUSPENDED)."
    };
  }
};

/**
 * Tool configuration for activating users in Okta.
 * @type {Object}
 */
const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'activate_user',
      description: 'Activate a user in Okta, transitioning them to ACTIVE status. Checks current status and provides detailed feedback. Optionally sends activation email with login instructions.',
      parameters: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'User identifier - can be user ID (00u...), login, or email address'
          },
          sendEmail: {
            type: 'boolean',
            description: 'Whether to send an activation email with login instructions to the user (default: true)',
            default: true
          }
        },
        required: ['userId']
      }
    }
  }
};

export { apiTool }; 