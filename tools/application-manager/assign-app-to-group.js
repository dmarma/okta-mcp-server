// Assign an application to a group in Okta

/**
 * Assign an application to a group in Okta.
 * @param {Object} args - Arguments for the assignment.
 * @param {string} args.appId - The application ID.
 * @param {string} args.groupId - The group ID to assign.
 * @param {number} [args.priority] - Optional priority (0-100).
 * @returns {Promise<Object>} - The result of the assignment.
 */
const executeFunction = async ({ appId, groupId, priority }) => {
  if (!appId) throw new Error('Application ID is required');
  if (!groupId) throw new Error('Group ID is required');
  const { getOktaCredentials } = await import('../../lib/tools.js');
  const { domain, apiToken } = await getOktaCredentials();
  const baseUrl = `https://${domain}`;
  const url = `${baseUrl}/api/v1/apps/${encodeURIComponent(appId)}/groups/${encodeURIComponent(groupId)}`;
  const body = priority !== undefined ? { priority } : undefined;
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
      name: 'assign_app_to_group',
      description: 'Assign an application to a group in Okta.',
      parameters: {
        type: 'object',
        properties: {
          appId: { type: 'string', description: 'The application ID.' },
          groupId: { type: 'string', description: 'The group ID to assign.' },
          priority: { type: 'integer', description: 'Optional priority (0-100).' }
        },
        required: ['appId', 'groupId']
      }
    }
  }
};

export { apiTool }; 