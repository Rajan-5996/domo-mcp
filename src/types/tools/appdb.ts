export interface Column {
    name: string;
    type: string;
}

interface Schema {
    columns: Column[];
}

export interface AppDbSchema {
    name: string;
    schema: Schema;
    syncEnabled: boolean;
}