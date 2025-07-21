// Get details for a group in Okta

/**
 * Get details for a group in Okta.
 * @param {Object} args - Arguments for the get.
 * @param {string} args.groupId - The group ID.
 * @returns {Promise<Object>} - The group details.
 */
const executeFunction = async ({ groupId }) => {
  if (!groupId) throw new Error('Group ID is required');
  const { getOktaCredentials } = await import('../../lib/tools.js');
  const { domain, apiToken } = await getOktaCredentials();
  const baseUrl = `https://${domain}`;
  const url = `${baseUrl}/api/v1/groups/${encodeURIComponent(groupId)}`;
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
  const group = await response.json();
  return { success: true, group };
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'get_group',
      description: 'Get details for a group in Okta.',
      parameters: {
        type: 'object',
        properties: {
          groupId: { type: 'string', description: 'The group ID.' }
        },
        required: ['groupId']
      }
    }
  }
};

export { apiTool }; 