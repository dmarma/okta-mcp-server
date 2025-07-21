// Remove a group assignment from an application in Okta

/**
 * Remove a group assignment from an application in Okta.
 * @param {Object} args - Arguments for the removal.
 * @param {string} args.appId - The application ID.
 * @param {string} args.groupId - The group ID to remove.
 * @returns {Promise<Object>} - The result of the removal.
 */
const executeFunction = async ({ appId, groupId }) => {
  if (!appId) throw new Error('Application ID is required');
  if (!groupId) throw new Error('Group ID is required');
  const { getOktaCredentials } = await import('../../lib/tools.js');
  const { domain, apiToken } = await getOktaCredentials();
  const baseUrl = `https://${domain}`;
  const url = `${baseUrl}/api/v1/apps/${encodeURIComponent(appId)}/groups/${encodeURIComponent(groupId)}`;
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
      name: 'remove_app_group_assignment',
      description: 'Remove a group assignment from an application in Okta.',
      parameters: {
        type: 'object',
        properties: {
          appId: { type: 'string', description: 'The application ID.' },
          groupId: { type: 'string', description: 'The group ID to remove.' }
        },
        required: ['appId', 'groupId']
      }
    }
  }
};

export { apiTool }; 