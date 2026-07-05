import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { createRequire } from "module";
import { MERE_SYSTEM_INSTRUCTIONS } from "./src/mereInstructions.ts";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy initialisation of the GoogleGenAI client to prevent crashing on boot if key is missing
let aiClient: null | GoogleGenAI = null;

function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please configure it in your Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// REST route to parse PDF text
app.post("/api/parse-pdf", async (req, res) => {
  try {
    const { pdfBase64 } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ error: "Nenhum arquivo PDF enviado ou o arquivo está vazio." });
    }

    // Convert base64 back to buffer
    const buffer = Buffer.from(pdfBase64, "base64");
    
    // Parse PDF
    const parsedData = await pdf(buffer);
    
    if (!parsedData || !parsedData.text) {
      return res.status(422).json({ error: "Não foi possível extrair texto legível deste PDF." });
    }

    res.json({ text: parsedData.text });
  } catch (error: any) {
    console.error("Erro ao analisar PDF:", error);
    res.status(500).json({ error: error.message || "Erro interno ao processar o arquivo PDF." });
  }
});

// REST route to reconstruct/audit documents
app.post("/api/reconstruct", async (req, res) => {
  try {
    const {
      inputText,
      command,
      cadencia,
      model,
      previousState,
      previousHtml,
      currentHtml,
      fragmentIndex,
    } = req.body;

    if (!inputText || !inputText.trim()) {
      return res.status(400).json({ error: "O texto ou OCR de origem está vazio." });
    }

    const ai = getAiClient();
    const modelToUse = model || "gemini-3.5-flash";

    let promptText = "";

    if (command === "INICIAR") {
      promptText = `
Você está iniciando uma nova reconstrução de documento médico de alta fidelidade (F1).
Siga rigorosamente as instruções do MERE v4.1.50 fornecidas nas instruções do sistema.

Aqui está o conteúdo do documento original (texto/OCR/slides):
--- INÍCIO DA FONTE ---
${inputText}
--- FIM DA FONTE ---

Cadência do fragmento: ${cadencia} (Determine o escopo físico com base nessa cadência).
Identifique todas as aulas do documento para construir o índice temático de aulas global (.editorial-index).
REGRAS CRÍTICAS DO ÍNDICE:
1. O índice deve conter APENAS as divisões de aulas principais do documento. NUNCA inclua subtópicos, doenças individuais, fármacos, critérios ou subtítulos de aula no índice.
2. É ABSOLUTAMENTE PROIBIDO incluir números de páginas, pontilhados ou span.idx-page no índice visível. Ele deve conter apenas <span class="idx-num"> e <span class="idx-title">.

Inicie a reconstrução emitindo o HTML cru correspondente ao primeiro fragmento. Comece diretamente com <div class="page">. Não coloque formatação em markdown ou textos introdutórios/conclusivos.
      `;
    } else if (command === "CONTINUAR") {
      // Get a tail of the previous HTML to provide continuity to the model
      const htmlString = previousHtml || "";
      const previousHtmlTail = htmlString.length > 5000 ? htmlString.substring(htmlString.length - 5000) : htmlString;

      promptText = `
Você está continuando uma sessão de reconstrução para gerar o próximo fragmento (F${fragmentIndex || 2}).
Siga rigorosamente as instruções do MERE v4.1.50.

CRÍTICO: Como este é um fragmento de continuação (F${fragmentIndex || 2}), você NÃO deve gerar uma capa (.cover) nem um índice (.editorial-index). Comece diretamente com o corpo clínico de continuação dentro da <div class="page">.

Aqui está o conteúdo do documento original (texto/OCR/slides):
--- INÍCIO DA FONTE ---
${inputText}
--- FIM DA FONTE ---

E aqui estão os dados do fragmento processado anteriormente:
- Último MERE_STATE recebido:
${JSON.stringify(previousState || {}, null, 2)}

- Final do HTML gerado anteriormente (para referência estilística e gramatical):
--- ÚLTIMO HTML EMITIDO ---
${previousHtmlTail}
--- FIM DO ÚLTIMO HTML EMITIDO ---

Sua tarefa:
Retome a escrita a partir do ponto indicado no cursor de continuação:
- Âncora de próximo início prevista: "${previousState?.cursor?.["ancora-proximo-inicio"] || "Siga a sequência lógica"}"
- Próxima página prevista: ${previousState?.cursor?.["proximo-inicio-previsto"] || "página seguinte à processada"}

Gere apenas o próximo fragmento, iniciando com <div class="page"> e finalizando com seu respectivo MERE_STATE. Se este for o último fragmento que consome o resto da fonte, encerre com o fechamento global de tags </body></html> e marque o status do MERE_STATE como "concluido".
      `;
    } else if (command === "AUDITAR_FONTE") {
      promptText = `
Você é o Auditor Adversarial MERE v4.1.50.
Sua tarefa é analisar o fragmento HTML gerado comparando-o detalhadamente com a fonte original para encontrar quaisquer perdas de dados críticos (P0/P1), linhas de tabela omitidas, ramos de fluxos esquecidos ou imprecisões numéricas.

Aqui está o fragmento atual do HTML que foi gerado:
--- INÍCIO DO HTML GERADO ---
${currentHtml || ""}
--- FIM DO HTML GERADO ---

E aqui está o texto/OCR original correspondente na fonte:
--- INÍCIO DA FONTE ---
${inputText}
--- FIM DA FONTE ---

Execute o comando AUDITAR_FONTE F${fragmentIndex || "X"}:
Compare adversarialmente o HTML com a Fonte. Gere uma lista concisa e precisa de desvios, omissões (especialmente de doses, frequências, cortes, critérios) ou distorções.
Escreva sua resposta de auditoria estruturada em um bloco visível de alerta do MERE com as classes CSS correspondentes:
<div class="box warn">
  <div class="box-title">Auditoria Adversarial MERE - Fragmento F${fragmentIndex || "X"}</div>
  <p><strong>Resultado da Auditoria:</strong> [Liste os desvios, se houver, ou confirme que está 100% fiel]</p>
</div>

Adicione também um template MERE_STATE invisível atualizado com as auditorias críticas calculadas.
      `;
    }

    // Helper to get fallback chain
    const getModelFallbackChain = (initialModel: string): string[] => {
      const chain = [initialModel];
      if (initialModel === "gemini-2.5-pro") {
        if (!chain.includes("gemini-2.5-flash")) chain.push("gemini-2.5-flash");
        if (!chain.includes("gemini-3.5-flash")) chain.push("gemini-3.5-flash");
        if (!chain.includes("gemini-1.5-flash")) chain.push("gemini-1.5-flash");
      } else if (initialModel === "gemini-2.5-flash") {
        if (!chain.includes("gemini-3.5-flash")) chain.push("gemini-3.5-flash");
        if (!chain.includes("gemini-1.5-flash")) chain.push("gemini-1.5-flash");
      } else if (initialModel === "gemini-3.5-flash") {
        if (!chain.includes("gemini-1.5-flash")) chain.push("gemini-1.5-flash");
      } else {
        if (!chain.includes("gemini-2.5-flash")) chain.push("gemini-2.5-flash");
        if (!chain.includes("gemini-3.5-flash")) chain.push("gemini-3.5-flash");
      }
      return chain;
    };

    const modelsToTry = getModelFallbackChain(modelToUse);
    let lastError: any = null;
    let responseText = "";
    let finalModelUsed = "";

    for (const currentModel of modelsToTry) {
      try {
        console.log(`Tentando processamento com o modelo: ${currentModel}...`);
        const response = await ai.models.generateContent({
          model: currentModel,
          contents: promptText,
          config: {
            systemInstruction: MERE_SYSTEM_INSTRUCTIONS,
            temperature: 0.15, // low temperature for maximum fidelity
          },
        });
        
        responseText = response.text || "";
        finalModelUsed = currentModel;
        break; // Success! Exit loop
      } catch (err: any) {
        lastError = err;
        const errString = (
          JSON.stringify(err) + " " +
          (err.message || "") + " " +
          err.toString()
        ).toLowerCase();

        const isQuotaOrRateLimit = 
          errString.includes("429") || 
          errString.includes("quota") || 
          errString.includes("rate limit") || 
          errString.includes("resource_exhausted") || 
          errString.includes("limit exceeded") ||
          errString.includes("exhausted");

        if (isQuotaOrRateLimit) {
          console.warn(`[Aviso de Cota] Modelo ${currentModel} falhou por limite de cota/rate limit. Tentando próximo modelo da fila...`);
          // Give it a tiny delay to let any transient rate limits clear
          await new Promise(resolve => setTimeout(resolve, 800));
          continue;
        } else {
          // If it's a structural or authenticate error, throw immediately
          throw err;
        }
      }
    }

    if (!responseText && lastError) {
      throw lastError;
    }

    res.json({ text: responseText, modelUsed: finalModelUsed });
  } catch (error: any) {
    console.error("Erro na rota de reconstrução:", error);
    res.status(500).json({ error: error.message || "Erro desconhecido na reconstrução." });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

async function startServer() {
  // Vite middleware for development
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
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
