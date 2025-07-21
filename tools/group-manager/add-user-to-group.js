// Add a user to a group in Okta

/**
 * Add a user to a group in Okta.
 * @param {Object} args - Arguments for the addition.
 * @param {string} args.groupId - The group ID.
 * @param {string} args.userId - The user ID to add.
 * @returns {Promise<Object>} - The result of the addition.
 */
const executeFunction = async ({ groupId, userId }) => {
  if (!groupId) throw new Error('Group ID is required');
  if (!userId) throw new Error('User ID is required');
  const { getOktaCredentials } = await import('../../lib/tools.js');
  const { domain, apiToken } = await getOktaCredentials();
  const baseUrl = `https://${domain}`;
  const url = `${baseUrl}/api/v1/groups/${encodeURIComponent(groupId)}/users/${encodeURIComponent(userId)}`;
  const response = await fetch(url, {
    method: 'PUT',
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
      name: 'add_user_to_group',
      description: 'Add a user to a group in Okta.',
      parameters: {
        type: 'object',
        properties: {
          groupId: { type: 'string', description: 'The group ID.' },
          userId: { type: 'string', description: 'The user ID to add.' }
        },
        required: ['groupId', 'userId']
      }
    }
  }
};

export { apiTool }; 