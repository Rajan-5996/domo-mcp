import { spawn } from "child_process";
import path from "path";

export interface CreateReactAppResult {
    success: boolean;
    projectName?: string;
    projectPath?: string;
    currentDirectory?: string;
    error?: string;
    logs?: string;
}

/**
 * Creates a React TypeScript application using Dovite.
 *
 * Requirements:
 * - Current working directory must already be set.
 * - Yarn must be installed.
 *
 * The tool automatically:
 * - Chooses React TypeScript template
 * - Handles all prompts except project name
 *
 * @param projectName
 * @returns Promise<CreateReactAppResult>
 */
export async function createReactApp(
    projectName: string
): Promise<CreateReactAppResult> {
    return new Promise((resolve) => {
        let output = "";
        let projectNameSubmitted = false;
        let templateSubmitted = false;

        const yarnCheck = spawn("yarn", ["--version"]);

        yarnCheck.on("error", () => {
            resolve({
                success: false,
                error:
                    "Yarn is not installed. Please install Yarn and try again.",
            });
        });

        yarnCheck.on("close", (code) => {
            if (code !== 0) {
                resolve({
                    success: false,
                    error:
                        "Yarn is not installed. Please install Yarn and try again.",
                });
                return;
            }

            const child = spawn("yarn", ["create", "dovite"], {
                cwd: process.cwd(),
                stdio: ["pipe", "pipe", "pipe"],
            });

            child.stdout.on("data", (data) => {
                const text = data.toString();

                output += text;

                /**
                 * Project Name Prompt
                 */
                if (
                    !projectNameSubmitted &&
                    text.toLowerCase().includes("project name")
                ) {
                    child.stdin.write(`${projectName}\n`);
                    projectNameSubmitted = true;
                }

                /**
                 * Template Prompt
                 */
                if (
                    !templateSubmitted &&
                    text.toLowerCase().includes("select a template")
                ) {
                    /**
                     * React TypeScript
                     *
                     * Dovite/Vite menus generally accept arrow navigation.
                     * One Down + Enter commonly selects React TS.
                     *
                     * Adjust if Dovite changes its menu ordering.
                     */
                    child.stdin.write("\x1B[B");
                    child.stdin.write("\n");

                    templateSubmitted = true;
                }
            });

            child.stderr.on("data", (data) => {
                output += data.toString();
            });

            child.on("error", (error) => {
                resolve({
                    success: false,
                    error: error.message,
                    logs: output,
                });
            });

            child.on("close", (code) => {
                if (code !== 0) {
                    resolve({
                        success: false,
                        error: "Failed to create React application.",
                        logs: output,
                    });
                    return;
                }

                resolve({
                    success: true,
                    projectName,
                    currentDirectory: process.cwd(),
                    projectPath: path.join(process.cwd(), projectName),
                    logs: output,
                });
            });
        });
    });
}
