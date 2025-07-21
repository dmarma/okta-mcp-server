// Update an application in Okta (OIDC apps only)

/**
 * Update an OIDC application in Okta.
 * @param {Object} args - Arguments for the update.
 * @param {string} args.appId - The application ID.
 * @param {string} args.label - The new label for the application.
 * @param {object} [args.settings] - Optional settings object.
 * @returns {Promise<Object>} - The updated application details.
 */
const executeFunction = async ({ appId, label, settings }) => {
  if (!appId) throw new Error('Application ID is required');
  if (!label) throw new Error('Label is required');
  const { getOktaCredentials } = await import('../../lib/tools.js');
  const { domain, apiToken } = await getOktaCredentials();
  const baseUrl = `https://${domain}`;
  const url = `${baseUrl}/api/v1/apps/${encodeURIComponent(appId)}`;
  const body = { label };
  if (settings) body.settings = settings;
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
  const data = await response.json();
  return { success: true, application: data };
};

const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'update_application',
      description: 'Update an OIDC application in Okta.',
      parameters: {
        type: 'object',
        properties: {
          appId: { type: 'string', description: 'The application ID.' },
          label: { type: 'string', description: 'The new label for the application.' },
          settings: { type: 'object', description: 'Optional settings object.' }
        },
        required: ['appId', 'label']
      }
    }
  }
};

export { apiTool }; 