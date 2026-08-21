/**
 * SQLite WASM Database Layer for Academic Notes Extension
 * Powered by sql.js (WebAssembly SQLite with FTS5 Full-Text Search)
 */

window.AcademicNotes = window.AcademicNotes || {};

window.AcademicNotes.DB = (function() {
  let dbInstance = null;
  let initPromise = null;
  const DB_STORE_NAME = 'academic_sqlite_db';

  // 1. IndexedDB Helper to persist raw binary SQLite database
  function openIDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AcademicNotesStorage', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('blobs')) {
          db.createObjectStore('blobs');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function loadBinaryFromStorage() {
    try {
      const idb = await openIDB();
      return new Promise((resolve) => {
        const tx = idb.transaction('blobs', 'readonly');
        const store = tx.objectStore('blobs');
        const req = store.get(DB_STORE_NAME);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      console.warn('Failed to load binary from IndexedDB, trying chrome.storage:', e);
      return new Promise((resolve) => {
        chrome.storage.local.get([DB_STORE_NAME], (res) => {
          if (res && res[DB_STORE_NAME]) {
            resolve(new Uint8Array(res[DB_STORE_NAME]));
          } else {
            resolve(null);
          }
        });
      });
    }
  }

  async function persistBinaryToStorage(uint8Array) {
    try {
      const idb = await openIDB();
      const tx = idb.transaction('blobs', 'readwrite');
      const store = tx.objectStore('blobs');
      store.put(uint8Array, DB_STORE_NAME);
    } catch (e) {
      console.warn('Failed to persist to IndexedDB, fallback to chrome.storage:', e);
      // Convert Uint8Array to normal array for chrome.storage
      chrome.storage.local.set({ [DB_STORE_NAME]: Array.from(uint8Array) });
    }
  }

  // 2. Initialize Schema
  function createTables(db) {
    db.run(`
      CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        title TEXT,
        url TEXT,
        authors TEXT,
        doi TEXT,
        domain TEXT,
        journal TEXT,
        user_note TEXT,
        folder TEXT DEFAULT 'Inbox',
        color TEXT DEFAULT 'yellow',
        tags TEXT,
        created_at TEXT NOT NULL
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        id UNINDEXED,
        content,
        title,
        user_note,
        tags
      );

      -- Default root folder
      INSERT OR IGNORE INTO folders (name, created_at) VALUES ('Inbox', datetime('now'));
    `);
  }

  // 3. Migrate from old chrome.storage JSON notes
  async function migrateOldNotes(db) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['academic_notes', 'academic_folders'], (data) => {
        const oldNotes = data.academic_notes || [];
        const oldFolders = data.academic_folders || [];

        let migrated = false;

        if (Array.isArray(oldFolders)) {
          oldFolders.forEach(folder => {
            if (folder && folder.trim()) {
              try {
                db.run('INSERT OR IGNORE INTO folders (name, created_at) VALUES (?, datetime(\'now\'))', [folder.trim()]);
                migrated = true;
              } catch (err) {}
            }
          });
        }

        if (Array.isArray(oldNotes) && oldNotes.length > 0) {
          // Check if notes table is empty
          const stmt = db.prepare('SELECT count(*) as c FROM notes');
          stmt.step();
          const row = stmt.getAsObject();
          stmt.free();

          if (row.c === 0) {
            oldNotes.forEach(n => {
              const id = n.id || crypto.randomUUID();
              const content = n.content || n.text || '';
              const title = n.title || n.pageTitle || n.metadata?.title || '';
              const url = n.url || n.pageUrl || '';
              const authors = Array.isArray(n.authors) ? n.authors.join(', ') : (n.authors || '');
              const doi = n.doi || '';
              const domain = n.domain || n.sourceDomain || '';
              const journal = n.journal || '';
              const userNote = n.userNote || n.userNotes || '';
              const folder = n.folder || 'Inbox';
              const color = n.color || 'yellow';
              const tags = JSON.stringify(n.tags || []);
              const createdAt = n.createdAt || n.date || n.timestamp || new Date().toISOString();

              try {
                db.run(`
                  INSERT OR REPLACE INTO notes (id, content, title, url, authors, doi, domain, journal, user_note, folder, color, tags, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [id, content, title, url, authors, doi, domain, journal, userNote, folder, color, tags, createdAt]);

                db.run(`
                  INSERT OR REPLACE INTO notes_fts (id, content, title, user_note, tags)
                  VALUES (?, ?, ?, ?, ?)
                `, [id, content, title, userNote, tags]);
                migrated = true;
              } catch (err) {
                console.error('Error migrating note:', err);
              }
            });
          }
        }

        if (migrated) {
          saveDatabase();
        }
        resolve();
      });
    });
  }

  function saveDatabase() {
    if (!dbInstance) return;
    const binary = dbInstance.export();
    persistBinaryToStorage(binary);
    // Also notify listeners
    chrome.storage.local.set({ 'sqlite_last_updated': Date.now() });
  }

  // Public Initialization
  async function init() {
    if (dbInstance) return dbInstance;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      if (typeof window.initSqlJs !== 'function') {
        throw new Error('SQLite WASM (initSqlJs) library not loaded');
      }

      const SQL = await window.initSqlJs({
        locateFile: file => chrome.runtime.getURL('lib/' + file)
      });

      const existingData = await loadBinaryFromStorage();
      if (existingData && existingData.byteLength > 0) {
        dbInstance = new SQL.Database(existingData);
      } else {
        dbInstance = new SQL.Database();
      }

      createTables(dbInstance);
      await migrateOldNotes(dbInstance);
      return dbInstance;
    })();

    return initPromise;
  }

  // Row mapper
  function rowToNote(row) {
    let parsedTags = [];
    try {
      parsedTags = JSON.parse(row.tags || '[]');
    } catch (e) {
      parsedTags = [];
    }

    return {
      id: row.id,
      content: row.content,
      text: row.content,
      title: row.title,
      pageTitle: row.title,
      url: row.url,
      pageUrl: row.url,
      authors: row.authors ? row.authors.split(', ') : [],
      doi: row.doi,
      domain: row.domain,
      sourceDomain: row.domain,
      journal: row.journal,
      userNote: row.user_note,
      userNotes: row.user_note,
      folder: row.folder || 'Inbox',
      color: row.color || 'yellow',
      tags: parsedTags,
      createdAt: row.created_at,
      date: row.created_at,
      timestamp: row.created_at
    };
  }

  return {
    async init() {
      return init();
    },

    async getAllNotes() {
      const db = await init();
      const stmt = db.prepare('SELECT * FROM notes ORDER BY datetime(created_at) DESC');
      const notes = [];
      while (stmt.step()) {
        notes.push(rowToNote(stmt.getAsObject()));
      }
      stmt.free();
      return notes;
    },

    async getNotesByFolder(folderPath) {
      const db = await init();
      let sql = 'SELECT * FROM notes WHERE folder = ? OR folder LIKE ? ORDER BY datetime(created_at) DESC';
      const stmt = db.prepare(sql);
      stmt.bind([folderPath, folderPath + '/%']);
      const notes = [];
      while (stmt.step()) {
        notes.push(rowToNote(stmt.getAsObject()));
      }
      stmt.free();
      return notes;
    },

    async saveNote(note) {
      const db = await init();
      const id = note.id || crypto.randomUUID();
      const content = note.content || note.text || '';
      const title = note.title || note.pageTitle || note.metadata?.title || '';
      const url = note.url || note.pageUrl || '';
      const authors = Array.isArray(note.authors) ? note.authors.join(', ') : (note.authors || '');
      const doi = note.doi || '';
      const domain = note.domain || note.sourceDomain || '';
      const journal = note.journal || '';
      const userNote = note.userNote || note.userNotes || '';
      const folder = note.folder || 'Inbox';
      const color = note.color || 'yellow';
      const tags = JSON.stringify(note.tags || []);
      const createdAt = note.createdAt || note.date || note.timestamp || new Date().toISOString();

      db.run(`
        INSERT OR REPLACE INTO notes (id, content, title, url, authors, doi, domain, journal, user_note, folder, color, tags, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, content, title, url, authors, doi, domain, journal, userNote, folder, color, tags, createdAt]);

      // Update FTS index
      db.run(`DELETE FROM notes_fts WHERE id = ?`, [id]);
      db.run(`
        INSERT INTO notes_fts (id, content, title, user_note, tags)
        VALUES (?, ?, ?, ?, ?)
      `, [id, content, title, userNote, tags]);

      saveDatabase();

      return {
        ...note,
        id,
        content,
        title,
        url,
        authors: authors ? authors.split(', ') : [],
        doi,
        domain,
        journal,
        userNote,
        folder,
        color,
        tags: note.tags || [],
        createdAt
      };
    },

    async updateNote(id, updates) {
      const db = await init();
      const stmt = db.prepare('SELECT * FROM notes WHERE id = ?');
      stmt.bind([id]);
      if (!stmt.step()) {
        stmt.free();
        throw new Error('Note not found');
      }
      const current = stmt.getAsObject();
      stmt.free();

      const content = updates.content !== undefined ? updates.content : (updates.text !== undefined ? updates.text : current.content);
      const title = updates.title !== undefined ? updates.title : (updates.pageTitle !== undefined ? updates.pageTitle : current.title);
      const userNote = updates.userNote !== undefined ? updates.userNote : (updates.userNotes !== undefined ? updates.userNotes : current.user_note);
      const folder = updates.folder !== undefined ? updates.folder : current.folder;
      const color = updates.color !== undefined ? updates.color : current.color;
      const tags = updates.tags !== undefined ? JSON.stringify(updates.tags) : current.tags;

      db.run(`
        UPDATE notes
        SET content = ?, title = ?, user_note = ?, folder = ?, color = ?, tags = ?
        WHERE id = ?
      `, [content, title, userNote, folder, color, tags, id]);

      // Update FTS
      db.run(`DELETE FROM notes_fts WHERE id = ?`, [id]);
      db.run(`
        INSERT INTO notes_fts (id, content, title, user_note, tags)
        VALUES (?, ?, ?, ?, ?)
      `, [id, content, title, userNote, tags]);

      saveDatabase();
      return this.getAllNotes();
    },

    async deleteNote(id) {
      const db = await init();
      db.run('DELETE FROM notes WHERE id = ?', [id]);
      db.run('DELETE FROM notes_fts WHERE id = ?', [id]);
      saveDatabase();
      return true;
    },

    async searchNotesFTS(query) {
      const db = await init();
      if (!query || !query.trim()) {
        return this.getAllNotes();
      }

      const cleanQuery = query.trim().replace(/'/g, "''");
      const notes = [];

      try {
        // Try FTS5 MATCH query first
        const ftsStmt = db.prepare(`
          SELECT notes.* FROM notes
          JOIN notes_fts ON notes.id = notes_fts.id
          WHERE notes_fts MATCH ?
          ORDER BY rank
        `);
        ftsStmt.bind([cleanQuery + '*']);
        while (ftsStmt.step()) {
          notes.push(rowToNote(ftsStmt.getAsObject()));
        }
        ftsStmt.free();
        if (notes.length > 0) return notes;
      } catch (e) {
        // Fallback to LIKE if FTS query syntax error
      }

      // Fallback LIKE search
      const likePattern = `%${cleanQuery}%`;
      const stmt = db.prepare(`
        SELECT * FROM notes
        WHERE content LIKE ? OR title LIKE ? OR user_note LIKE ? OR tags LIKE ?
        ORDER BY datetime(created_at) DESC
      `);
      stmt.bind([likePattern, likePattern, likePattern, likePattern]);
      while (stmt.step()) {
        notes.push(rowToNote(stmt.getAsObject()));
      }
      stmt.free();
      return notes;
    },

    async getAllFolders() {
      const db = await init();
      const stmt = db.prepare('SELECT name FROM folders ORDER BY name ASC');
      const folders = [];
      while (stmt.step()) {
        folders.push(stmt.getAsObject().name);
      }
      stmt.free();
      if (!folders.includes('Inbox')) {
        folders.unshift('Inbox');
      }
      return folders;
    },

    async addFolder(name) {
      if (!name || !name.trim()) return;
      const db = await init();
      db.run('INSERT OR IGNORE INTO folders (name, created_at) VALUES (?, datetime(\'now\'))', [name.trim()]);
      saveDatabase();
      return this.getAllFolders();
    },

    async renameFolder(oldPath, newPath) {
      if (!oldPath || !newPath || oldPath === newPath) return;
      const db = await init();
      // Update folders
      db.run('UPDATE folders SET name = ? WHERE name = ?', [newPath, oldPath]);
      // Update subfolders
      db.run(`
        UPDATE folders 
        SET name = ? || substr(name, length(?) + 1)
        WHERE name LIKE ?
      `, [newPath, oldPath, oldPath + '/%']);

      // Update notes
      db.run('UPDATE notes SET folder = ? WHERE folder = ?', [newPath, oldPath]);
      db.run(`
        UPDATE notes
        SET folder = ? || substr(folder, length(?) + 1)
        WHERE folder LIKE ?
      `, [newPath, oldPath, oldPath + '/%']);

      saveDatabase();
      return this.getAllFolders();
    },

    async deleteFolder(path) {
      if (!path || path === 'Inbox') return;
      const db = await init();
      // Delete folder and subfolders from table
      db.run('DELETE FROM folders WHERE name = ? OR name LIKE ?', [path, path + '/%']);
      // Move orphaned notes to Inbox
      db.run('UPDATE notes SET folder = \'Inbox\' WHERE folder = ? OR folder LIKE ?', [path, path + '/%']);
      saveDatabase();
      return this.getAllFolders();
    },

    // 4. Export pure .db SQLite file (Uint8Array)
    async exportDatabaseBinary() {
      const db = await init();
      return db.export();
    },

    // Import a .db file
    async importDatabaseBinary(uint8Array) {
      if (typeof window.initSqlJs !== 'function') return;
      const SQL = await window.initSqlJs({
        locateFile: file => chrome.runtime.getURL('lib/' + file)
      });
      dbInstance = new SQL.Database(uint8Array);
      saveDatabase();
      return this.getAllNotes();
    }
  };
})();
