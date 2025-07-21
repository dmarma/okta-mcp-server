// List all users assigned to an application in Okta

/**
 * List all users assigned to an application in Okta.
 * @param {Object} args - Arguments for the listing.
 * @param {string} args.appId - The application ID.
 * @returns {Promise<Object>} - The result of the listing.
 */
const executeFunction = async ({ appId }) => {
  if (!appId) throw new Error('Application ID is required');
  const { getOktaCredentials } = await import('../../lib/tools.js');
  const { domain, apiToken } = await getOktaCredentials();
  const baseUrl = `https://${domain}`;
  const url = `${baseUrl}/api/v1/apps/${encodeURIComponent(appId)}/users`;
  const response = await fetch(url, {
    method: 'GET',
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
  const data = await response.json();
  return { success: true, users: data };
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'list_app_user_assignments',
      description: 'List all users assigned to an application in Okta.',
      parameters: {
        type: 'object',
        properties: {
          appId: { type: 'string', description: 'The application ID.' }
        },
        required: ['appId']
      }
    }
  }
};

export { apiTool }; 