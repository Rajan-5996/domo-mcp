export interface ToolDefinition {
    name: string;
    definition: Record<string, unknown>;
    handler: (...args: any[]) => Promise<any>;
}