/**
 * Database Model & Schema Analyzer
 * Extracts database schemas, entities, collections, and relationship mappings.
 */

import { FetchedFile } from '../github/repositoryFetcher';

export interface DiscoveredDatabaseModel {
  name: string;
  type: 'MONGOOSE' | 'PRISMA' | 'SQLALCHEMY' | 'JPA_ENTITY' | 'GENERIC_SCHEMA';
  filePath: string;
  fields: string[];
  relations: string[];
}

export function extractDatabaseModels(files: FetchedFile[]): DiscoveredDatabaseModel[] {
  const models: DiscoveredDatabaseModel[] = [];

  for (const file of files) {
    const lines = file.content.split('\n');
    const lower = file.content.toLowerCase();

    // 1. Mongoose Schema Detection
    if (lower.includes('new schema') || lower.includes('mongoose.model')) {
      const modelNameMatch = file.content.match(/mongoose\.model(?:<[^>]+>)?\s*\(\s*['"]([a-zA-Z0-9_]+)['"]/i)
        || file.path.match(/(?:models|entities)\/([a-zA-Z0-9_]+)\.[jt]s/i);

      const name = modelNameMatch ? modelNameMatch[1] : 'DocumentModel';
      const fields: string[] = [];
      const relations: string[] = [];

      for (const line of lines) {
        const fieldMatch = line.match(/^\s*([a-zA-Z0-9_]+)\s*:\s*\{/);
        if (fieldMatch && !['timestamps', 'options'].includes(fieldMatch[1])) {
          fields.push(fieldMatch[1]);
        }
        const refMatch = line.match(/ref\s*:\s*['"]([a-zA-Z0-9_]+)['"]/);
        if (refMatch) {
          relations.push(`references ${refMatch[1]}`);
        }
      }

      models.push({
        name,
        type: 'MONGOOSE',
        filePath: file.path,
        fields: fields.slice(0, 8),
        relations,
      });
    }

    // 2. SQLAlchemy Model Detection (Python)
    if (lower.includes('column(') && lower.includes('__tablename__')) {
      const tableMatch = file.content.match(/__tablename__\s*=\s*['"]([a-zA-Z0-9_]+)['"]/);
      const classMatch = file.content.match(/class\s+([a-zA-Z0-9_]+)\s*\(/);
      const name = classMatch ? classMatch[1] : (tableMatch ? tableMatch[1] : 'SQLAlchemyTable');

      const fields: string[] = [];
      for (const line of lines) {
        const colMatch = line.match(/^\s*([a-zA-Z0-9_]+)\s*=\s*Column\(/);
        if (colMatch) fields.push(colMatch[1]);
      }

      models.push({
        name,
        type: 'SQLALCHEMY',
        filePath: file.path,
        fields: fields.slice(0, 8),
        relations: [],
      });
    }

    // 3. JPA / Hibernate Entity (Java)
    if (file.content.includes('@Entity') || file.content.includes('@Table')) {
      const classMatch = file.content.match(/public\s+class\s+([a-zA-Z0-9_]+)/);
      const name = classMatch ? classMatch[1] : 'JpaEntity';

      const fields: string[] = [];
      const relations: string[] = [];

      for (const line of lines) {
        const fieldMatch = line.match(/(?:private|protected)\s+[a-zA-Z0-9_<>,\[\]]+\s+([a-zA-Z0-9_]+)\s*;/);
        if (fieldMatch) fields.push(fieldMatch[1]);
        if (line.includes('@OneToMany') || line.includes('@ManyToOne')) {
          relations.push('JPA Relationship');
        }
      }

      models.push({
        name,
        type: 'JPA_ENTITY',
        filePath: file.path,
        fields: fields.slice(0, 8),
        relations,
      });
    }
  }

  return models;
}
