// List policies in Okta

/**
 * List policies in Okta.
 * @param {Object} args - Arguments for the listing.
 * @param {string} [args.type] - Policy type (optional).
 * @param {string} [args.status] - Policy status (optional).
 * @param {string} [args.q] - Search query (optional).
 * @returns {Promise<Object>} - The result of the listing.
 */
const executeFunction = async ({ type, status, q }) => {
  const { getOktaCredentials } = await import('../../lib/tools.js');
  const { domain, apiToken } = await getOktaCredentials();
  const baseUrl = `https://${domain}`;
  const url = new URL(`${baseUrl}/api/v1/policies`);
  if (type) url.searchParams.append('type', type);
  if (status) url.searchParams.append('status', status);
  if (q) url.searchParams.append('q', q);
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
  const policies = await response.json();
  return { success: true, policies };
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'list_policies',
      description: 'List policies in Okta.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Policy type (optional).' },
          status: { type: 'string', description: 'Policy status (optional).' },
          q: { type: 'string', description: 'Search query (optional).' }
        }
      }
    }
  }
};

export { apiTool }; 