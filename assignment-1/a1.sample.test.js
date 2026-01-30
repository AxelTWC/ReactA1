const request = require("supertest");
const app = require("./src/server");
const { db } = require("./src/database");

const samplePaper = {
  title: "Sample Paper Title",
  authors: "John Doe, Jane Smith",
  published_in: "ICSE 2025",
  year: 2025,
};

const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function expectInvalidIdFormat(res) {
  expect(res.status).toBe(400);
  expect(res.body).toEqual({
    error: "Validation Error",
    message: "Invalid ID format",
  });
}

function expectInvalidQueryFormat(res) {
  expect(res.status).toBe(400);
  expect(res.body).toEqual({
    error: "Validation Error",
    message: "Invalid query parameter format",
  });
}

function expectPaperShape(paper) {
  expect(paper).toHaveProperty("id");
  expect(paper).toHaveProperty("title");
  expect(paper).toHaveProperty("authors");
  expect(paper).toHaveProperty("published_in");
  expect(paper).toHaveProperty("year");
  expect(paper).toHaveProperty("created_at");
  expect(paper).toHaveProperty("updated_at");

  expect(typeof paper.id).toBe("number");
  expect(typeof paper.title).toBe("string");
  expect(typeof paper.authors).toBe("string");
  expect(typeof paper.published_in).toBe("string");
  expect(typeof paper.year).toBe("number");

  // ISO 8601 format (basic check)
  expect(paper.created_at).toMatch(iso8601Regex);
  expect(paper.updated_at).toMatch(iso8601Regex);
}

