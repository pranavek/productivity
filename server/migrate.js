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

  // Migration 2: Add WSJF columns + update type CHECK constraint (requires table recreation)
  db.all(`PRAGMA table_info(tasks)`, (err, columns) => {
    if (err) {
      console.error('❌ Error checking schema:', err.message);
      db.close();
      return;
    }

    const hasWsjfColumns = columns.some(c => c.name === 'wsjf_value');

    if (hasWsjfColumns) {
      console.log('⚠️  WSJF columns already exist, skipping table migration...');
      finalize();
      return;
    }

    console.log('\n🔄 Migrating table for WSJF support...');

    db.run(`CREATE TABLE tasks_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      type TEXT NOT NULL CHECK(type IN ('moscow', 'eisenhower', 'calendar', 'wsjf')),
      created_at INTEGER NOT NULL,
      completed_at INTEGER,
      updated_at INTEGER,
      priority TEXT CHECK(priority IS NULL OR priority IN ('must', 'should', 'could', 'wont')),
      quadrant TEXT CHECK(quadrant IS NULL OR quadrant IN ('q1', 'q2', 'q3', 'q4')),
      date TEXT,
      status TEXT CHECK(status IS NULL OR status IN ('todo', 'in-progress', 'blocked', 'completed', 'cancelled')) DEFAULT 'todo',
      is_milestone INTEGER DEFAULT 0,
      category TEXT CHECK(category IS NULL OR category IN ('work', 'personal', 'health', 'finance', 'social')),
      color TEXT,
      description TEXT DEFAULT '',
      wsjf_value INTEGER DEFAULT NULL,
      wsjf_time_criticality INTEGER DEFAULT NULL,
      wsjf_risk_reduction INTEGER DEFAULT NULL,
      wsjf_job_size INTEGER DEFAULT NULL
    )`, (err) => {
      if (err) {
        console.error('❌ Error creating tasks_new:', err.message);
        db.close();
        return;
      }

      db.run(`INSERT INTO tasks_new (id, text, completed, type, created_at, completed_at, updated_at,
              priority, quadrant, date, status, is_milestone, category, color, description)
              SELECT id, text, completed, type, created_at, completed_at, updated_at,
              priority, quadrant, date, status, is_milestone, category, color, description FROM tasks`, (err) => {
        if (err) {
          console.error('❌ Error copying data:', err.message);
          db.close();
          return;
        }

        db.run('DROP TABLE tasks', (err) => {
          if (err) {
            console.error('❌ Error dropping old table:', err.message);
            db.close();
            return;
          }

          db.run('ALTER TABLE tasks_new RENAME TO tasks', (err) => {
            if (err) {
              console.error('❌ Error renaming table:', err.message);
              db.close();
              return;
            }

            db.run('CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type)', () => {});
            db.run('CREATE INDEX IF NOT EXISTS idx_tasks_type_completed ON tasks(type, completed)', () => {
              console.log('✅ WSJF table migration complete!');
              finalize();
            });
          });
        });
      });
    });
  });

  function finalize() {
    db.all(`PRAGMA table_info(tasks)`, (err, rows) => {
      if (err) {
        console.error('❌ Error verifying schema:', err.message);
      } else {
        console.log('\n📋 Updated schema:');
        rows.forEach(col => {
          console.log(`  - ${col.name}: ${col.type}`);
        });
      }

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
  }
});
