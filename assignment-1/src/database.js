// This file handles all database-related logic using SQLite.
//
// You are responsible for:
// 1) Creating the `papers` table
// 2) Implementing the database operations below
//
// Do NOT handle HTTP status codes here.
// Do NOT perform request validation here.
// This layer should only deal with database operations.

const sqlite3 = require("sqlite3").verbose();

// ------------------------------------------------------------
// Connect to SQLite database
// ------------------------------------------------------------
const db = new sqlite3.Database("./paper_management.db", (err) => {
  if (err) {
    console.error("Error connecting to database:", err);
  } else {
    console.log("Connected to SQLite database");
  }
});

// Ensure the papers table exists before handling any requests
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS papers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      authors TEXT NOT NULL,
      published_in TEXT NOT NULL,
      year INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  );
});

// ------------------------------------------------------------
// TODO: Create a table named `papers`
//
// The table schema must match the assignment handout exactly.
// You should execute a CREATE TABLE IF NOT EXISTS statement.
//
// Hint:
// - SQLite provides CURRENT_TIMESTAMP for timestamps
// - created_at and updated_at should be set automatically
// ------------------------------------------------------------

// ------------------------------------------------------------
// Database operations
//
// Each function should return a Promise (use async / await).
// Let errors propagate to the route layer.
// ------------------------------------------------------------
const dbOperations = {
  // ----------------------------------------------------------
  // createPaper
  //
  // Inserts a new paper into the database.
  //
  // Input:
  // - paper object with title, authors, published_in, year
  //
  // Output:
  // - the newly created paper (including id and timestamps)
  //
  // Hint:
  // - Use db.run() for INSERT
  // - Use `this.lastID` to get the inserted row ID
  // - After inserting, query the paper again by ID
  // ----------------------------------------------------------
  createPaper: async (paper) => {
    const newId = await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO papers (title, authors, published_in, year) VALUES (?, ?, ?, ?)",
        [paper.title, paper.authors, paper.published_in, paper.year],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    return await dbOperations.getPaperById(newId);
  },

  // ----------------------------------------------------------
  // getAllPapers
  //
  // Retrieves all papers, optionally applying filters.
  //
  // Supported filters:
  // - year
  // - published_in (partial match, case-insensitive)
  // - limit
  // - offset
  //
  // Output:
  // - array of paper objects
  //
  // Hint:
  // - Start with: "SELECT * FROM papers"
  // - Dynamically add WHERE clauses if filters exist
  // - Use LIMIT and OFFSET at the end
  // - Use db.all() to retrieve multiple rows
  // ----------------------------------------------------------
  getAllPapers: async (filters = {}) => {
    let query = "SELECT * FROM papers";
    const conditions = [];
    const params = [];

    if (filters.year) {
      conditions.push("year = ?");
      params.push(filters.year);
    }

    if (filters.published_in) {
      conditions.push("LOWER(published_in) LIKE ?");
      params.push(`%${filters.published_in.toLowerCase()}%`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY id";

    const hasLimit = filters.limit !== undefined && filters.limit !== null;
    const hasOffset = filters.offset !== undefined && filters.offset !== null;

    if (hasLimit) {
      query += " LIMIT ?";
      params.push(Number(filters.limit));

      if (hasOffset) {
        query += " OFFSET ?";
        params.push(Number(filters.offset));
      }
    } else if (hasOffset) {
      // SQLite requires LIMIT when using OFFSET; LIMIT -1 means no upper bound
      query += " LIMIT -1 OFFSET ?";
      params.push(Number(filters.offset));
    }

    return await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // ----------------------------------------------------------
  // getPaperById
  //
  // Retrieves a single paper by ID.
  //
  // Input:
  // - id (number)
  //
  // Output:
  // - paper object if found
  // - null / undefined if not found
  //
  // Hint:
  // - Use db.get()
  // ----------------------------------------------------------
  getPaperById: async (id) => {
    return await new Promise((resolve, reject) => {
      db.get("SELECT * FROM papers WHERE id = ?", [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // ----------------------------------------------------------
  // updatePaper
  //
  // Updates an existing paper by ID.
  //
  // Input:
  // - id (number)
  // - paper object with updated fields
  //
  // Output:
  // - updated paper object if successful
  // - null / undefined if paper does not exist
  //
  // Hint:
  // - Use db.run() for UPDATE
  // - Update `updated_at` using CURRENT_TIMESTAMP
  // - After updating, query the paper again by ID
  // ----------------------------------------------------------
  updatePaper: async (id, paper) => {
    const changes = await new Promise((resolve, reject) => {
      db.run(
        "UPDATE papers SET title = ?, authors = ?, published_in = ?, year = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [paper.title, paper.authors, paper.published_in, paper.year, id],
        function (err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    if (changes === 0) return null;

    return await dbOperations.getPaperById(id);
  },

  // ----------------------------------------------------------
  // deletePaper
  //
  // Deletes a paper by ID.
  //
  // Input:
  // - id (number)
  //
  // Output:
  // - no return value needed
  //
  // Hint:
  // - Use db.run() for DELETE
  // ----------------------------------------------------------
  deletePaper: async (id) => {
    await new Promise((resolve, reject) => {
      db.run("DELETE FROM papers WHERE id = ?", [id], function (err) {
        if (err) reject(err);
        else resolve();
      });
    });
  },
};

// ------------------------------------------------------------
// Exports
// ------------------------------------------------------------
module.exports = {
  db, // export the database instance (used by tests)
  ...dbOperations, // export all database functions
  // Alias to match route usage
  getPapers: (...args) => dbOperations.getAllPapers(...args),
};
