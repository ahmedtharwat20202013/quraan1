import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Parse JSON payloads
  app.use(express.json());

  // API Route: health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API Route: Gemini Proxy (hides the GEMINI_API_KEY from browser)
  app.post("/api/gemini", async (req, res) => {
    const { prompt, model } = req.body;
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not defined on the server." });
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: model || 'gemini-3.5-flash',
        contents: prompt
      });
      
      res.json({ text: response.text });
    } catch (err: any) {
      console.error("Gemini proxy error:", err);
      res.status(500).json({ error: err?.message || "Internal server error during generation" });
    }
  });

  // Vite middleware or static server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
