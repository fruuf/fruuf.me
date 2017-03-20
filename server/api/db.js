import path from 'path';
import initKnex from 'knex';
import fs from 'fs';

export default async () => {
  const dbFilename = path.join(process.cwd(), 'db.sqlite');

  const db = initKnex({
    client: 'sqlite3',
    connection: {
      filename: dbFilename,
    },
  });

  try {
    fs.statSync(dbFilename);
  } catch (e) {
    await db.schema.createTable('eventStream', (table) => {
      table.increments();
      table.string('type');
      table.string('source');
      table.json('data');
      table.dateTime('createdAt').defaultTo(db.fn.now());
    });
  }
  return { db };
};
