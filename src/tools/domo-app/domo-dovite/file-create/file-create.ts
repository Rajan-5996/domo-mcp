import fs from "fs/promises";
import path from "path";

export interface FileCreationResult {
    success: boolean;
    filePath?: string;
    createdDirectories?: string[];
    error?: string;
}

/**
 * Creates a file and automatically creates any missing parent directories.
 *
 * Examples:
 *
 * src/components/TodoCard.tsx
 * src/hooks/useTodos.ts
 * src/pages/Home.tsx
 * README.md
 *
 * If parent folders do not exist they will be created automatically.
 */
export async function createFile(
    filePath: string,
    content: string = ""
): Promise<FileCreationResult> {
    try {
        const absolutePath = path.resolve(process.cwd(), filePath);

        const parentDir = path.dirname(absolutePath);

        await fs.mkdir(parentDir, {
            recursive: true,
        });

        await fs.writeFile(absolutePath, content, "utf8");

        return {
            success: true,
            filePath: absolutePath,
            createdDirectories: [parentDir],
        };
    } catch (error) {
        return {
            success: false,
            error: (error as Error).message,
        };
    }
}
