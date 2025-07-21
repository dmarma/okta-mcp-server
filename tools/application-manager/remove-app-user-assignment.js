// Remove a user assignment from an application in Okta

/**
 * Remove a user assignment from an application in Okta.
 * @param {Object} args - Arguments for the removal.
 * @param {string} args.appId - The application ID.
 * @param {string} args.userId - The user ID to remove.
 * @returns {Promise<Object>} - The result of the removal.
 */
const executeFunction = async ({ appId, userId }) => {
  if (!appId) throw new Error('Application ID is required');
  if (!userId) throw new Error('User ID is required');
  const { getOktaCredentials } = await import('../../lib/tools.js');
  const { domain, apiToken } = await getOktaCredentials();
  const baseUrl = `https://${domain}`;
  const url = `${baseUrl}/api/v1/apps/${encodeURIComponent(appId)}/users/${encodeURIComponent(userId)}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `SSWS ${apiToken}`,
      'Accept': 'application/json',
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try { errorData = JSON.parse(errorText); } catch { errorData = { error: errorText }; }
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
  }
  return { success: true };
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'remove_app_user_assignment',
      description: 'Remove a user assignment from an application in Okta.',
      parameters: {
        type: 'object',
        properties: {
          appId: { type: 'string', description: 'The application ID.' },
          userId: { type: 'string', description: 'The user ID to remove.' }
        },
        required: ['appId', 'userId']
      }
    }
  }
};

export { apiTool }; 