"use strict";

const express = require("express");
const { Pool } = require("pg");
const path = require("path");
const dotenv = require("dotenv");

/*
 * =========================================================
 * KARTIK BLOG — VERCEL API
 * Express + PostgreSQL
 * =========================================================
 */

/*
 * Load environment variables.
 *
 * Local:
 *   ../.env
 *
 * Vercel:
 *   Environment Variables configured in Vercel
 */

dotenv.config({
  path: path.join(__dirname, "..", ".env"),
});

const app = express();

/*
 * =========================================================
 * DATABASE
 * =========================================================
 */

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing.");
}

const poolConfig = {
  connectionString: process.env.DATABASE_URL,

  max: Number(process.env.DB_POOL_MAX || 5),

  idleTimeoutMillis: 30000,

  connectionTimeoutMillis: 10000,
};

/*
 * Neon/PostgreSQL uses SSL in production.
 *
 * sslmode=require in DATABASE_URL is also supported.
 */

if (
  process.env.NODE_ENV === "production" ||
  process.env.DATABASE_URL?.includes("sslmode=require")
) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const pool = new Pool(poolConfig);

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

/*
 * =========================================================
 * EXPRESS CONFIGURATION
 * =========================================================
 */

app.disable("x-powered-by");

app.use(
  express.json({
    limit: "2mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "2mb",
  }),
);

/*
 * =========================================================
 * BASIC SECURITY HEADERS
 * =========================================================
 */

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");

  res.setHeader(
    "X-Frame-Options",
    "SAMEORIGIN",
  );

  res.setHeader(
    "Referrer-Policy",
    "strict-origin-when-cross-origin",
  );

  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  next();
});

/*
 * =========================================================
 * ADMIN AUTHENTICATION
 * =========================================================
 */

function adminAuth(req, res, next) {
  const header = String(
    req.headers.authorization || "",
  ).trim();

  if (!header) {
    res.setHeader(
      "WWW-Authenticate",
      'Basic realm="Kartik Blog Admin"',
    );

    return res.status(401).json({
      error: "Admin login required.",
    });
  }

  if (!/^Basic\s+/i.test(header)) {
    res.setHeader(
      "WWW-Authenticate",
      'Basic realm="Kartik Blog Admin"',
    );

    return res.status(401).json({
      error: "Invalid authentication method.",
    });
  }

  const encodedCredentials = header
    .replace(/^Basic\s+/i, "")
    .trim();

  if (!encodedCredentials) {
    res.setHeader(
      "WWW-Authenticate",
      'Basic realm="Kartik Blog Admin"',
    );

    return res.status(401).json({
      error: "Invalid credentials.",
    });
  }

  let decoded;

  try {
    decoded = Buffer.from(
      encodedCredentials,
      "base64",
    ).toString("utf8");
  } catch {
    res.setHeader(
      "WWW-Authenticate",
      'Basic realm="Kartik Blog Admin"',
    );

    return res.status(401).json({
      error: "Invalid credentials.",
    });
  }

  const separator = decoded.indexOf(":");

  if (separator < 0) {
    res.setHeader(
      "WWW-Authenticate",
      'Basic realm="Kartik Blog Admin"',
    );

    return res.status(401).json({
      error: "Invalid credentials.",
    });
  }

  const username = decoded
    .slice(0, separator)
    .trim();

  const password = decoded.slice(
    separator + 1,
  );

  const configuredUsername =
    typeof process.env.ADMIN_USERNAME === "string"
      ? process.env.ADMIN_USERNAME.trim()
      : "";

  const configuredPassword =
    typeof process.env.ADMIN_PASSWORD === "string"
      ? process.env.ADMIN_PASSWORD
      : "";

  if (
    !configuredUsername ||
    !configuredPassword
  ) {
    console.error(
      "Admin authentication is not configured. " +
      "Set ADMIN_USERNAME and ADMIN_PASSWORD in the deployment environment.",
    );

    return res.status(500).json({
      error:
        "Admin authentication is not configured.",
    });
  }

  /*
   * Compare the decoded credentials with the
   * deployment environment variables.
   *
   * Username is trimmed because accidental leading/
   * trailing spaces in a Vercel environment variable
   * should not prevent login.
   *
   * Password is intentionally NOT trimmed. A password
   * may legitimately contain spaces.
   */
  if (
    username !== configuredUsername ||
    password !== configuredPassword
  ) {
    res.setHeader(
      "WWW-Authenticate",
      'Basic realm="Kartik Blog Admin"',
    );

    return res.status(401).json({
      error:
        "Invalid username or password.",
    });
  }

  req.adminUser = configuredUsername;
  next();
}

