const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'annotations.db');
const db = new Database(dbPath, { verbose: console.log });

// Initialize schema
function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      content TEXT NOT NULL,
      uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS annotations (
      id TEXT PRIMARY KEY,
      documentId TEXT NOT NULL,
      startOffset INTEGER NOT NULL,
      endOffset INTEGER NOT NULL,
      selectedText TEXT NOT NULL,
      author TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (documentId) REFERENCES documents(id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      annotationId TEXT NOT NULL,
      text TEXT NOT NULL,
      author TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (annotationId) REFERENCES annotations(id)
    );

    CREATE TABLE IF NOT EXISTS history_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      documentId TEXT,
      author TEXT,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

initDb();

module.exports = db;
