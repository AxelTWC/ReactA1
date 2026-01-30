// This file sets up and starts the Express server.
//
// You do NOT need to modify this file for Assignment 1.
// It is provided fully configured so you can focus on
// implementing database, routes and validation logic.

const express = require("express");
const routes = require("./routes");
const middleware = require("./middleware");

const app = express();
const PORT = 3000;

// ------------------------------------------------------------
// Built-in middleware
// Parses incoming JSON request bodies and makes them
// available as req.body
// ------------------------------------------------------------
app.use(express.json());

// ------------------------------------------------------------
// Custom middleware (already set up for you)
//
// - requestLogger: logs each incoming request
// - errorHandler: handles unexpected server errors (500)
// ------------------------------------------------------------
app.use(middleware.requestLogger);

// ------------------------------------------------------------
// Routes
// All API routes are mounted under /api
// Example: GET /api/papers
// ------------------------------------------------------------
app.use("/api", routes);

// ------------------------------------------------------------
// Error handling middleware
// This must be registered AFTER all routes.
// It catches unexpected failures and returns JSON
// instead of crashing the server.
// ------------------------------------------------------------
app.use(middleware.errorHandler);

// ------------------------------------------------------------
// Start the server
//
// The check below ensures the server starts only when this
// file is run directly (e.g. `npm start`), and NOT when it
// is imported by the test file (Jest + supertest).
// ------------------------------------------------------------
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export the app for testing
module.exports = app;
