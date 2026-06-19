import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * Standard response returned by the directory lookup operation.
 *
 * @property success
 * Indicates whether the lookup operation completed successfully.
 *
 * @property matches
 * Array of absolute directory paths that matched the requested directory name.
 * Returned only when the operation succeeds.
 *
 * @property error
 * Human-readable error message when the operation fails.
 */
export interface DirectoryLookupResult {
    success: boolean;
    matches?: string[];
    error?: string;
}

/**
 * Searches the user's filesystem for directories matching a given name.
 *
 * This function is intended to be used by AI agents before performing
 * filesystem operations such as:
 *
 * - Creating a React application
 * - Creating a Next.js project
 * - Initializing a repository
 * - Creating files or folders
 * - Running CLI commands within a target directory
 *
 * The function performs a bounded recursive search starting from several
 * commonly used user workspace locations:
 *
 * - User Home Directory
 * - Desktop
 * - Documents
 * - Downloads
 * - Projects
 * - Workspace
 *
 * Search depth is intentionally limited to avoid excessive filesystem
 * traversal and to keep execution fast for agent workflows.
 *
 * Matching is case-insensitive.
 *
 * Example:
 *
 * User:
 *   "Create a React app in Desktop"
 *
 * Agent:
 *   lookupDirectory("Desktop")
 *
 * Result:
 *   {
 *     success: true,
 *     matches: ["/home/user/Desktop"]
 *   }
 *
 * Agent can then pass the returned path to a directory navigation tool.
 *
 * @param directoryName
 * Name of the directory to locate.
 *
 * Examples:
 * - Desktop
 * - Documents
 * - Projects
 * - client-workspace
 * - my-react-apps
 *
 * @returns DirectoryLookupResult
 *
 * @agent
 * PURPOSE:
 *   Resolve a human-friendly directory name into one or more absolute paths.
 *
 * WHEN TO USE:
 *   - User specifies a target folder by name.
 *   - User says:
 *       "Desktop"
 *       "Documents"
 *       "Projects"
 *       "Create it in my workspace"
 *       "Put it inside client-projects"
 *
 * WHEN NOT TO USE:
 *   - User already provided a full filesystem path.
 *
 * BEHAVIOR:
 *   - If exactly one match is returned:
 *       Use that path directly.
 *
 *   - If multiple matches are returned:
 *       Ask the user which path should be used.
 *
 *   - If no matches are returned:
 *       Ask the user for a more specific directory name
 *       or an absolute filesystem path.
 *
 * IMPORTANT:
 *   This tool ONLY discovers directories.
 *   It NEVER changes the current working directory.
 *   It NEVER creates folders.
 *   It NEVER executes commands.
 */
export async function lookupDirectory(
    directoryName: string
): Promise<DirectoryLookupResult> {
    try {
        const homeDir = os.homedir();

        /**
         * Common locations searched for matching directories.
         *
         * These locations represent the most common places where
         * users store projects and documents.
         */
        const searchRoots = [
            homeDir,
            path.join(homeDir, "Desktop"),
            path.join(homeDir, "Documents"),
            path.join(homeDir, "Downloads"),
            path.join(homeDir, "Projects"),
            path.join(homeDir, "Workspace"),
        ];

        const matches: string[] = [];

        /**
         * Recursively searches a directory tree for matching folder names.
         *
         * @param dir
         * Current directory being traversed.
         *
         * @param depth
         * Remaining recursion depth.
         * Search stops when depth becomes less than zero.
         */
        async function search(dir: string, depth = 3): Promise<void> {
            if (depth < 0) return;

            try {
                const entries = await fs.readdir(dir, {
                    withFileTypes: true,
                });

                for (const entry of entries) {
                    if (!entry.isDirectory()) continue;

                    const fullPath = path.join(dir, entry.name);

                    if (
                        entry.name.toLowerCase() ===
                        directoryName.toLowerCase()
                    ) {
                        matches.push(fullPath);
                    }

                    await search(fullPath, depth - 1);
                }
            } catch {
                /**
                 * Ignore inaccessible directories.
                 *
                 * This prevents permission errors from interrupting
                 * the overall lookup process.
                 */
                return;
            }
        }

        for (const root of searchRoots) {
            await search(root);
        }

        return {
            success: true,
            matches,
        };
    } catch (error) {
        return {
            success: false,
            error: (error as Error).message,
        };
    }
}
