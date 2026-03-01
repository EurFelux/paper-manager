export const CREATE_KNOWLEDGE_BASES_TABLE = `
CREATE TABLE IF NOT EXISTS knowledge_bases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    embedding_model_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
)`;

export const CREATE_LITERATURES_TABLE = `
CREATE TABLE IF NOT EXISTS literatures (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    title_translation TEXT,
    author TEXT,
    abstract TEXT,
    summary TEXT,
    keywords TEXT NOT NULL DEFAULT '[]',
    url TEXT,
    notes TEXT NOT NULL DEFAULT '{}',
    knowledge_base_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE SET NULL
)`;
