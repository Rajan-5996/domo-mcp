import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as appdbTools from "./domo-appdb/index.js";

interface ToolDefinition {
    name: string;
    definition: Record<string, unknown>;
    handler: (...args: any[]) => Promise<any>;
}

const isToolDefinition = (value: unknown): value is ToolDefinition =>
    typeof value === "object" &&
    value !== null &&
    typeof (value as ToolDefinition).name === "string" &&
    typeof (value as ToolDefinition).handler === "function" &&
    typeof (value as ToolDefinition).definition === "object";

const tools = (Object.values(appdbTools) as unknown[]).filter(isToolDefinition);

export const registerAll = (server: McpServer) => {
    tools.forEach(({ name, definition, handler }) => {
        server.registerTool(name, definition as any, handler);
    });
};