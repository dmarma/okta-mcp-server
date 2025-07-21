// Update a group in Okta

/**
 * Update a group in Okta.
 * @param {Object} args - Arguments for the update.
 * @param {string} args.groupId - The group ID.
 * @param {string} args.name - The new group name.
 * @param {string} [args.description] - The new group description.
 * @returns {Promise<Object>} - The updated group details.
 */
const executeFunction = async ({ groupId, name, description }) => {
  if (!groupId) throw new Error('Group ID is required');
  if (!name) throw new Error('Group name is required');
  const { getOktaCredentials } = await import('../../lib/tools.js');
  const { domain, apiToken } = await getOktaCredentials();
  const baseUrl = `https://${domain}`;
  const url = `${baseUrl}/api/v1/groups/${encodeURIComponent(groupId)}`;
  const body = {
    profile: {
      name,
      description: description || ''
    }
  };
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `SSWS ${apiToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
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
      name: 'update_group',
      description: 'Update a group in Okta.',
      parameters: {
        type: 'object',
        properties: {
          groupId: { type: 'string', description: 'The group ID.' },
          name: { type: 'string', description: 'The new group name.' },
          description: { type: 'string', description: 'The new group description.' }
        },
        required: ['groupId', 'name']
      }
    }
  }
};

export { apiTool }; 