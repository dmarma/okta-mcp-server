// List all resources (apps) mapped to a policy in Okta

/**
 * List all resources (apps) mapped to a policy in Okta.
 * @param {Object} args - Arguments for the listing.
 * @param {string} args.policyId - The policy ID.
 * @returns {Promise<Object>} - The result of the listing.
 */
const executeFunction = async ({ policyId }) => {
  if (!policyId) throw new Error('Policy ID is required');
  const { getOktaCredentials } = await import('../../lib/tools.js');
  const { domain, apiToken } = await getOktaCredentials();
  const baseUrl = `https://${domain}`;
  const url = `${baseUrl}/api/v1/policies/${policyId}/mappings`;
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
  return { success: true, mappings: data }; // You may want to format this further
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'list_policy_mappings',
      description: 'List all resources (apps) mapped to a policy in Okta.',
      parameters: {
        type: 'object',
        properties: {
          policyId: { type: 'string', description: 'The policy ID.' }
        },
        required: ['policyId']
      }
    }
  }
};

export { apiTool }; 