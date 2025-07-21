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
  // Map common prompt terms to Okta policy types
  const typeMap = {
    'app policy': 'ACCESS_POLICY',
    'application policy': 'ACCESS_POLICY',
    'access policy': 'ACCESS_POLICY',
    'global policy': 'OKTA_SIGN_ON',
    'sign on policy': 'OKTA_SIGN_ON',
    'okta sign on': 'OKTA_SIGN_ON',
    'password policy': 'PASSWORD',
    'mfa enroll': 'MFA_ENROLL',
    'idp discovery': 'IDP_DISCOVERY',
    'profile enrollment': 'PROFILE_ENROLLMENT',
    'post auth session': 'POST_AUTH_SESSION',
    'entity risk': 'ENTITY_RISK'
  };
  let resolvedType = type;
  if (type && typeof type === 'string') {
    const normalized = type.trim().toLowerCase();
    if (typeMap[normalized]) {
      resolvedType = typeMap[normalized];
    }
  }
  // Default to ACCESS_POLICY if not specified
  if (!resolvedType) {
    resolvedType = 'ACCESS_POLICY';
  }
  const { getOktaCredentials } = await import('../../lib/tools.js');
  const { domain, apiToken } = await getOktaCredentials();
  const baseUrl = `https://${domain}`;
  const url = new URL(`${baseUrl}/api/v1/policies`);
  if (resolvedType) url.searchParams.append('type', resolvedType);
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