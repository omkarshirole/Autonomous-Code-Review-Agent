import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { z } from "zod";
import { createReview } from "./review.js";
import { importGitHubSource, importZipSource } from "./sources.js";

const app = express();
const port = Number(process.env.PORT || 8787);

app.disable("x-powered-by");
app.use(cors({ origin: process.env.APP_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);

const settingsSchema = z.object({
  model: z.string().trim().min(1).max(100).optional(),
  strictness: z.enum(["relaxed", "balanced", "strict"]).optional(),
  instructions: z.string().max(8000).optional(),
  disabledRules: z.array(z.string().trim().min(1).max(80)).max(100).optional(),
});

const requestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).optional(),
  diff: z.string().min(10).max(1_500_000),
  settings: settingsSchema.optional(),
});
const githubSchema = z.object({
  url: z.string().trim().min(10).max(1000),
  settings: settingsSchema.optional(),
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 1, fields: 5 },
  fileFilter: (_request, file, callback) => {
    callback(null, file.originalname.toLowerCase().endsWith(".zip"));
  },
});

const requestKey = (request: express.Request) => {
  const rawKey = request.header("x-openai-key")?.trim();
  return rawKey && rawKey.length >= 20 ? rawKey : undefined;
};

const safeError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "Review failed";
  return message
    .replace(/(?:sk|ghp|github_pat)-[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9_.-]+/gi, "Bearer [redacted]");
};

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", service: "reviewpilot" });
});

app.post("/api/reviews", async (request, response) => {
  const parsed = requestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: "Invalid review request",
      details: parsed.error.issues.map((issue) => issue.message),
    });
    return;
  }

  const apiKey = requestKey(request);
  try {
    const review = await createReview(parsed.data, apiKey);
    response.json(review);
  } catch (error) {
    const status = apiKey ? 502 : 500;
    response.status(status).json({
      error: apiKey ? "AI review failed" : "Review failed",
      details: safeError(error),
    });
  }
});

app.post("/api/sources/github", async (request, response) => {
  const parsed = githubSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Invalid GitHub source", details: parsed.error.issues.map((issue) => issue.message) });
    return;
  }
  const githubToken = request.header("x-github-token")?.trim();
  const apiKey = requestKey(request);
  try {
    const imported = await importGitHubSource(parsed.data.url, githubToken);
    const review = await createReview({ ...imported, settings: parsed.data.settings }, apiKey);
    response.json(review);
  } catch (error) {
    response.status(502).json({ error: "GitHub import failed", details: safeError(error) });
  }
});

app.post("/api/sources/zip", upload.single("archive"), async (request, response) => {
  if (!request.file) {
    response.status(400).json({ error: "ZIP file required", details: "Choose one .zip archive to review." });
    return;
  }
  let settings: unknown;
  try {
    settings = request.body.settings ? JSON.parse(request.body.settings) : undefined;
  } catch {
    response.status(400).json({ error: "Invalid settings", details: "The review settings are not valid JSON." });
    return;
  }
  const parsedSettings = settingsSchema.optional().safeParse(settings);
  if (!parsedSettings.success) {
    response.status(400).json({ error: "Invalid settings", details: parsedSettings.error.issues.map((issue) => issue.message) });
    return;
  }
  const apiKey = requestKey(request);
  try {
    const imported = await importZipSource(request.file.buffer, request.file.originalname);
    const review = await createReview({ ...imported, settings: parsedSettings.data }, apiKey);
    response.json(review);
  } catch (error) {
    response.status(422).json({ error: "ZIP import failed", details: safeError(error) });
  }
});

app.use(express.static("dist"));
app.get("/{*splat}", (_request, response) => {
  response.sendFile("index.html", { root: "dist" });
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    response.status(400).json({
      error: "ZIP upload failed",
      details: error.code === "LIMIT_FILE_SIZE" ? "The ZIP must be 12 MB or smaller." : safeError(error),
    });
    return;
  }
  response.status(500).json({ error: "Unexpected server error", details: safeError(error) });
});

app.listen(port, () => {
  console.log(`ReviewPilot listening on http://localhost:${port}`);
});
