/**
 * Function to list groups in an Okta organization.
 *
 * @param {Object} args - Arguments for the group listing.
 * @param {string} [args.q=""] - The search query for groups.
 * @param {string} [args.filter] - Filter expression for groups.
 * @param {string} [args.after] - The pagination cursor for the next page of results.
 * @param {number} [args.limit=200] - The number of results per page.
 * @param {string} [args.sortBy] - The field to sort by.
 * @param {string} [args.sortOrder] - The sort order (asc or desc).
 * @param {string} [args.expand] - An optional parameter for expanding group details.
 * @returns {Promise<Object>} - The result of the group listing.
 */
const executeFunction = async ({ 
  q = "", 
  filter, 
  after, 
  limit = 200, 
  sortBy, 
  sortOrder, 
  expand 
}) => {
  // Import credentials helper
  const { getOktaCredentials } = await import('../../lib/tools.js');
  const { domain, apiToken } = await getOktaCredentials();
  const baseUrl = `https://${domain}`;

  try {
    // Construct the URL with query parameters
    const url = new URL(`${baseUrl}/api/v1/groups`);
    if (q) url.searchParams.append('q', q);
    if (filter) url.searchParams.append('filter', filter);
    if (after) url.searchParams.append('after', after);
    url.searchParams.append('limit', limit.toString());
    if (sortBy) url.searchParams.append('sortBy', sortBy);
    if (sortOrder) url.searchParams.append('sortOrder', sortOrder);
    if (expand) url.searchParams.append('expand', expand);

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
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }

    // Parse and return the response data
    const data = await response.json();
    
    // If looking for "Everyone" group specifically, highlight it
    if (q.toLowerCase().includes('everyone') || !q) {
      const everyoneGroup = data.find(group => 
        group.profile && group.profile.name === 'Everyone'
      );
      if (everyoneGroup) {
        console.log('Found Everyone group:', {
          id: everyoneGroup.id,
          name: everyoneGroup.profile.name,
          description: everyoneGroup.profile.description
        });
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error listing groups:', error);
    return { error: `An error occurred while listing groups: ${error.message}` };
  }
};

/**
 * Tool configuration for listing groups in Okta.
 * @type {Object}
 */
const apiTool = {
  function: executeFunction,
  definition: {
    name: 'list_groups',
    description: 'List groups in an Okta organization.',
    function: {
      name: 'list_groups',
      description: 'List groups in an Okta organization.',
      parameters: {
        type: 'object',
        properties: {
          q: {
            type: 'string',
            description: 'The search query for groups.',
            default: ""
          },
          filter: {
            type: 'string',
            description: 'Filter expression for groups (e.g., type eq "BUILT_IN").'
          },
          after: {
            type: 'string',
            description: 'The pagination cursor for the next page of results.'
          },
          limit: {
            type: 'integer',
            description: 'The number of results per page.',
            default: 200
          },
          sortBy: {
            type: 'string',
            description: 'The field to sort by.'
          },
          sortOrder: {
            type: 'string',
            description: 'The sort order (asc or desc).',
            enum: ['asc', 'desc']
          },
          expand: {
            type: 'string',
            description: 'An optional parameter for expanding group details.'
          }
        },
        required: []
      }
    }
  }
};

export { apiTool }; 