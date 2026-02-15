const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/productivity.db');
console.log(`Migrating database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

db.serialize(() => {
  console.log('\n📝 Adding new columns...');

  // Add completed_at column
  db.run(`ALTER TABLE tasks ADD COLUMN completed_at INTEGER`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('⚠️  Column completed_at already exists, skipping...');
      } else {
        console.error('❌ Error adding completed_at:', err.message);
      }
    } else {
      console.log('✅ Added completed_at column');
    }
  });

  // Add updated_at column
  db.run(`ALTER TABLE tasks ADD COLUMN updated_at INTEGER`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('⚠️  Column updated_at already exists, skipping...');
      } else {
        console.error('❌ Error adding updated_at:', err.message);
      }
    } else {
      console.log('✅ Added updated_at column');
    }
  });

  // Backfill completed_at for existing completed tasks
  db.run(`
    UPDATE tasks
    SET completed_at = created_at
    WHERE completed = 1 AND completed_at IS NULL
  `, (err) => {
    if (err) {
      console.error('❌ Error backfilling completed_at:', err.message);
    } else {
      console.log('✅ Backfilled completed_at for completed tasks');
    }
  });

  // Backfill updated_at for all tasks
  db.run(`
    UPDATE tasks
    SET updated_at = created_at
    WHERE updated_at IS NULL
  `, function(err) {
    if (err) {
      console.error('❌ Error backfilling updated_at:', err.message);
    } else {
      console.log(`✅ Backfilled updated_at for ${this.changes} tasks`);
    }
  });

  // Verify migration
  db.all(`PRAGMA table_info(tasks)`, (err, rows) => {
    if (err) {
      console.error('❌ Error verifying schema:', err.message);
    } else {
      console.log('\n📋 Updated schema:');
      rows.forEach(col => {
        console.log(`  - ${col.name}: ${col.type}`);
      });
    }

    // Show sample data
    db.all(`SELECT id, text, completed, created_at, completed_at, updated_at FROM tasks LIMIT 3`, (err, rows) => {
      if (err) {
        console.error('❌ Error fetching sample data:', err.message);
      } else {
        console.log('\n📊 Sample tasks:');
        rows.forEach(task => {
          console.log(`  Task ${task.id}: "${task.text}"`);
          console.log(`    completed: ${task.completed}, created_at: ${task.created_at}, completed_at: ${task.completed_at}, updated_at: ${task.updated_at}`);
        });
      }

      console.log('\n✨ Migration complete!');
      db.close();
    });
  });
});