/*
 * =========================================================
 * SLUG
 * =========================================================
 */

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 120);
}

/*
 * =========================================================
 * DATE
 * =========================================================
 */

function getLocalFallbackDate() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(now.getMonth() + 1)
      .padStart(2, "0");

  const day =
    String(now.getDate())
      .padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/*
 * =========================================================
 * POST NORMALIZATION
 * =========================================================
 */

function normalizePost(row) {
  return {
    id: row.id,

    slug: row.slug,

    title: row.title,

    excerpt: row.excerpt || "",

    image: row.image || "",

    tags: Array.isArray(row.tags)
      ? row.tags
      : [],

    author:
      row.author ||
      "Kartik Yadav Gurve",

    date: row.date,

    readTime: row.read_time,

    featured: Boolean(row.featured),

    published: Boolean(row.published),

    content: row.content || "",
  };
}

/*
 * =========================================================
 * HEALTH CHECK
 * =========================================================
 */

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      ok: true,
      database: true,
      service: "kartik-blog-api",
    });
  } catch (error) {
    console.error(
      "Health check database error:",
      error,
    );

    res.status(503).json({
      ok: false,
      database: false,
      service: "kartik-blog-api",
    });
  }
});

/*
 * =========================================================
 * PUBLIC POSTS
 * =========================================================
 */

