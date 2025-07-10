/**
 * Function to list all applications in an Okta organization.
 *
 * @param {Object} args - Arguments for the application listing.
 * @param {string} [args.q=""] - The search query for applications.
 * @param {string} [args.after] - The pagination cursor for the next page of results.
 * @param {boolean} [args.useOptimization=false] - Whether to use query optimization.
 * @param {number} [args.limit=-1] - The number of results per page.
 * @param {string} [args.filter='status eq "ACTIVE"'] - Filters apps by status.
 * @param {string} [args.expand] - An optional parameter for link expansion.
 * @param {boolean} [args.includeNonDeleted=false] - Whether to include non-active apps.
 * @returns {Promise<Object>} - The result of the application listing.
 */
const executeFunction = async ({ q = "", after, useOptimization = false, limit = -1, filter = 'status eq "ACTIVE"', expand, includeNonDeleted = false }) => {
  if (!process.env.OKTA_DOMAIN) {
    throw new Error('OKTA_DOMAIN environment variable is not set');
  }
  const baseUrl = `https://${process.env.OKTA_DOMAIN}`;
  const apiToken = process.env.OKTA_API_KEY;

  try {
    // Construct the URL with query parameters
    const url = new URL(`${baseUrl}/api/v1/apps`);
    if (q) url.searchParams.append('q', q);
    if (after) url.searchParams.append('after', after);
    url.searchParams.append('useOptimization', useOptimization.toString());
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('filter', filter);
    if (expand) url.searchParams.append('expand', expand);
    url.searchParams.append('includeNonDeleted', includeNonDeleted.toString());

    // Set up headers for the request
    const headers = {
      'Authorization': `SSWS ${apiToken}`,
      'Accept': 'application/json'
    };

    // Perform the fetch request
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers
    });

    // Check if the response was successful
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData);
    }

    // Parse and return the response data
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error listing applications:', error);
    return { error: 'An error occurred while listing applications.' };
  }
};

/**
 * Tool configuration for listing applications in Okta.
 * @type {Object}
 */
const apiTool = {
  function: executeFunction,
  definition: {
    name: 'list_all_applications',
    description: 'List all applications in an Okta organization.',
    function: {
      name: 'list_all_applications',
      description: 'List all applications in an Okta organization.',
      parameters: {
        type: 'object',
        properties: {
          q: {
            type: 'string',
            description: 'The search query for applications.',
            default: ""
          },
          after: {
            type: 'string',
            description: 'The pagination cursor for the next page of results.'
          },
          useOptimization: {
            type: 'boolean',
            description: 'Whether to use query optimization.',
            default: false
          },
          limit: {
            type: 'integer',
            description: 'The number of results per page.',
            default: -1
          },
          filter: {
            type: 'string',
            description: 'Filters apps by status.',
            default: 'status eq "ACTIVE"'
          },
          expand: {
            type: 'string',
            description: 'An optional parameter for link expansion.'
          },
          includeNonDeleted: {
            type: 'boolean',
            description: 'Whether to include non-active apps.',
            default: false
          }
        },
        required: []
      }
    }
  }
};

export { apiTool };