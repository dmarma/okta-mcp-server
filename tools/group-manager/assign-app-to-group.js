/**
 * Function to assign an application to a group in Okta.
 *
 * @param {Object} args - Arguments for the application group assignment.
 * @param {string} args.appId - The ID of the application to assign.
 * @param {string} args.groupId - The ID of the group to assign the application to.
 * @param {number} [args.priority] - Priority of the assignment (0-100, lower number = higher priority).
 * @param {Object} [args.profile] - Application-specific profile properties for the group assignment.
 * @returns {Promise<Object>} - The result of the assignment operation.
 */
const executeFunction = async ({ appId, groupId, priority, profile = {} }) => {
  if (!process.env.OKTA_DOMAIN) {
    throw new Error('OKTA_DOMAIN environment variable is not set');
  }
  const baseUrl = `https://${process.env.OKTA_DOMAIN}`;
  const apiToken = process.env.OKTA_PUBLIC_API_COLLECTIONS_API_KEY;

  // Validate required parameters
  if (!appId) {
    throw new Error('appId is required');
  }
  if (!groupId) {
    throw new Error('groupId is required');
  }

  console.log(`Assigning application ${appId} to group ${groupId}`);

  try {
    // Build the request body
    const requestBody = {
      priority: priority || 0,
      profile: profile
    };

    console.log('Assignment request body:', JSON.stringify(requestBody, null, 2));

    // Make the API call to assign the app to the group
    const response = await fetch(`${baseUrl}/api/v1/apps/${appId}/groups/${groupId}`, {
      method: 'PUT',
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
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    // Return useful information about the assignment
    return {
      id: data.id,
      lastUpdated: data.lastUpdated,
      priority: data.priority,
      profile: data.profile,
      _links: data._links,
      message: `Successfully assigned application ${appId} to group ${groupId}`
    };
  } catch (error) {
    console.error('Error assigning application to group:', error);
    return { error: `An error occurred while assigning the application to group: ${error.message}` };
  }
};

/**
 * Tool configuration for assigning applications to groups in Okta.
 * @type {Object}
 */
const apiTool = {
  function: executeFunction,
  definition: {
    name: 'assign_application_to_group',
    description: 'Assign an application to a group in Okta.',
    function: {
      name: 'assign_application_to_group',
      description: 'Assign an application to a group in Okta.',
      parameters: {
        type: 'object',
        properties: {
          appId: {
            type: 'string',
            description: 'The ID of the application to assign.'
          },
          groupId: {
            type: 'string',
            description: 'The ID of the group to assign the application to.'
          },
          priority: {
            type: 'integer',
            description: 'Priority of the assignment (0-100, lower number = higher priority).',
            minimum: 0,
            maximum: 100,
            default: 0
          },
          profile: {
            type: 'object',
            description: 'Application-specific profile properties for the group assignment.',
            default: {}
          }
        },
        required: ['appId', 'groupId']
      }
    }
  }
};

export { apiTool }; 