app.get("/api/posts", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        id,
        slug,
        title,
        excerpt,
        image,
        tags,
        author,
        date,
        read_time,
        featured,
        published,
        content
      FROM posts
      WHERE published = TRUE
      ORDER BY date DESC, id DESC
      `,
    );

    res.json(
      rows.map(normalizePost),
    );
  } catch (error) {
    console.error(
      "Public posts error:",
      error,
    );

    res.status(500).json({
      error:
        "Unable to load published posts.",
    });
  }
});

/*
 * =========================================================
 * ADMIN — CURRENT USER
 * =========================================================
 */

app.get(
  "/api/admin/me",
  adminAuth,
  (req, res) => {
    res.json({
      authenticated: true,
      username:
        req.adminUser,
    });
  },
);

/*
 * =========================================================
 * ADMIN — GET ALL POSTS
 * =========================================================
 */

app.get(
  "/api/admin/posts",
  adminAuth,
  async (req, res) => {
    try {
      const { rows } =
        await pool.query(
          `
          SELECT
            id,
            slug,
            title,
            excerpt,
            image,
            tags,
            author,
            date,
            read_time,
            featured,
            published,
            content
          FROM posts
          ORDER BY date DESC, id DESC
          `,
        );

      res.json(
        rows.map(normalizePost),
      );
    } catch (error) {
      console.error(
        "Admin posts error:",
        error,
      );

      res.status(500).json({
        error:
          "Unable to load posts.",
      });
    }
  },
);

/*
 * =========================================================
 * ADMIN — CREATE POST
 * =========================================================
 */

app.post(
  "/api/admin/posts",
  adminAuth,
  async (req, res) => {
    try {
      const data =
        req.body || {};

      const title =
        String(
          data.title || "",
        ).trim();

      const content =
        String(
          data.content || "",
        ).trim();

      if (!title || !content) {
        return res.status(400).json({
          error:
            "Title and content are required.",
        });
      }

      const slug =
        slugify(
          data.slug || title,
        );

      if (!slug) {
        return res.status(400).json({
          error:
            "A valid slug is required.",
        });
      }

      const tags =
        Array.isArray(data.tags)
          ? data.tags
              .map((tag) =>
                String(tag).trim(),
              )
              .filter(Boolean)
          : [];

      const date =
        String(
          data.date ||
            getLocalFallbackDate(),
        ).slice(0, 10);

      const parsedReadTime =
        Number(data.readTime);

      const readTime =
        Number.isFinite(
          parsedReadTime,
        ) &&
        parsedReadTime >= 1
          ? Math.floor(
              parsedReadTime,
            )
          : 1;

      const author =
        String(
          data.author ||
            "Kartik Yadav Gurve",
        ).trim();

      const excerpt =
        String(
          data.excerpt || "",
        ).trim();

      const image =
        String(
          data.image || "",
        ).trim();

      const featured =
        Boolean(data.featured);

      const published =
        Boolean(data.published);

      const result =
        await pool.query(
          `
          INSERT INTO posts
          (
            slug,
            title,
            excerpt,
            image,
            tags,
            author,
            date,
            read_time,
            featured,
            published,
            content
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11
          )
          RETURNING *
          `,
          [
            slug,
            title,
            excerpt,
            image,
            tags,
            author,
            date,
            readTime,
            featured,
            published,
            content,
          ],
        );

      res.status(201).json(
        normalizePost(
          result.rows[0],
        ),
      );
    } catch (error) {
      if (
        error.code ===
        "23505"
      ) {
        return res.status(409).json({
          error:
            "That slug already exists. Use a different slug.",
        });
      }

      console.error(
        "Create post error:",
        error,
      );

      res.status(500).json({
        error:
          "Unable to create post.",
      });
    }
  },
);

/*
 * =========================================================
 * ADMIN — UPDATE POST
 * =========================================================
 */

app.put(
  "/api/admin/posts/:id",
  adminAuth,
  async (req, res) => {
    try {
      const id =
        Number.parseInt(
          req.params.id,
          10,
        );

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return res.status(400).json({
          error:
            "Invalid post ID.",
        });
      }

      const data =
        req.body || {};

      const title =
        String(
          data.title || "",
        ).trim();

      const content =
        String(
          data.content || "",
        ).trim();

      if (!title || !content) {
        return res.status(400).json({
          error:
            "Title and content are required.",
        });
      }

      const slug =
        slugify(
          data.slug || title,
        );

      if (!slug) {
        return res.status(400).json({
          error:
            "A valid slug is required.",
        });
      }

      const tags =
        Array.isArray(data.tags)
          ? data.tags
              .map((tag) =>
                String(tag).trim(),
              )
              .filter(Boolean)
          : [];

      const date =
        String(
          data.date ||
            getLocalFallbackDate(),
        ).slice(0, 10);

      const parsedReadTime =
        Number(data.readTime);

      const readTime =
        Number.isFinite(
          parsedReadTime,
        ) &&
        parsedReadTime >= 1
          ? Math.floor(
              parsedReadTime,
            )
          : 1;

      const author =
        String(
          data.author ||
            "Kartik Yadav Gurve",
        ).trim();

      const excerpt =
        String(
          data.excerpt || "",
        ).trim();

      const image =
        String(
          data.image || "",
        ).trim();

      const featured =
        Boolean(data.featured);

      const published =
        Boolean(data.published);

      const result =
        await pool.query(
          `
          UPDATE posts
          SET
            slug = $1,
            title = $2,
            excerpt = $3,
            image = $4,
            tags = $5,
            author = $6,
            date = $7,
            read_time = $8,
            featured = $9,
            published = $10,
            content = $11,
            updated_at = NOW()
          WHERE id = $12
          RETURNING *
          `,
          [
            slug,
            title,
            excerpt,
            image,
            tags,
            author,
            date,
            readTime,
            featured,
            published,
            content,
            id,
          ],
        );

      if (!result.rows.length) {
        return res.status(404).json({
          error:
            "Post not found.",
        });
      }

      res.json(
        normalizePost(
          result.rows[0],
        ),
      );
    } catch (error) {
      if (
        error.code ===
        "23505"
      ) {
        return res.status(409).json({
          error:
            "That slug already exists. Use a different slug.",
        });
      }

      console.error(
        "Update post error:",
        error,
      );

      res.status(500).json({
        error:
          "Unable to update post.",
      });
    }
  },
);

/*
 * =========================================================
 * ADMIN — DELETE POST
 * =========================================================
 */

app.delete(
  "/api/admin/posts/:id",
  adminAuth,
  async (req, res) => {
    try {
      const id =
        Number.parseInt(
          req.params.id,
          10,
        );

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return res.status(400).json({
          error:
            "Invalid post ID.",
        });
      }

      const result =
        await pool.query(
          `
          DELETE FROM posts
          WHERE id = $1
          `,
          [id],
        );

      if (!result.rowCount) {
        return res.status(404).json({
          error:
            "Post not found.",
        });
      }

      res.status(204).end();
    } catch (error) {
      console.error(
        "Delete post error:",
        error,
      );

      res.status(500).json({
        error:
          "Unable to delete post.",
      });
    }
  },
);

/*
 * =========================================================
 * 404 API RESPONSE
 * =========================================================
 */

app.use("/api", (req, res) => {
  res.status(404).json({
    error:
      "API endpoint not found.",
  });
});

/*
 * =========================================================
 * EXPORT FOR VERCEL
 * =========================================================
 */

module.exports = app;