async function clearPapers() {
  // Retry a few times to avoid race with CREATE TABLE in database.js
  const maxAttempts = 20;
  const delayMs = 50;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await new Promise((resolve, reject) => {
        db.run("DELETE FROM papers", (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      return; // success
    } catch (err) {
      const msg = String(err?.message);

      // "no such table" => table not created yet
      if (msg.includes("no such table: papers")) {
        await sleep(delayMs);
        continue;
      }

      // other DB errors should fail immediately
      throw err;
    }
  }

  throw new Error(
    "Timed out waiting for the `papers` table to be created. " +
      "Make sure you implemented CREATE TABLE in src/database.js.",
  );
}

// Clean up before all tests
beforeAll(async () => {
  await clearPapers();
});

// Clean up after all tests
afterAll(async () => {
  await new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
});

describe("Paper Management API Tests", () => {
  beforeEach(async () => {
    await clearPapers();
  });

  // POST /api/papers
  describe("POST /api/papers", () => {
    it("should create a new paper with valid input", async () => {
      const res = await request(app).post("/api/papers").send(samplePaper);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        title: samplePaper.title,
        authors: samplePaper.authors,
        published_in: samplePaper.published_in,
        year: samplePaper.year,
      });
      expectPaperShape(res.body);
    });

    it("should return 400 if title is missing", async () => {
      const res = await request(app).post("/api/papers").send({
        authors: "John Doe, Jane Smith",
        published_in: "ICSE 2025",
        year: 2025,
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation Error");
      expect(res.body.messages).toEqual(["Title is required"]);
    });

    it('should return 400 if title is an empty string ""', async () => {
      const res = await request(app)
        .post("/api/papers")
        .send({ ...samplePaper, title: "" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation Error");
      expect(res.body.messages).toEqual(["Title is required"]);
    });

    it('should return 400 if title is only spaces "   "', async () => {
      const res = await request(app)
        .post("/api/papers")
        .send({ ...samplePaper, title: "   " });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation Error");
      expect(res.body.messages).toEqual(["Title is required"]);
    });

    it("should return 400 if year is invalid (1900)", async () => {
      const res = await request(app)
        .post("/api/papers")
        .send({ ...samplePaper, year: 1900 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation Error");
      expect(res.body.messages).toEqual(["Valid year after 1900 is required"]);
    });

    it('should return 400 if year is invalid ("abc")', async () => {
      const res = await request(app)
        .post("/api/papers")
        .send({ ...samplePaper, year: "abc" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation Error");
      expect(res.body.messages).toEqual(["Valid year after 1900 is required"]);
    });

    it("should return 400 if year is invalid (1901.1)", async () => {
      const res = await request(app)
        .post("/api/papers")
        .send({ ...samplePaper, year: 1901.1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation Error");
      expect(res.body.messages).toEqual(["Valid year after 1900 is required"]);
    });
  });

  // GET /api/papers
  describe("GET /api/papers", () => {
    it("should retrieve a list of papers (and each has the correct fields)", async () => {
      await request(app).post("/api/papers").send(samplePaper);
      const res = await request(app).get("/api/papers");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBeTruthy();
      expect(res.body.length).toBeGreaterThan(0);
      res.body.forEach(expectPaperShape);
    });

    it("should apply filters correctly (year + published_in partial, case-insensitive)", async () => {
      await request(app).post("/api/papers").send(samplePaper);
      await request(app)
        .post("/api/papers")
        .send({
          ...samplePaper,
          title: "Other",
          year: 2024,
          published_in: "NeurIPS 2024",
        });

      const res = await request(app).get(
        "/api/papers?year=2025&published_in=icse",
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBeTruthy();
      res.body.forEach((paper) => {
        expect(paper.year).toBe(2025);
        expect(paper.published_in).toMatch(/icse/i);
      });
    });

    it("should support limit + offset", async () => {
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post("/api/papers")
          .send({ ...samplePaper, title: `Paper ${i}` });
      }

      const res = await request(app).get("/api/papers?limit=2&offset=1");
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    // Query validation (basic)
    it("should return 400 for invalid year query (1900)", async () => {
      const res = await request(app).get("/api/papers?year=1900");
      expectInvalidQueryFormat(res);
    });

    it('should return 400 for invalid year query ("1901a")', async () => {
      const res = await request(app).get("/api/papers?year=1901a");
      expectInvalidQueryFormat(res);
    });

    it("should return 400 for invalid year query (1901.1)", async () => {
      const res = await request(app).get("/api/papers?year=1901.1");
      expectInvalidQueryFormat(res);
    });

    it("should return 400 for invalid limit query (0)", async () => {
      const res = await request(app).get("/api/papers?limit=0");
      expectInvalidQueryFormat(res);
    });

    it("should return 400 for invalid offset query (-1)", async () => {
      const res = await request(app).get("/api/papers?offset=-1");
      expectInvalidQueryFormat(res);
    });

    it('should return 400 for invalid offset query ("1a")', async () => {
      const res = await request(app).get("/api/papers?offset=1a");
      expectInvalidQueryFormat(res);
    });

    it("should return 400 for invalid offset query (1.5)", async () => {
      const res = await request(app).get("/api/papers?offset=1.5");
      expectInvalidQueryFormat(res);
    });

    it("should return 400 for multiple invalid query parameters (still simplified message)", async () => {
      const res = await request(app).get(
        "/api/papers?year=1900&limit=0&offset=-1",
      );
      expectInvalidQueryFormat(res);
    });
  });

  // GET /api/papers/:id
  describe("GET /api/papers/:id", () => {
    it("should retrieve a paper by ID", async () => {
      const createRes = await request(app)
        .post("/api/papers")
        .send(samplePaper);
      const res = await request(app).get(`/api/papers/${createRes.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: createRes.body.id,
        title: samplePaper.title,
        authors: samplePaper.authors,
        published_in: samplePaper.published_in,
        year: samplePaper.year,
      });
      expectPaperShape(res.body);
    });

    it("should return 404 if paper is not found", async () => {
      const res = await request(app).get("/api/papers/99999");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Paper not found");
    });

    it("should return 400 for invalid id (-1)", async () => {
      const res = await request(app).get("/api/papers/-1");
      expectInvalidIdFormat(res);
    });

    it("should return 400 for invalid id (abc)", async () => {
      const res = await request(app).get("/api/papers/abc");
      expectInvalidIdFormat(res);
    });

    it("should return 400 for invalid id (1a)", async () => {
      const res = await request(app).get("/api/papers/1a");
      expectInvalidIdFormat(res);
    });
  });

  // PUT /api/papers/:id
  describe("PUT /api/papers/:id", () => {
    it("should update an existing paper and change updated_at", async () => {
      const createRes = await request(app)
        .post("/api/papers")
        .send(samplePaper);

      // Ensure updated_at differs if your timestamps are second-level precision
      await sleep(1100);

      const updatedPaper = {
        title: "Updated Title",
        authors: "Updated Author",
        published_in: "Updated Venue",
        year: 2025,
      };

      const res = await request(app)
        .put(`/api/papers/${createRes.body.id}`)
        .send(updatedPaper);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject(updatedPaper);
      expectPaperShape(res.body);
      expect(res.body.updated_at).not.toBe(createRes.body.updated_at);
    });

    it("should return 404 if paper is not found", async () => {
      const res = await request(app).put("/api/papers/99999").send(samplePaper);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Paper not found");
    });

    it("should validate ID format before validating request body", async () => {
      const res = await request(app).put("/api/papers/0").send({});
      // Even though body is invalid, ID-format error should win.
      expectInvalidIdFormat(res);
    });
  });

  // DELETE /api/papers/:id
  describe("DELETE /api/papers/:id", () => {
    it("should delete a paper by ID (204, empty body)", async () => {
      const createRes = await request(app)
        .post("/api/papers")
        .send(samplePaper);
      const res = await request(app).delete(`/api/papers/${createRes.body.id}`);

      expect(res.status).toBe(204);
      expect(res.text).toBe("");

      const getRes = await request(app).get(`/api/papers/${createRes.body.id}`);
      expect(getRes.status).toBe(404);
    });
  });
});
