/**
 * Function to fetch a specific user from an Okta organization.
 *
 * @param {Object} args - Arguments for fetching the user.
 * @param {string} args.userId - User ID, login, or email to fetch.
 * @returns {Promise<Object>} - The user information.
 */
const executeFunction = async ({ userId }) => {
  console.log('=== GET USER DEBUG ===');
  console.log('User ID/Login:', userId);
  console.log('======================');

  // Import credentials helper from manual server
  const { getOktaCredentials } = await import('../../lib/tools.js');
  
  try {
    // Validate required parameter
    if (!userId) {
      throw new Error('userId is required (can be user ID, login, or email)');
    }

    const { domain, apiToken } = await getOktaCredentials();
    const baseUrl = `https://${domain}`;

    // Build URL - Okta accepts user ID, login, or email
    const url = `${baseUrl}/api/v1/users/${encodeURIComponent(userId)}`;

    console.log(`Fetching user from: ${url}`);

    // Execute the request
    const response = await fetch(url, {
      method: 'GET',
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

      if (response.status === 404) {
        throw new Error(`User not found: ${userId}. Check the user ID, login, or email.`);
      } else if (response.status === 403) {
        throw new Error('Insufficient permissions to view user details. Check your API token permissions.');
      }

      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const userData = await response.json();
    
    console.log(`✅ User found: ${userData.profile.login}`);
    console.log(`   - Status: ${userData.status}`);
    console.log(`   - Last Updated: ${userData.lastUpdated}`);

    // Calculate user activity status
    const lastLogin = userData.lastLogin ? new Date(userData.lastLogin) : null;
    const daysSinceLastLogin = lastLogin ? 
      Math.floor((new Date() - lastLogin) / (1000 * 60 * 60 * 24)) : null;

    // Return comprehensive user information
    return {
      id: userData.id,
      status: userData.status,
      created: userData.created,
      activated: userData.activated,
      statusChanged: userData.statusChanged,
      lastLogin: userData.lastLogin,
      lastUpdated: userData.lastUpdated,
      passwordChanged: userData.passwordChanged,
      profile: {
        login: userData.profile.login,
        email: userData.profile.email,
        firstName: userData.profile.firstName,
        lastName: userData.profile.lastName,
        displayName: userData.profile.displayName,
        department: userData.profile.department,
        title: userData.profile.title,
        manager: userData.profile.manager,
        managerId: userData.profile.managerId,
        organization: userData.profile.organization,
        city: userData.profile.city,
        state: userData.profile.state,
        zipCode: userData.profile.zipCode,
        countryCode: userData.profile.countryCode,
        mobilePhone: userData.profile.mobilePhone,
        primaryPhone: userData.profile.primaryPhone,
        secondEmail: userData.profile.secondEmail,
        timezone: userData.profile.timezone,
        locale: userData.profile.locale,
        preferredLanguage: userData.profile.preferredLanguage,
        userType: userData.profile.userType,
        employeeNumber: userData.profile.employeeNumber,
        costCenter: userData.profile.costCenter,
        division: userData.profile.division
      },
      credentials: userData.credentials ? {
        provider: userData.credentials.provider
      } : undefined,
      type: userData.type,
      transitioningToStatus: userData.transitioningToStatus,
      _links: userData._links,
      // Enhanced activity information
      activityInfo: {
        daysSinceLastLogin: daysSinceLastLogin,
        isActive: userData.status === 'ACTIVE',
        hasLoggedIn: !!userData.lastLogin,
        accountAge: userData.created ? 
          Math.floor((new Date() - new Date(userData.created)) / (1000 * 60 * 60 * 24)) : null
      }
    };

  } catch (error) {
    console.error('Error fetching user:', error);
    return { 
      error: `Failed to fetch user: ${error.message}`,
      suggestion: "Ensure the user ID, login, or email is correct and you have permission to view user details."
    };
  }
};

/**
 * Tool configuration for fetching a specific user from Okta.
 * @type {Object}
 */
const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'get_user',
      description: 'Fetch detailed information about a specific user in Okta. Supports lookup by user ID, login, or email address. Returns comprehensive profile and activity information.',
      parameters: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'User identifier - can be user ID (00u...), login, or email address'
          }
        },
        required: ['userId']
      }
    }
  }
};

export { apiTool }; 