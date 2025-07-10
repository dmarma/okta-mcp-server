import { toolPaths } from "../tools/paths.js";

/**
 * Discovers and loads available tools from the tools directory
 * @returns {Promise<Array>} Array of tool objects
 */
export async function discoverTools() {
  console.log('[Tools] Starting tool discovery. Available paths:', toolPaths);
  
  const toolPromises = toolPaths.map(async (file) => {
    try {
      console.log(`[Tools] Loading tool from: ${file}`);
      const module = await import(`../tools/${file}`);
      console.log(`[Tools] Loaded tool: ${module.apiTool?.definition?.function?.name || 'unknown'}`);
      return {
        ...module.apiTool,
        path: file,
      };
    } catch (error) {
      console.error(`[Tools] Error loading tool from ${file}:`, error);
      return null;
    }
  });

  const tools = (await Promise.all(toolPromises)).filter(Boolean);
  console.log('[Tools] Discovered tools:', tools.map(t => t.definition.function.name));
  return tools;
}
