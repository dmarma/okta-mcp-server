// Assign a policy to an application in Okta

/**
 * Assign a policy to an application in Okta.
 * @param {Object} args - Arguments for the assignment.
 * @param {string} args.policyId - The policy ID.
 * @param {string} args.appId - The application ID to assign.
 * @returns {Promise<Object>} - The result of the assignment.
 */
const executeFunction = async ({ policyId, appId }) => {
  if (!policyId) throw new Error('Policy ID is required');
  if (!appId) throw new Error('App ID is required');

  console.log('=== ASSIGN POLICY TO APP DEBUG ===');
  console.log('Policy ID:', policyId);
  console.log('App ID:', appId);
  console.log('===================================');

  // Import credentials helper
  const { getOktaCredentials } = await import('../../lib/tools.js');
  const { domain, apiToken } = await getOktaCredentials();
  const baseUrl = `https://${domain}`;
  
  // Use the correct endpoint: PUT /api/v1/apps/{appId}/policies/{policyId}
  const url = `${baseUrl}/api/v1/apps/${appId}/policies/${policyId}`;
  
  console.log('Assigning policy to app at:', url);
  console.log('Method: PUT (no request body)');

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `SSWS ${apiToken}`,
      'Accept': 'application/json',
    },
    // No body needed for this endpoint
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try { errorData = JSON.parse(errorText); } catch { errorData = { error: errorText }; }
    
    // Provide helpful error messages
    let errorMessage = `HTTP ${response.status}: ${JSON.stringify(errorData)}`;
    if (response.status === 400) {
      errorMessage += ' - The policy may not be compatible with this application type or the application may already have a policy assigned.';
    } else if (response.status === 404) {
      errorMessage += ' - The application or policy may not exist or you may not have permission to access it.';
    } else if (response.status === 403) {
      errorMessage += ' - You do not have permission to perform this action. Check your API token permissions.';
    }
    
    throw new Error(errorMessage);
  }
  
  console.log('✅ Policy assigned successfully');
  console.log('Response status:', response.status);
  
  return {
    success: true,
    policyId: policyId,
    appId: appId,
    message: `Policy '${policyId}' successfully assigned to application '${appId}'`,
    note: 'This endpoint returns 204 No Content on success'
  };
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'assign_policy_to_app',
      description: 'Assign a policy to an application in Okta using PUT /api/v1/apps/{appId}/policies/{policyId}.',
      parameters: {
        type: 'object',
        properties: {
          policyId: { type: 'string', description: 'The policy ID to assign.' },
          appId: { type: 'string', description: 'The application ID to assign the policy to.' }
        },
        required: ['policyId', 'appId']
      }
    }
  }
};

export { apiTool }; 