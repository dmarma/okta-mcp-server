/**
 * Function to deactivate a user in an Okta organization.
 *
 * @param {Object} args - Arguments for deactivating the user.
 * @param {string} args.userId - User ID, login, or email to deactivate.
 * @param {boolean} [args.sendEmail=false] - Whether to send a deactivation email to the user.
 * @returns {Promise<Object>} - The result of the user deactivation.
 */
const executeFunction = async ({ 
  userId, 
  sendEmail = false 
}) => {
  console.log('=== DEACTIVATE USER DEBUG ===');
  console.log('User ID/Login:', userId);
  console.log('Send email:', sendEmail);
  console.log('==============================');

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

    // Check if user is already deactivated
    if (currentUser.status === 'DEPROVISIONED') {
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
        message: `User '${currentUser.profile.login}' is already deactivated`,
        warning: 'No action taken - user was already in DEPROVISIONED status'
      };
    }

    // Check if user can be deactivated (must be ACTIVE, STAGED, PROVISIONED, or SUSPENDED)
    const deactivatableStatuses = ['ACTIVE', 'STAGED', 'PROVISIONED', 'SUSPENDED', 'PASSWORD_EXPIRED', 'LOCKED_OUT', 'RECOVERY'];
    if (!deactivatableStatuses.includes(currentUser.status)) {
      throw new Error(`Cannot deactivate user with status '${currentUser.status}'. User must be in one of: ${deactivatableStatuses.join(', ')}`);
    }

    // Build URL for deactivation
    const url = new URL(`${baseUrl}/api/v1/users/${encodeURIComponent(userId)}/lifecycle/deactivate`);
    
    // Add sendEmail parameter if specified
    if (sendEmail) {
      url.searchParams.append('sendEmail', 'true');
      console.log('Deactivation email will be sent to user');
    }

    console.log(`Deactivating user: ${currentUser.profile.login}`);

    // Execute the deactivation request
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
        suggestion = 'Insufficient permissions to deactivate users. Check your API token permissions.';
      } else if (response.status === 400) {
        suggestion = 'User cannot be deactivated in current state. Check user status and dependencies.';
      }

      throw new Error(`${errorMessage}${suggestion ? ` Suggestion: ${suggestion}` : ''}`);
    }

    const deactivatedUser = await response.json();
    
    console.log(`✅ User deactivated successfully: ${deactivatedUser.profile.login}`);
    console.log(`   - New Status: ${deactivatedUser.status}`);
    console.log(`   - Status Changed: ${deactivatedUser.statusChanged}`);

    // Return comprehensive response
    return {
      id: deactivatedUser.id,
      status: deactivatedUser.status,
      previousStatus: currentUser.status,
      statusChanged: deactivatedUser.statusChanged,
      lastUpdated: deactivatedUser.lastUpdated,
      profile: {
        login: deactivatedUser.profile.login,
        email: deactivatedUser.profile.email,
        firstName: deactivatedUser.profile.firstName,
        lastName: deactivatedUser.profile.lastName,
        displayName: deactivatedUser.profile.displayName,
        department: deactivatedUser.profile.department,
        title: deactivatedUser.profile.title
      },
      _links: deactivatedUser._links,
      deactivationSummary: {
        emailSent: sendEmail,
        previousStatus: currentUser.status,
        newStatus: deactivatedUser.status,
        canBeReactivated: true
      },
      message: `User '${deactivatedUser.profile.login}' has been deactivated. Status changed from '${currentUser.status}' to '${deactivatedUser.status}'${sendEmail ? '. Deactivation email sent.' : '.'}`
    };

  } catch (error) {
    console.error('Error deactivating user:', error);
    return { 
      error: `Failed to deactivate user: ${error.message}`,
      suggestion: error.message.includes('Suggestion:') ? 
        undefined : 
        "Ensure the user exists and is in a status that allows deactivation (ACTIVE, STAGED, PROVISIONED, etc.)."
    };
  }
};

/**
 * Tool configuration for deactivating users in Okta.
 * @type {Object}
 */
const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'deactivate_user',
      description: 'Deactivate a user in Okta, transitioning them to DEPROVISIONED status. Checks current status and provides detailed feedback. Optionally sends notification email.',
      parameters: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'User identifier - can be user ID (00u...), login, or email address'
          },
          sendEmail: {
            type: 'boolean',
            description: 'Whether to send a deactivation email notification to the user (default: false)',
            default: false
          }
        },
        required: ['userId']
      }
    }
  }
};

export { apiTool }; 