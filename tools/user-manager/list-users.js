/**
 * Function to list users in an Okta organization with advanced filtering.
 *
 * @param {Object} args - Arguments for the user listing.
 * @param {string} [args.q] - Search query for users (searches firstName, lastName, email).
 * @param {string} [args.after] - Pagination cursor for the next page of results.
 * @param {number} [args.limit=200] - Number of results per page (max 200).
 * @param {string} [args.filter] - Advanced filter expression (e.g., 'status eq "ACTIVE"').
 * @param {string} [args.search] - SCIM-compliant search expression.
 * @returns {Promise<Object>} - The result of the user listing.
 */
const executeFunction = async ({ 
  q, 
  after, 
  limit = 200, 
  filter, 
  search
}) => {
  console.log('=== LIST USERS DEBUG ===');
  console.log('Search query (q):', q);
  console.log('Filter expression:', filter);
  console.log('Limit:', limit);
  console.log('========================');

  // Import credentials helper from manual server
  const { getOktaCredentials } = await import('../../lib/tools.js');
  
  try {
    const { domain, apiToken } = await getOktaCredentials();
    const baseUrl = `https://${domain}`;

    // Build URL with query parameters
    const url = new URL(`${baseUrl}/api/v1/users`);
    
    // Add search parameters
    if (q) {
      url.searchParams.append('q', q);
      console.log(`Searching for users matching: "${q}"`);
    }
    
    if (after) url.searchParams.append('after', after);
    
    // Validate and set limit
    const validLimit = Math.min(Math.max(1, parseInt(limit) || 200), 200);
    url.searchParams.append('limit', validLimit.toString());
    
    if (filter) {
      url.searchParams.append('filter', filter);
      console.log(`Applying filter: ${filter}`);
    }
    
    if (search) {
      url.searchParams.append('search', search);
      console.log(`SCIM search: ${search}`);
    }

    console.log(`Fetching users from: ${url.pathname}${url.search}`);

    // Execute the request
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `SSWS ${apiToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const users = await response.json();
    
    // Enhanced response with summary
    const summary = {
      totalUsers: users.length,
      activeUsers: users.filter(user => user.status === 'ACTIVE').length,
      inactiveUsers: users.filter(user => user.status !== 'ACTIVE').length,
      hasMore: response.headers.get('link') ? response.headers.get('link').includes('rel="next"') : false
    };

    console.log(`✅ Found ${users.length} users`);
    console.log(`   - Active: ${summary.activeUsers}`);
    console.log(`   - Inactive: ${summary.inactiveUsers}`);
    
    // Return enhanced response with summary and clean user data
    return {
      users: users.map(user => ({
        id: user.id,
        status: user.status,
        created: user.created,
        activated: user.activated,
        lastLogin: user.lastLogin,
        lastUpdated: user.lastUpdated,
        profile: {
          login: user.profile.login,
          email: user.profile.email,
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          displayName: user.profile.displayName,
          department: user.profile.department,
          title: user.profile.title,
          manager: user.profile.manager,
          mobilePhone: user.profile.mobilePhone
        },
        credentials: user.credentials ? {
          provider: user.credentials.provider
        } : undefined,
        _links: user._links
      })),
      summary,
      pagination: {
        limit: validLimit,
        after: after,
        hasMore: summary.hasMore
      }
    };

  } catch (error) {
    console.error('Error listing users:', error);
    return { 
      error: `An error occurred while listing users: ${error.message}`,
      suggestion: "Try using a simpler filter or check your search syntax. Common filters: status eq \"ACTIVE\", profile.department eq \"Engineering\""
    };
  }
};

/**
 * Tool configuration for listing users in Okta.
 * @type {Object}
 */
const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'list_users',
      description: 'List users in an Okta organization with advanced filtering, search, and pagination capabilities. Supports quick search and SCIM filters.',
      parameters: {
        type: 'object',
        properties: {
          q: {
            type: 'string',
            description: 'Simple search query across firstName, lastName, and email fields. Example: "john.doe" or "engineering"'
          },
          after: {
            type: 'string',
            description: 'Pagination cursor for the next page of results (returned in previous response)'
          },
          limit: {
            type: 'integer',
            description: 'Number of results per page (1-200, default 200)',
            minimum: 1,
            maximum: 200,
            default: 200
          },
          filter: {
            type: 'string',
            description: 'Advanced filter expression. Examples: \'status eq "ACTIVE"\', \'profile.department eq "Engineering"\', \'created gt "2023-01-01T00:00:00.000Z"\''
          },
          search: {
            type: 'string',
            description: 'SCIM-compliant search expression for complex queries'
          }
        },
        required: []
      }
    }
  }
};

export { apiTool }; 