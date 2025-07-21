// Remove a user from a group in Okta

/**
 * Remove a user from a group in Okta.
 * @param {Object} args - Arguments for the removal.
 * @param {string} args.groupId - The group ID.
 * @param {string} args.userId - The user ID to remove.
 * @returns {Promise<Object>} - The result of the removal.
 */
const executeFunction = async ({ groupId, userId }) => {
  if (!groupId) throw new Error('Group ID is required');
  if (!userId) throw new Error('User ID is required');
  const { getOktaCredentials } = await import('../../lib/tools.js');
  const { domain, apiToken } = await getOktaCredentials();
  const baseUrl = `https://${domain}`;
  const url = `${baseUrl}/api/v1/groups/${encodeURIComponent(groupId)}/users/${encodeURIComponent(userId)}`;
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
      name: 'remove_user_from_group',
      description: 'Remove a user from a group in Okta.',
      parameters: {
        type: 'object',
        properties: {
          groupId: { type: 'string', description: 'The group ID.' },
          userId: { type: 'string', description: 'The user ID to remove.' }
        },
        required: ['groupId', 'userId']
      }
    }
  }
};

export { apiTool }; 