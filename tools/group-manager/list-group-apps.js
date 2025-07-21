// List all applications assigned to a group in Okta

/**
 * List all applications assigned to a group in Okta.
 * @param {Object} args - Arguments for the listing.
 * @param {string} args.groupId - The group ID.
 * @param {string} [args.after] - Pagination cursor (optional).
 * @param {number} [args.limit] - Results per page (optional).
 * @returns {Promise<Object>} - The result of the listing.
 */
const executeFunction = async ({ groupId, after, limit }) => {
  if (!groupId) throw new Error('Group ID is required');
  const { getOktaCredentials } = await import('../../lib/tools.js');
  const { domain, apiToken } = await getOktaCredentials();
  const baseUrl = `https://${domain}`;
  const url = new URL(`${baseUrl}/api/v1/groups/${encodeURIComponent(groupId)}/apps`);
  if (after) url.searchParams.append('after', after);
  if (limit) url.searchParams.append('limit', limit);
  const response = await fetch(url.toString(), {
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
  const apps = await response.json();
  return { success: true, apps };
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'list_group_apps',
      description: 'List all applications assigned to a group in Okta.',
      parameters: {
        type: 'object',
        properties: {
          groupId: { type: 'string', description: 'The group ID.' },
          after: { type: 'string', description: 'Pagination cursor (optional).' },
          limit: { type: 'integer', description: 'Results per page (optional).' }
        },
        required: ['groupId']
      }
    }
  }
};

export { apiTool }; 