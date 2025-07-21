// Assign a user to an application in Okta

/**
 * Assign a user to an application in Okta.
 * @param {Object} args - Arguments for the assignment.
 * @param {string} args.appId - The application ID.
 * @param {string} args.userId - The user ID to assign.
 * @param {string} [args.scope] - Optional scope.
 * @returns {Promise<Object>} - The result of the assignment.
 */
const executeFunction = async ({ appId, userId, scope }) => {
  if (!appId) throw new Error('Application ID is required');
  if (!userId) throw new Error('User ID is required');
  const { getOktaCredentials } = await import('../../lib/tools.js');
  const { domain, apiToken } = await getOktaCredentials();
  const baseUrl = `https://${domain}`;
  const url = `${baseUrl}/api/v1/apps/${encodeURIComponent(appId)}/users/${encodeURIComponent(userId)}`;
  const body = scope ? { scope } : undefined;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `SSWS ${apiToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try { errorData = JSON.parse(errorText); } catch { errorData = { error: errorText }; }
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
  }
  const data = await response.json();
  return { success: true, assignment: data };
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'assign_user_to_app',
      description: 'Assign a user to an application in Okta.',
      parameters: {
        type: 'object',
        properties: {
          appId: { type: 'string', description: 'The application ID.' },
          userId: { type: 'string', description: 'The user ID to assign.' },
          scope: { type: 'string', description: 'Optional scope.' }
        },
        required: ['appId', 'userId']
      }
    }
  }
};

export { apiTool }; 