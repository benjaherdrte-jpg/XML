import express from "express";
import path from "path";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { geminiSchema } from "./services/geminiSchema";

const PORT = 3000;
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  app.post("/api/process-page", async (req, res) => {
    try {
      const { imageBase64, pageNum, attempt } = req.body;
      const isRetry = attempt > 0;
      
      const sysInstruction = `Role: Legal XML Visual Architect specialized in Mexican Legislation.
TASK: Analyze the image using COLOR-CODED HIGHLIGHTS to extract the document structure.

CRITICAL - TABLE EXTRACTION:
- If you see a table (rows/columns), you MUST return it as a 'table' object with 'rows' and 'cells'.
- DO NOT return tables as plain text paragraphs.
- DO NOT use Markdown tables. Use the JSON schema provided.
- Extract rowspans and colspans if cells are merged.
- Preserve text alignment (left/center/right) inside cells.

STRICT COLOR MAPPING RULES (Hierarchy):
1. 🔴 RED HIGHLIGHT = PREAMBLE UNIT (Level: "PRE").
2. 🟢 GREEN HIGHLIGHT = SUPERIOR UNITS (Level: "RB", "TIT", "C", "S"). These contain Articles.
3. 🟣 MAGENTA/CYAN HIGHLIGHT = ARTICLE UNITS (Level: "A"). These contain Paragraphs/Tables.

OUTPUT RULES:
- Return ONLY valid JSON matching the schema.
- Distinguish between 'structural_header' (titles with colors) and 'paragraph' (content body).
- If text is Bold or Italic, mark it in the 'parts' array properties.`;

      const client = getAiClient();
      const response = await client.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { 
          parts: [
            { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } }, 
            { text: `Page ${pageNum}: Extract structure based on RED (Pre), GREEN (Superior), and MAGENTA (Article) highlights. Pay special attention to TABLES.` }
          ] 
        },
        config: {
          systemInstruction: sysInstruction,
          responseMimeType: "application/json",
          responseSchema: geminiSchema,
          temperature: isRetry ? 0.2 : 0.0,
        }
      });

      const text = response.text || '';
      if (!text) {
        return res.status(500).json({ error: "EMPTY_RESPONSE" });
      }

      res.json({ text });
    } catch (e: any) {
      console.error("Gemini Error:", e);
      const errorMessage = e.message || JSON.stringify(e);
      if (e.status === 400 || errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
        return res.status(400).json({ error: "INVALID_API_KEY" });
      }
      if (e.status === 429 || errorMessage.includes('429') || errorMessage.includes('QUOTA_EXCEEDED')) {
        return res.status(429).json({ error: "QUOTA_EXCEEDED" });
      }
      res.status(500).json({ error: e.message || "INTERNAL_ERROR" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
