import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH =
  process.env.DB_PATH || join(__dirname, '../../../WinCatalog-save.w3cat');

interface TableInfo {
  name: string;
  sql: string;
}

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

interface IndexInfo {
  name: string;
  sql: string | null;
}

export function inspectDatabase(dbPath: string = DB_PATH) {
  const db = new Database(dbPath, { readonly: true });

  console.log('='.repeat(80));
  console.log('WinCatalog Database Schema Inspection');
  console.log('='.repeat(80));
  console.log(`Database: ${dbPath}\n`);

  // Get all tables
  const tables = db
    .prepare(
      "SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name"
    )
    .all() as TableInfo[];

  console.log(`Found ${tables.length} tables:\n`);

  for (const table of tables) {
    console.log('-'.repeat(80));
    console.log(`TABLE: ${table.name}`);
    console.log('-'.repeat(80));

    // Get column info
    const columns = db.pragma(`table_info(${table.name})`) as ColumnInfo[];

    console.log('\nColumns:');
    console.log(
      '  Name'.padEnd(30) +
        'Type'.padEnd(15) +
        'Not Null'.padEnd(10) +
        'PK'.padEnd(5) +
        'Default'
    );
    console.log('  ' + '-'.repeat(70));

    for (const col of columns) {
      const notNull = col.notnull ? 'YES' : 'NO';
      const pk = col.pk ? 'YES' : 'NO';
      const dflt = col.dflt_value || '-';
      console.log(
        `  ${col.name.padEnd(30)}${col.type.padEnd(15)}${notNull.padEnd(10)}${pk.padEnd(5)}${dflt}`
      );
    }

    // Get indexes
    const indexes = db
      .prepare(
        `SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name=? ORDER BY name`
      )
      .all(table.name) as IndexInfo[];

    if (indexes.length > 0) {
      console.log('\nIndexes:');
      for (const idx of indexes) {
        console.log(`  ${idx.name}`);
        if (idx.sql) {
          console.log(`    ${idx.sql}`);
        }
      }
    }

    // Get row count
    const count = db
      .prepare(`SELECT COUNT(*) as count FROM ${table.name}`)
      .get() as { count: number };
    console.log(`\nRow count: ${count.count.toLocaleString()}`);

    // Show sample row if available
    if (count.count > 0) {
      const sample = db.prepare(`SELECT * FROM ${table.name} LIMIT 1`).get();
      console.log('\nSample row:');
      console.log(JSON.stringify(sample, null, 2));
    }

    console.log('\n');
  }

  // Get foreign keys info
  console.log('='.repeat(80));
  console.log('FOREIGN KEYS');
  console.log('='.repeat(80));

  for (const table of tables) {
    const fks = db.pragma(`foreign_key_list(${table.name})`) as unknown[];
    if (fks.length > 0) {
      console.log(`\n${table.name}:`);
      console.log(JSON.stringify(fks, null, 2));
    }
  }

  db.close();

  return tables;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  inspectDatabase();
}
