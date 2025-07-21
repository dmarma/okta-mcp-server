// Create a new group in Okta

/**
 * Create a new group in Okta.
 * @param {Object} args - Arguments for the group creation.
 * @param {string} args.name - The group name.
 * @param {string} [args.description] - The group description.
 * @returns {Promise<Object>} - The created group details.
 */
const executeFunction = async ({ name, description }) => {
  if (!name) throw new Error('Group name is required');
  const { getOktaCredentials } = await import('../../lib/tools.js');
  const { domain, apiToken } = await getOktaCredentials();
  const baseUrl = `https://${domain}`;
  const url = `${baseUrl}/api/v1/groups`;
  const body = {
    profile: {
      name,
      description: description || ''
    }
  };
  const response = await fetch(url, {
    method: 'POST',
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
      name: 'create_group',
      description: 'Create a new group in Okta.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'The group name.' },
          description: { type: 'string', description: 'The group description.' }
        },
        required: ['name']
      }
    }
  }
};

export { apiTool }; 