import fs from "fs/promises";
import path from "path";

export interface ChangeDirectoryResult {
    success: boolean;
    previousDirectory?: string;
    currentDirectory?: string;
    error?: string;
}

/**
 * Changes the current working directory of the MCP process.
 *
 * This affects all subsequent filesystem and command-execution tools
 * that rely on process.cwd().
 *
 * Example:
 *
 * Before:
 *   /home/user
 *
 * changeDirectory("/home/user/Desktop")
 *
 * After:
 *   /home/user/Desktop
 */
export async function changeDirectory(
    targetPath: string
): Promise<ChangeDirectoryResult> {
    try {
        const resolvedPath = path.resolve(targetPath);

        const stat = await fs.stat(resolvedPath);

        if (!stat.isDirectory()) {
            return {
                success: false,
                error: `Path is not a directory: ${resolvedPath}`,
            };
        }

        const previousDirectory = process.cwd();

        process.chdir(resolvedPath);

        return {
            success: true,
            previousDirectory,
            currentDirectory: process.cwd(),
        };
    } catch (error) {
        return {
            success: false,
            error: (error as Error).message,
        };
    }
}
