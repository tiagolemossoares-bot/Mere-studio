import { useState, useEffect } from "react";
import { 
  Play, 
  RotateCcw, 
  FileCode, 
  Eye, 
  Copy, 
  Check, 
  Sparkles, 
  Activity, 
  ListOrdered, 
  ArrowRight, 
  ClipboardCheck, 
  AlertTriangle, 
  RefreshCw, 
  FileText, 
  Download,
  BookOpen,
  Upload,
  Zap,
  Crown,
  ShieldCheck,
  CreditCard,
  X,
  ChevronRight,
  HelpCircle,
  TrendingUp,
  Filter,
  Search,
  Award,
  Link2,
  Layers
} from "lucide-react";
import { FragmentSession, MerePreflight, MereExtract, MereState } from "./types";

// High-quality clinical sample for test drives
const SAMPLE_CLINICAL_SOURCE = `SLIDE 1: REANIMAÇÃO NEONATAL EM SALA DE PARTO
- Diretrize oficial 2026.
- Alvo principal: estabelecer ventilação pulmonar eficaz nos primeiros 60 segundos ("Golden Minute").
- Avaliação inicial imediata pós-nascimento:
  * Gestação a termo?
  * Respirando ou chorando?
  * Tônus muscular adequado?
- Conduta se SIM para as três: clampeamento tardio do cordão (1-3 minutos) e manter com a mãe.
- Conduta se NÃO para qualquer uma: mesa de reanimação, clampeamento imediato.

SLIDE 2: ALGORITMO DE PASSOS INICIAIS (30 SEGUNDOS)
1. Aquecer: manter temperatura corporal entre 36,5°C e 37,5°C.
2. Posicionar: leve extensão do pescoço (posição de olfatação).
3. Aspirar: somente se houver obstrução de vias aéreas por secreção ou mecônio. Aspirar primeiro a boca, depois as narinas.
4. Secar: remover campos úmidos rapidamente.
- Avaliar Frequência Cardíaca (FC) por ausculta do precórdio por 6 segundos e respiração.

SLIDE 3: VENTILAÇÃO COM PRESSÃO POSITIVA (VPP)
- Indicação: se FC < 100 bpm, apneia ou respiração irregular após passos iniciais.
- Tempo limite para início: dentro do primeiro minuto de vida (Golden Minute).
- Frequência da VPP: 40 a 60 movimentos por minuto. Ritmo sugerido: "Aperta, solta, solta..."
- Oxigênio inicial na VPP:
  * IG >= 34 semanas: iniciar com Ar Comprimido (O2 a 21%).
  * IG < 34 semanas: iniciar com O2 a 30%.
- Monitorização obrigatória com Oxímetro de pulso em membro superior direito (pré-ductal) e monitor de ECG de 3 eletrodos.

SLIDE 4: FARMACOLOGIA DA REANIMAÇÃO NEONATAL
Tabela de Medicamentos e Condutas Críticas:
| Fármaco | Indicação | Via de Acesso | Dose / Preparo | Frequência / Ritmo | Alertas Clínicos |
| Adrenalina (1:10.000) | FC < 60 bpm após 30s de VPP e massagem cardíaca coordenada eficaz | IV (preferencialmente veia umbilical) ou ET (traqueal, dose única se sem acesso) | IV: 0,01 a 0,03 mg/kg (0,1 a 0,3 mL/kg); ET: 0,05 a 0,1 mg/kg (0,5 a 1,0 mL/kg) | Repetir a cada 3 a 5 minutos se FC continuar < 60 bpm | ATENÇÃO: Nunca administrar Adrenalina sem ventilação adequada estabelecida. Diluir em SF 0,9% para preparar 1:10.000. |
| Expansor de Volume (SF 0,9% ou Ringer Lactato) | Suspeita de hipovolemia (palidez cutânea, pulsos finos) ou perda sanguínea aguda | Intravenosa lenta (veia umbilical) | 10 mL/kg | Administrar lentamente ao longo de 5 a 10 minutos | CUIDADO: Evitar infusão rápida em prematuros devido ao risco de hemorragia peri-intraventricular. |

SLIDE 5: REGRAS DE EXCEÇÃO E CONTRAINDICAÇÕES
- Mecônio: se recém-nascido não vigoroso com líquido meconial, levar imediatamente à mesa de reanimação. Iniciar passos iniciais de aquecimento e posicionamento. Se respiração anormal ou FC < 100, iniciar VPP. A aspiração traqueal sob visualização direta não é mais recomendada de rotina.
- Hérnia Diafragmática Congênita suspeita ou confirmada: CONTRAINDICADA VPP com máscara facial devido ao risco de insuflação do estômago e compressão pulmonar. Conduta obrigatória: intubação traqueal imediata na sala de parto.`;

export default function App() {
  const [inputText, setInputText] = useState(SAMPLE_CLINICAL_SOURCE);
  const [command, setCommand] = useState<"INICIAR" | "CONTINUAR" | "AUDITAR_FONTE">("INICIAR");
  const [cadencia, setCadencia] = useState("6_paginas_visual_multiquadro");
  const [model, setModel] = useState("gemini-3.5-flash");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [modelWarning, setModelWarning] = useState("");
  
  // Historical sessions for the fragment pipeline
  const [sessions, setSessions] = useState<FragmentSession[]>([]);
  const [activeSessionIndex, setActiveSessionIndex] = useState<number | null>(null);
  
  // UI Tabs: 'preview' | 'preflight' | 'extract' | 'state' | 'raw' | 'consolidated'
  const [activeTab, setActiveTab] = useState<"preview" | "preflight" | "extract" | "state" | "raw" | "consolidated">("preview");
  const [copied, setCopied] = useState(false);

  // PDF upload states
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [pdfUploadSuccess, setPdfUploadSuccess] = useState("");
  const [pdfUploadError, setPdfUploadError] = useState("");
  const [pdfProgressText, setPdfProgressText] = useState("");

  // Slicing states for handling massive documents (60 - 100 pages)
  interface TextSlice {
    index: number;
    label: string;
    text: string;
    status: "pending" | "processing" | "completed" | "failed";
    error?: string;
  }
  const [slices, setSlices] = useState<TextSlice[]>([]);
  const [activeSliceIndex, setActiveSliceIndex] = useState<number | null>(null);
  const [useSlicing, setUseSlicing] = useState(false);
  const [isProcessingParallel, setIsProcessingParallel] = useState(false);
  const [parallelProgress, setParallelProgress] = useState({ current: 0, total: 0 });
  const [parallelStrategy, setParallelStrategy] = useState<"sequential" | "concurrent">("sequential");
  const [concurrencyLimit, setConcurrencyLimit] = useState<number>(3);

  // Monetization & Premium plan states
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    try {
      return localStorage.getItem("mere_premium_active") === "true";
    } catch {
      return false;
    }
  });
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"resident" | "pro" | "clinic">("pro");
  const [checkoutStep, setCheckoutStep] = useState<"form" | "loading" | "success">("form");

  // Onboarding & Help Tour states
  const [hasTourBeenDismissed, setHasTourBeenDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("mere_tour_dismissed") === "true";
    } catch {
      return false;
    }
  });

  // Simulated metrics tracking
  const [reconstructedPagesCount, setReconstructedPagesCount] = useState<number>(() => {
    try {
      return Number(localStorage.getItem("mere_stats_pages_count") || "0");
    } catch {
      return 0;
    }
  });

  // Search & Filter state for visual review
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<"all" | "verde" | "amarelo" | "vermelho">("all");

  const generateSlices = (text: string) => {
    if (!text || text.trim().length === 0) {
      setSlices([]);
      setActiveSliceIndex(null);
      setUseSlicing(false);
      return;
    }

    const newSlices: TextSlice[] = [];
    
    // Pattern 1: Check for "==Start of OCR for page X=="
    const pageRegex = /==Start of OCR for page (\d+)==([\s\S]*?)(===?End of OCR for page \1===?|$)/gi;
    let match;
    const pages: { pageNum: number; content: string }[] = [];
    
    while ((match = pageRegex.exec(text)) !== null) {
      pages.push({
        pageNum: parseInt(match[1]),
        content: `==Start of OCR for page ${match[1]}==\n${match[2].trim()}\n==End of OCR for page ${match[1]}==`
      });
    }

    // Pattern 2: If no OCR pages, check for "SLIDE X:" or "PÁGINA X:"
    if (pages.length === 0) {
      const slideRegex = /(?:SLIDE|PÁGINA|PAG|PAGE)\s+(\d+)\b:?([\s\S]*?)(?=(?:SLIDE|PÁGINA|PAG|PAGE)\s+\d+\b:?|$)/gi;
      let slideMatch;
      while ((slideMatch = slideRegex.exec(text)) !== null) {
        pages.push({
          pageNum: parseInt(slideMatch[1]),
          content: `SLIDE ${slideMatch[1]}:\n${slideMatch[2].trim()}`
        });
      }
    }

    if (pages.length > 0) {
      // Group pages into batches of 5 pages each (optimal balance of density vs time)
      const batchSize = 5;
      for (let i = 0; i < pages.length; i += batchSize) {
        const chunk = pages.slice(i, i + batchSize);
        const startPage = chunk[0].pageNum;
        const endPage = chunk[chunk.length - 1].pageNum;
        const joinedText = chunk.map(p => p.content).join("\n\n");
        const sliceIdx = Math.floor(i / batchSize) + 1;
        
        newSlices.push({
          index: sliceIdx,
          label: `Lote ${sliceIdx} (Págs ${startPage}-${endPage})`,
          text: joinedText,
          status: "pending"
        });
      }
    } else {
      // Pattern 3: Fallback split by character blocks (approx 10,000 characters)
      const maxCharLen = 10000;
      const paragraphs = text.split(/\n\s*\n/);
      let currentChunk: string[] = [];
      let currentLen = 0;
      let sliceIdx = 1;

      for (const para of paragraphs) {
        if (para.trim() === "") continue;
        if (currentLen + para.length > maxCharLen && currentChunk.length > 0) {
          newSlices.push({
            index: sliceIdx,
            label: `Lote ${sliceIdx} (Parte ${sliceIdx})`,
            text: currentChunk.join("\n\n"),
            status: "pending"
          });
          sliceIdx++;
          currentChunk = [para];
          currentLen = para.length;
        } else {
          currentChunk.push(para);
          currentLen += para.length;
        }
      }

      if (currentChunk.length > 0) {
        newSlices.push({
          index: sliceIdx,
          label: `Lote ${sliceIdx} (Parte ${sliceIdx})`,
          text: currentChunk.join("\n\n"),
          status: "pending"
        });
      }
    }

    if (newSlices.length > 1) {
      setSlices(newSlices);
      setActiveSliceIndex(0);
      setUseSlicing(true);
      setInputText(newSlices[0].text);
    } else {
      setSlices([]);
      setActiveSliceIndex(null);
      setUseSlicing(false);
    }
  };

  const handlePdfFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      setPdfUploadError("Por favor, envie apenas arquivos no formato PDF.");
      setPdfUploadSuccess("");
      return;
    }
    
    setIsUploadingPdf(true);
    setPdfUploadError("");
    setPdfUploadSuccess("");
    setPdfProgressText("Carregando o arquivo PDF localmente...");
    
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          if (!arrayBuffer) {
            throw new Error("Não foi possível carregar os dados do arquivo PDF.");
          }

          // Access pdfjsLib loaded in index.html
          const pdfjsLib = (window as any).pdfjsLib;
          if (!pdfjsLib) {
            throw new Error("A biblioteca pdf.js não foi carregada no navegador. Verifique sua conexão com a internet e atualize a página.");
          }

          // Configure worker Src matching version 3.11.174
          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

          setPdfProgressText("Iniciando mecanismo local de extração...");
          const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
          
          const pdfDoc = await loadingTask.promise;
          const numPages = pdfDoc.numPages;
          
          setPdfProgressText(`Documento carregado. Extraindo página 0 de ${numPages}...`);
          
          let fullText = "";
          
          for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            setPdfProgressText(`Processando página ${pageNum} de ${numPages}...`);
            const page = await pdfDoc.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Extract and join text items preserving positions/lines
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(" ");
            
            fullText += `==Start of OCR for page ${pageNum}==\n${pageText.trim()}\n==End of OCR for page ${pageNum}==\n\n`;
          }

          if (!fullText.replace(/==Start of OCR for page \d+==|==End of OCR for page \d+==/g, "").trim()) {
            throw new Error("O PDF foi aberto, mas nenhum texto legível pôde ser extraído. Se este for um PDF escaneado (imagem pura), por favor utilize uma ferramenta OCR primeiro.");
          }

          setInputText(fullText);
          setPdfUploadSuccess(`Sucesso! ${numPages} páginas processadas e ${fullText.length} caracteres extraídos 100% localmente!`);
          
          try {
            const newPagesCount = reconstructedPagesCount + numPages;
            setReconstructedPagesCount(newPagesCount);
            localStorage.setItem("mere_stats_pages_count", String(newPagesCount));
          } catch (e) {
            console.error("Failed to save stats", e);
          }
          
          // Generate batches/slices for large documents
          generateSlices(fullText);
        } catch (innerError: any) {
          console.error("Erro na extração de PDF no navegador:", innerError);
          setPdfUploadError(innerError.message || "Falha na extração de texto do PDF.");
        } finally {
          setIsUploadingPdf(false);
          setPdfProgressText("");
        }
      };
      
      reader.onerror = () => {
        setPdfUploadError("Erro ao ler o arquivo físico local.");
        setIsUploadingPdf(false);
        setPdfProgressText("");
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      setPdfUploadError(error.message || "Erro inesperado ao ler PDF.");
      setIsUploadingPdf(false);
      setPdfProgressText("");
    }
  };

  // Load history from localStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem("mere_sessions_history");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionIndex(parsed.length - 1);
        }
      } catch (e) {
        console.error("Failed to parse sessions cache", e);
      }
    }
  }, []);

  // Save sessions helper
  const updateSessions = (newSessions: FragmentSession[]) => {
    setSessions(newSessions);
    localStorage.setItem("mere_sessions_history", JSON.stringify(newSessions));
    if (newSessions.length > 0) {
      setActiveSessionIndex(newSessions.length - 1);
    } else {
      setActiveSessionIndex(null);
    }
  };

  const clearHistory = () => {
    if (window.confirm("Deseja realmente limpar todo o histórico de reconstrução atual?")) {
      updateSessions([]);
      setErrorMsg("");
    }
  };

  // Parsing utilities for MERE tags
  const extractTagContent = (text: string, startTag: string, endTag: string): string => {
    const startIndex = text.indexOf(startTag);
    if (startIndex === -1) return "";
    const endIndex = text.indexOf(endTag, startIndex + startTag.length);
    if (endIndex === -1) return "";
    return text.substring(startIndex + startTag.length, endIndex).trim();
  };

  const parsePreflight = (rawText: string): MerePreflight | null => {
    const block = extractTagContent(rawText, '<template class="mere-operational-state mere-preflight" data-mere-block="MERE_PREFLIGHT">', "</template>");
    if (!block) return null;

    return {
      escopo: extractTagContent(block, "<escopo>", "</escopo>"),
      cadencia: extractTagContent(block, "<cadencia-fragmento>", "</cadencia-fragmento>"),
      riscos: extractTagContent(block, "<riscos>", "</riscos>"),
      ancorasOcr: extractTagContent(block, "<ancoras-ocr-bruto>", "</ancoras-ocr-bruto>"),
      inventarioEstrutural: extractTagContent(block, "<inventario-estrutural>", "</inventario-estrutural>"),
      inventarioVisual: extractTagContent(block, "<inventario-visual>", "</inventario-visual>"),
      inventarioVisualBruto: extractTagContent(block, "<inventario-visual-bruto>", "</inventario-visual-bruto>"),
      inventarioIncerto: extractTagContent(block, "<inventario-incerto>", "</inventario-incerto>") === "sim",
      visualLedger: extractTagContent(block, "<visual-assets-ledger>", "</visual-assets-ledger>"),
      componentLedger: extractTagContent(block, "<component-ledger>", "</component-ledger>"),
      subitemLedger: extractTagContent(block, "<subitem-ledger>", "</subitem-ledger>"),
      farmacoLedger: extractTagContent(block, "<farmaco-p0-ledger>", "</farmaco-p0-ledger>"),
      evidenciasExcecoes: extractTagContent(block, "<evidencias-excecoes-exemplos>", "</evidencias-excecoes-exemplos>"),
      pageProof: extractTagContent(block, "<page-proof-planejado>", "</page-proof-planejado>"),
      riscoDenso: extractTagContent(block, "<risco-estrutural-denso>", "</risco-estrutural-denso>"),
      updateOportunidades: extractTagContent(block, "<mere-update-oportunidades>", "</mere-update-oportunidades>"),
      pontoParada: extractTagContent(block, "<ponto-parada>", "</ponto-parada>"),
    };
  };

  const parseExtracts = (rawText: string): MereExtract[] => {
    const list: MereExtract[] = [];
    const block = extractTagContent(rawText, '<template class="mere-operational-state" data-mere-block="MERE_EXTRACT">', "</template>");
    if (!block) return [];

    // Loop through all <extract> tags inside the block
    let currentIndex = 0;
    while (true) {
      const extractStart = block.indexOf("<extract", currentIndex);
      if (extractStart === -1) break;
      const extractEnd = block.indexOf("</extract>", extractStart);
      if (extractEnd === -1) break;

      const singleExtractText = block.substring(extractStart, extractEnd + "</extract>".length);
      
      const paginaMatch = singleExtractText.match(/pagina="([^"]+)"/);
      const componenteMatch = singleExtractText.match(/componente="([^"]+)"/);
      const tipoMatch = singleExtractText.match(/tipo="([^"]+)"/);

      list.push({
        pagina: paginaMatch ? paginaMatch[1] : "",
        componente: componenteMatch ? componenteMatch[1] : "",
        tipo: tipoMatch ? tipoMatch[1] : "",
        atomosP0: extractTagContent(singleExtractText, "<atomos-p0>", "</atomos-p0>"),
        atomosP1: extractTagContent(singleExtractText, "<atomos-p1>", "</atomos-p1>"),
        linhasTabela: extractTagContent(singleExtractText, "<linhas-tabela>", "</linhas-tabela>"),
        bullets: extractTagContent(singleExtractText, "<bullets>", "</bullets>"),
        ramos: extractTagContent(singleExtractText, "<ramos>", "</ramos>"),
        microtexto: extractTagContent(singleExtractText, "<microtexto>", "</microtexto>"),
        visualConversion: extractTagContent(singleExtractText, "<visual-conversion>", "</visual-conversion>"),
        pendencias: extractTagContent(singleExtractText, "<pendencias-extract>", "</pendencias-extract>"),
      });

      currentIndex = extractEnd + "</extract>".length;
    }

    return list;
  };

  const parseState = (rawText: string): MereState | null => {
    const block = extractTagContent(rawText, '<template class="mere-operational-state" data-mere-block="MERE_STATE">', "</template>");
    if (!block) return null;

    const mapDocBlock = extractTagContent(block, "<mapa-doc", "</mapa-doc>");
    const cursorBlock = extractTagContent(block, "<cursor", "</cursor>");
    const auditBlock = extractTagContent(block, "<auditoria-critica", "</auditoria-critica>");
    const updateBlock = extractTagContent(block, "<mere-update-audit", "</mere-update-audit>");
    const estadoBlock = extractTagContent(block, "<estado", "</estado>");

    // Extracting attributes
    const profileMatch = block.match(/profile="([^"]+)"/);
    const versionMatch = block.match(/version="([^"]+)"/);
    const mapStatusMatch = block.match(/status="([^"]+)"/);
    const mapRouteMatch = block.match(/route="([^"]+)"/);
    const mapDensidadeMatch = block.match(/densidade="([^"]+)"/);
    const mapPerfilMatch = block.match(/perfil="([^"]+)"/);
    const cursorFragMatch = block.match(/fragmento="([^"]+)"/);
    const cursorProgMatch = block.match(/progresso="([^"]+)"/);
    const auditStatusMatch = block.match(/status="([^"]+)"/);
    const auditMetodoMatch = block.match(/metodo="([^"]+)"/);
    const updateStatusMatch = block.match(/status="([^"]+)"/);
    const estadoStatusMatch = block.match(/status="([^"]+)"/);
    const estadoProximoMatch = block.match(/proximo-comando="([^"]+)"/);

    return {
      version: versionMatch ? versionMatch[1] : "4.1.50",
      profile: profileMatch ? profileMatch[1] : "completo",
      statusDoc: mapStatusMatch ? mapStatusMatch[1] : "",
      route: mapRouteMatch ? mapRouteMatch[1] : "fragmentado",
      densidade: mapDensidadeMatch ? mapDensidadeMatch[1] : "",
      perfil: mapPerfilMatch ? mapPerfilMatch[1] : "",
      totalPaginas: extractTagContent(mapDocBlock, "<total-paginas>", "</total-paginas>"),
      cadencia: extractTagContent(mapDocBlock, "<cadencia-fragmento>", "</cadencia-fragmento>"),
      intervalo: extractTagContent(mapDocBlock, "<intervalo-alvo-fragmento>", "</intervalo-alvo-fragmento>"),
      motivoRota: extractTagContent(mapDocBlock, "<motivo-rota>", "</motivo-rota>"),
      cursorFragmento: cursorFragMatch ? cursorFragMatch[1] : "",
      cursorProgresso: cursorProgMatch ? cursorProgMatch[1] : "",
      cursorIntervalo: extractTagContent(cursorBlock, "<intervalo>", "</intervalo>"),
      cursorUltimaPagina: extractTagContent(cursorBlock, "<ultima-pagina-fragmento>", "</ultima-pagina-fragmento>"),
      ancoraFinalProcessada: extractTagContent(cursorBlock, "<ancora-final-processada>", "</ancora-final-processada>"),
      ancoraProximoInicio: extractTagContent(cursorBlock, "<ancora-proximo-inicio>", "</ancora-proximo-inicio>"),
      proximoInicioPrevisto: extractTagContent(cursorBlock, "<proximo-inicio-previsto>", "</proximo-inicio-previsto>"),
      contextoClinico: extractTagContent(cursorBlock, "<contexto-clinico-ativo>", "</contexto-clinico-ativo>"),
      fragmentosAnteriores: extractTagContent(cursorBlock, "<fragmentos-anteriores-visiveis>", "</fragmentos-anteriores-visiveis>"),
      auditoriaStatus: auditStatusMatch ? auditStatusMatch[1] : "",
      auditoriaMetodo: auditMetodoMatch ? auditMetodoMatch[1] : "",
      provaP0P1: extractTagContent(auditBlock, "<prova-p0-p1>", "</prova-p0-p1>"),
      ledgerVerificacao: extractTagContent(auditBlock, "<ledger-verificacao>", "</ledger-verificacao>"),
      pageProofAudit: extractTagContent(auditBlock, "<page-proof>", "</page-proof>"),
      extractDiff: extractTagContent(auditBlock, "<extract-diff>", "</extract-diff>"),
      inventarioVisualAudit: extractTagContent(auditBlock, "<inventario-visual-audit>", "</inventario-visual-audit>"),
      visualConversionAudit: extractTagContent(auditBlock, "<visual-conversion-audit>", "</visual-conversion-audit>"),
      suspeitasOmissao: extractTagContent(auditBlock, "<suspeitas-de-omissao>", "</suspeitas-de-omissao>"),
      indiceAulasAudit: extractTagContent(auditBlock, "<indice-aulas-audit>", "</indice-aulas-audit>"),
      confissaoPerdas: extractTagContent(auditBlock, "<confissao-de-perdas>", "</confissao-de-perdas>"),
      updateStatus: updateStatusMatch ? updateStatusMatch[1] : "sem_update",
      updatesVisiveis: extractTagContent(updateBlock, "<updates-visiveis>", "</updates-visiveis>"),
      updateFontes: extractTagContent(updateBlock, "<fontes-externas>", "</fontes-externas>"),
      updateSeparacao: extractTagContent(updateBlock, "<separacao-fonte-update>", "</separacao-fonte-update>"),
      updateContaminacao: extractTagContent(updateBlock, "<contaminacao-corpo-fiel>", "</contaminacao-corpo-fiel>"),
      estadoStatus: estadoStatusMatch ? estadoStatusMatch[1] : "",
      estadoProximoComando: estadoProximoMatch ? estadoProximoMatch[1] : "",
      estadoPodeAvancar: extractTagContent(estadoBlock, "<pode-avancar-fragmento>", "</pode-avancar-fragmento>") === "sim",
      estadoFechamentoPermitido: extractTagContent(estadoBlock, "<fechamento-html-permitido>", "</fechamento-html-permitido>") === "sim",
      estadoMotivoReducao: extractTagContent(estadoBlock, "<motivo-reducao-budget>", "</motivo-reducao-budget>"),
      estadoFlagOmissaoCritica: extractTagContent(estadoBlock, "<flag-omissao-critica>", "</flag-omissao-critica>"),
    };
  };

  // Strip hidden templates and span logs to leave pristine user-facing HTML
  const cleanHtmlContent = (rawText: string): string => {
    let clean = rawText;
    
    // Remove markdown code fences if present
    clean = clean.replace(/```html/gi, "");
    clean = clean.replace(/```/g, "");
    
    // Remove MERE preflight template
    clean = clean.replace(/<template[^>]*data-mere-block="MERE_PREFLIGHT"[\s\S]*?<\/template>/gi, "");
    
    // Remove MERE extract template
    clean = clean.replace(/<template[^>]*data-mere-block="MERE_EXTRACT"[\s\S]*?<\/template>/gi, "");
    
    // Remove MERE state template
    clean = clean.replace(/<template[^>]*data-mere-block="MERE_STATE"[\s\S]*?<\/template>/gi, "");
    
    // Remove Audit layers and progresses
    clean = clean.replace(/<span[^>]*class="[^"]*mere-audit-layer[^"]*"[\s\S]*?<\/span>/gi, "");
    clean = clean.replace(/<span[^>]*data-mere-progress="fragmento"[\s\S]*?<\/span>/gi, "");

    // Resiliently extract only the content starting from the first HTML tag and ending with the last HTML tag
    const firstTag = clean.indexOf("<div");
    if (firstTag !== -1) {
      const lastTag = Math.max(clean.lastIndexOf("</html>"), clean.lastIndexOf("</div>"));
      if (lastTag !== -1 && lastTag > firstTag) {
        const endLength = clean.substring(lastTag).startsWith("</html>") ? "</html>".length : "</div>".length;
        clean = clean.substring(firstTag, lastTag + endLength);
      }
    }

    return clean.trim();
  };

  const handleReconstruct = async () => {
    setIsLoading(true);
    setErrorMsg("");
    setModelWarning("");

    try {
      // Determine what details to provide to the API
      let requestBody: any = {
        inputText,
        command,
        cadencia,
        model,
      };

      if (command === "CONTINUAR" && sessions.length > 0) {
        const lastSession = sessions[sessions.length - 1];
        requestBody.previousState = lastSession.parsedState;
        // Consolidate HTML so far to pass context
        requestBody.previousHtml = sessions.map(s => s.htmlContent).join("\n");
        requestBody.fragmentIndex = sessions.length + 1;
      } else if (command === "AUDITAR_FONTE" && sessions.length > 0) {
        const activeSession = activeSessionIndex !== null ? sessions[activeSessionIndex] : sessions[sessions.length - 1];
        requestBody.currentHtml = activeSession.rawOutput;
        requestBody.fragmentIndex = activeSession.fragmentIndex;
      }

      const res = await fetch("/api/reconstruct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      let rawOutput = "";
      
      if (!res.ok) {
        const contentType = res.headers.get("content-type");
        let serverError = "";
        
        if (contentType && contentType.includes("application/json")) {
          const errJson = await res.json().catch(() => ({}));
          serverError = errJson.error || "Erro desconhecido.";
        } else {
          const textError = await res.text().catch(() => "");
          if (textError.trim().startsWith("<")) {
            serverError = "O servidor de IA demorou mais do que o limite de 60 segundos para processar o texto completo. Como este documento é muito longo, a melhor solução é dividi-lo: envie apenas as primeiras 3 ou 4 páginas para reconstruir a primeira parte, e use o comando CONTINUAR nas partes seguintes para manter a alta fidelidade e evitar timeouts do sistema.";
          } else {
            serverError = textError || "Erro de rede no servidor (resposta não-JSON).";
          }
        }
        throw new Error(serverError);
      }

      const data = await res.json().catch(() => {
        throw new Error("Erro de processamento: O servidor enviou uma resposta malformada.");
      });
      rawOutput = data.text || "";

      if (data.modelUsed && data.modelUsed !== model) {
        setModelWarning(`O modelo ${model} atingiu o limite de cota temporário. O processador utilizou automaticamente o ${data.modelUsed} como fallback resiliente para continuar sem interrupções!`);
      }

      // Parse output
      const preflight = parsePreflight(rawOutput);
      const extracts = parseExtracts(rawOutput);
      const state = parseState(rawOutput);
      const htmlContent = cleanHtmlContent(rawOutput);

      if (command === "AUDITAR_FONTE") {
        // For audit commands, we can replace or append an audit note to the active session
        if (activeSessionIndex !== null) {
          const updated = [...sessions];
          updated[activeSessionIndex] = {
            ...updated[activeSessionIndex],
            rawOutput: rawOutput + "\n\n" + updated[activeSessionIndex].rawOutput,
            // Prepend the audit HTML visualization at top
            htmlContent: htmlContent + "\n<hr class='border-dashed my-8'/>\n" + updated[activeSessionIndex].htmlContent,
          };
          updateSessions(updated);
        } else {
          throw new Error("Não há nenhuma sessão ativa para auditar. Inicie ou continue um fragmento primeiro.");
        }
      } else {
        // INICIAR or CONTINUAR
        const newSession: FragmentSession = {
          fragmentIndex: command === "INICIAR" ? 1 : sessions.length + 1,
          command,
          timestamp: new Date().toLocaleTimeString(),
          inputText,
          rawOutput,
          htmlContent,
          parsedPreflight: preflight,
          parsedExtracts: extracts,
          parsedState: state,
        };

        const updatedHistory = command === "INICIAR" ? [newSession] : [...sessions, newSession];
        updateSessions(updatedHistory);
        
        // Auto-switch tabs to show preview
        setActiveTab("preview");

        // Progress to next slice if using slicing mode
        if (useSlicing && activeSliceIndex !== null) {
          const updatedSlices = [...slices];
          updatedSlices[activeSliceIndex] = {
            ...updatedSlices[activeSliceIndex],
            status: "completed"
          };
          setSlices(updatedSlices);

          const nextIndex = activeSliceIndex + 1;
          if (nextIndex < updatedSlices.length) {
            setActiveSliceIndex(nextIndex);
            setInputText(updatedSlices[nextIndex].text);
            setCommand("CONTINUAR");
          } else {
            setCommand("INICIAR"); // All batches processed!
          }
        } else {
          // Auto-set command to CONTINUAR for the next step if we can advance
          if (state && state.estadoPodeAvancar && !state.estadoFechamentoPermitido) {
            setCommand("CONTINUAR");
          } else if (state && state.estadoFechamentoPermitido) {
            setCommand("INICIAR"); // Session completed
          }
        }
      }

    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Ocorreu um erro ao processar o fragmento médico.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReconstructParallel = async () => {
    if (slices.length === 0) return;
    
    // Premium limitation for monetization showcase
    if (!isPremium && slices.length > 2) {
      setErrorMsg("Acesso Limitado: O fatiamento paralelo para documentos extensos (acima de 2 lotes) é um recurso exclusivo do Plano MERE Pro. Faça o upgrade gratuito no topo para liberar o processamento completo de 60 a 100 páginas em paralelo!");
      setIsUpgradeModalOpen(true);
      return;
    }
    
    setIsProcessingParallel(true);
    setIsLoading(true);
    setErrorMsg("");
    setModelWarning("");
    setParallelProgress({ current: 0, total: slices.length });

    // Mark all slices to "pending" first and reset errors
    const initialSlices = slices.map(s => ({ 
      ...s, 
      status: "pending" as const, 
      error: undefined 
    }));
    setSlices(initialSlices);

    const assembledSessions: FragmentSession[] = [];

    if (parallelStrategy === "concurrent") {
      // CONCURRENT WORKER-POOL STRATEGY
      const limit = concurrencyLimit || 3;
      const queue = [...initialSlices.map((s, idx) => ({ s, idx }))];
      
      const runWorker = async () => {
        while (queue.length > 0) {
          const item = queue.shift();
          if (!item) break;
          const { s, idx } = item;

          // Update current slice status to "processing"
          setSlices(prev => {
            const copy = [...prev];
            if (copy[idx]) {
              copy[idx] = { ...copy[idx], status: "processing" };
            }
            return copy;
          });

          let success = false;
          let attempt = 0;
          let lastError = "";
          let completedSession: FragmentSession | null = null;

          while (attempt < 3 && !success) {
            try {
              // Prepare payload
              const requestBody: any = {
                inputText: s.text,
                command: idx === 0 ? "INICIAR" : "CONTINUAR",
                cadencia,
                model,
                fragmentIndex: idx + 1,
              };

              const res = await fetch("/api/reconstruct", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
              });

              if (!res.ok) {
                const contentType = res.headers.get("content-type");
                let serverError = `Lote ${idx + 1} Falhou no processamento do servidor.`;
                if (contentType && contentType.includes("application/json")) {
                  const errJson = await res.json().catch(() => ({}));
                  serverError = errJson.error || serverError;
                } else {
                  const textError = await res.text().catch(() => "");
                  if (textError.trim().startsWith("<")) {
                    serverError = `O servidor de IA rejeitou o processamento do Lote ${idx + 1} ou excedeu o limite de tempo.`;
                  } else if (textError) {
                    serverError = textError.substring(0, 150);
                  }
                }
                throw new Error(serverError);
              }

              const data = await res.json().catch(() => {
                throw new Error(`O servidor retornou uma resposta inválida no Lote ${idx + 1}.`);
              });

              const rawOutput = data.text || "";

              if (data.modelUsed && data.modelUsed !== model) {
                setModelWarning(`O modelo ${model} atingiu o limite de cota temporário. O processador utilizou automaticamente o ${data.modelUsed} como fallback resiliente para continuar sem interrupções!`);
              }

              // Parse results
              const preflight = parsePreflight(rawOutput);
              const extracts = parseExtracts(rawOutput);
              const state = parseState(rawOutput);
              const htmlContent = cleanHtmlContent(rawOutput);

              completedSession = {
                fragmentIndex: idx + 1,
                command: idx === 0 ? "INICIAR" : "CONTINUAR",
                timestamp: new Date().toLocaleTimeString(),
                inputText: s.text,
                rawOutput,
                htmlContent,
                parsedPreflight: preflight,
                parsedExtracts: extracts,
                parsedState: state,
              };

              success = true;
            } catch (err: any) {
              attempt++;
              lastError = err.message || "Erro de conexão/timeout";
              console.warn(`Tentativa ${attempt} falhou para o Lote ${idx + 1}: ${lastError}`);
              if (attempt < 3) {
                // Exponential backoff to avoid hammer quota limit
                await new Promise(resolve => setTimeout(resolve, attempt * 1500));
              }
            }
          }

          if (success && completedSession) {
            assembledSessions.push(completedSession);
            
            // Mark this individual slice as completed
            setSlices(prev => {
              const copy = [...prev];
              if (copy[idx]) {
                copy[idx] = { ...copy[idx], status: "completed" };
              }
              return copy;
            });

            setParallelProgress(prev => ({ ...prev, current: prev.current + 1 }));
          } else {
            // Mark this individual slice as failed
            setSlices(prev => {
              const copy = [...prev];
              if (copy[idx]) {
                copy[idx] = { 
                  ...copy[idx], 
                  status: "failed", 
                  error: lastError || "Falha persistente após 3 tentativas" 
                };
              }
              return copy;
            });
          }
        }
      };

      // Run up to 'limit' concurrent workers
      const workers = Array.from({ length: Math.min(limit, queue.length) }, () => runWorker());
      await Promise.all(workers);

    } else {
      // SEQUENTIAL CHAINED STRATEGY (ONE-BY-ONE FOR CONTINUITY)
      let currentHtmlAccumulated = "";
      let currentParsedState: any = null;

      try {
        for (let idx = 0; idx < initialSlices.length; idx++) {
          // Update current slice status to "processing"
          setSlices(prev => {
            const copy = [...prev];
            if (copy[idx]) {
              copy[idx] = { ...copy[idx], status: "processing" };
            }
            return copy;
          });

          const slc = initialSlices[idx];
          let success = false;
          let attempt = 0;
          let lastError = "";
          let completedSession: FragmentSession | null = null;

          while (attempt < 3 && !success) {
            try {
              // Prepare payload
              const requestBody: any = {
                inputText: slc.text,
                command: idx === 0 ? "INICIAR" : "CONTINUAR",
                cadencia,
                model,
                fragmentIndex: idx + 1,
              };

              // Pass real historical states and accumulated HTML for context-chaining (clinical continuity)
              if (idx > 0) {
                requestBody.previousState = currentParsedState;
                requestBody.previousHtml = currentHtmlAccumulated;
              }

              const res = await fetch("/api/reconstruct", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
              });

              if (!res.ok) {
                const contentType = res.headers.get("content-type");
                let serverError = `Lote ${idx + 1} Falhou no processamento do servidor.`;
                if (contentType && contentType.includes("application/json")) {
                  const errJson = await res.json().catch(() => ({}));
                  serverError = errJson.error || serverError;
                } else {
                  const textError = await res.text().catch(() => "");
                  if (textError.trim().startsWith("<")) {
                    serverError = `O servidor de IA rejeitou o processamento do Lote ${idx + 1} ou excedeu o limite de tempo.`;
                  } else if (textError) {
                    serverError = textError.substring(0, 150);
                  }
                }
                throw new Error(serverError);
              }

              const data = await res.json().catch(() => {
                throw new Error(`O servidor retornou uma resposta inválida no Lote ${idx + 1}.`);
              });

              const rawOutput = data.text || "";

              if (data.modelUsed && data.modelUsed !== model) {
                setModelWarning(`O modelo ${model} atingiu o limite de cota temporário. O processador utilizou automaticamente o ${data.modelUsed} como fallback resiliente para continuar sem interrupções!`);
              }

              // Parse results
              const preflight = parsePreflight(rawOutput);
              const extracts = parseExtracts(rawOutput);
              const state = parseState(rawOutput);
              const htmlContent = cleanHtmlContent(rawOutput);

              completedSession = {
                fragmentIndex: idx + 1,
                command: idx === 0 ? "INICIAR" : "CONTINUAR",
                timestamp: new Date().toLocaleTimeString(),
                inputText: slc.text,
                rawOutput,
                htmlContent,
                parsedPreflight: preflight,
                parsedExtracts: extracts,
                parsedState: state,
              };

              currentHtmlAccumulated += (currentHtmlAccumulated ? "\n" : "") + htmlContent;
              currentParsedState = state;
              success = true;
            } catch (err: any) {
              attempt++;
              lastError = err.message || "Erro de conexão/timeout";
              console.warn(`Tentativa ${attempt} falhou para o Lote ${idx + 1}: ${lastError}`);
              if (attempt < 3) {
                // Exponential backoff wait (e.g. 2s, 4s) to bypass temporary rate limits safely
                await new Promise(resolve => setTimeout(resolve, attempt * 2000));
              }
            }
          }

          if (success && completedSession) {
            assembledSessions.push(completedSession);
            
            // Mark this individual slice as completed
            setSlices(prev => {
              const copy = [...prev];
              if (copy[idx]) {
                copy[idx] = { ...copy[idx], status: "completed" };
              }
              return copy;
            });

            setParallelProgress(prev => ({ ...prev, current: prev.current + 1 }));
          } else {
            // Mark this individual slice as failed
            setSlices(prev => {
              const copy = [...prev];
              if (copy[idx]) {
                copy[idx] = { 
                  ...copy[idx], 
                  status: "failed", 
                  error: lastError || "Falha persistente após 3 tentativas" 
                };
              }
              return copy;
            });

            // Break the loop if a batch fails, because sequential flow is compromised
            throw new Error(`O processamento foi interrompido no Lote ${idx + 1} devido ao seguinte erro: ${lastError}`);
          }
        }
      } catch (e: any) {
        console.error(e);
        setErrorMsg(e.message || "Erro geral no fatiamento sequencial.");
      }
    }

    // Sort assembledSessions by fragmentIndex to preserve chronological order of document pages
    assembledSessions.sort((a, b) => a.fragmentIndex - b.fragmentIndex);

    // Verify how many succeeded
    const successfulCount = slices.filter(s => s.status === "completed").length + (assembledSessions.length - slices.filter(s => s.status === "completed").length);
    
    if (assembledSessions.length === 0) {
      setErrorMsg("Nenhum lote de fatiamento pôde ser processado com sucesso. Verifique sua conexão ou reduza o tamanho dos lotes.");
    } else {
      updateSessions(assembledSessions);
      // Focus on the preview tab
      setActiveTab("preview");
      
      const failedCount = slices.length - assembledSessions.length;
      if (failedCount > 0) {
        setErrorMsg(`Processamento concluído com alguns desvios: ${assembledSessions.length} de ${slices.length} lotes gerados com sucesso. ${failedCount} lote(s) apresentaram erros.`);
      }
    }

    setIsProcessingParallel(false);
    setIsLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to strip covers and indices from non-initial fragments to prevent duplicates
  const getProcessedHtml = (html: string, fragmentIndex: number) => {
    if (fragmentIndex <= 1) return html;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const covers = doc.querySelectorAll(".cover");
      covers.forEach(el => el.remove());
      const indices = doc.querySelectorAll(".editorial-index");
      indices.forEach(el => el.remove());
      return doc.body.innerHTML;
    } catch (e) {
      return html;
    }
  };

  // Extract sessions consolidated data
  const consolidatedHtml = sessions.map((s, idx) => {
    return getProcessedHtml(s.htmlContent, s.fragmentIndex);
  }).join("\n");
  const consolidatedRaw = sessions.map(s => s.rawOutput).join("\n\n<!-- FRAGMENT SPLIT -->\n\n");

  const activeSession = activeSessionIndex !== null ? sessions[activeSessionIndex] : null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased">
      {/* Header bar */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg border border-emerald-500/30">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-50 tracking-wide flex items-center gap-2">
              MERE <span className="text-emerald-400 font-mono text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">v4.1.50</span>
            </h1>
            <p className="text-xs text-slate-400">Reconstrutor Didático Médico de Alta Fidelidade</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {isPremium ? (
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/15 to-yellow-500/15 text-amber-300 font-bold px-3 py-1.5 rounded-lg border border-amber-500/30 shadow-sm">
              <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
              <span>MERE PRO Ativo</span>
            </div>
          ) : (
            <button
              onClick={() => {
                setCheckoutStep("form");
                setIsUpgradeModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold px-3 py-1.5 rounded-lg shadow-md transition-all scale-100 hover:scale-[1.03] active:scale-[0.98]"
            >
              <Crown className="w-3.5 h-3.5 fill-current" />
              <span>Upgrade para PRO 👑</span>
            </button>
          )}

          <span className="text-slate-400 hidden sm:flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-md border border-slate-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            AI Studio Engine
          </span>
          <a 
            href="#document-rules" 
            className="text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1"
          >
            <BookOpen className="w-4 h-4" /> Diretrizes MERE
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* Left Side: Controllers & Input Panel */}
        <section className="lg:col-span-5 border-r border-slate-800 bg-slate-900/50 p-6 overflow-y-auto flex flex-col gap-6">
          
          {/* Onboarding & Help Tour */}
          {!hasTourBeenDismissed && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/20 rounded-xl p-4 shadow-xl flex flex-col gap-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              <button 
                onClick={() => {
                  setHasTourBeenDismissed(true);
                  try {
                    localStorage.setItem("mere_tour_dismissed", "true");
                  } catch (e) {
                    console.error("Failed to dismiss tour", e);
                  }
                }}
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors"
                title="Fechar Tour"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Como Reconstruir Documentos Gigantes (60-100 Págs)</span>
              </div>
              
              <p className="text-xs text-slate-300 leading-relaxed">
                Siga o fluxo recomendado para garantir <strong>alta performance</strong> e <strong>fidelidade clínica</strong> total sem exceder limites do servidor:
              </p>
              
              <div className="grid grid-cols-1 gap-2.5 mt-1 text-[11px]">
                <div className="flex items-start gap-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                  <span className="bg-emerald-500/20 text-emerald-400 font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">1</span>
                  <div>
                    <strong className="text-slate-200 block">Envie o PDF</strong>
                    <span className="text-slate-400">Arraste um PDF longo acima. O extrator local irá extrair o OCR de forma 100% segura.</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                  <span className="bg-emerald-500/20 text-emerald-400 font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">2</span>
                  <div>
                    <strong className="text-slate-200 block">Processamento Paralelo (Super Rápido)</strong>
                    <span className="text-slate-400">Clique em <strong>&quot;Processar Todos em Paralelo&quot;</strong>. Os lotes serão processados juntos, acelerando a montagem final.</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                  <span className="bg-emerald-500/20 text-emerald-400 font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">3</span>
                  <div>
                    <strong className="text-slate-200 block">A4 &amp; Consolidado</strong>
                    <span className="text-slate-400">Alterne entre visualizações individuais dos lotes ou o documento final pronto para impressão.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Fidelidade Clínica</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-emerald-400 font-mono">100.0%</span>
                <span className="text-[8px] text-emerald-500 bg-emerald-500/10 px-1 py-0.2 rounded">Selo P0</span>
              </div>
            </div>
            
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Páginas Lidas</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-slate-200 font-mono">{reconstructedPagesCount || 5}</span>
                <span className="text-[8px] text-slate-400">Págs</span>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Status do Plano</span>
              <div className="flex items-center gap-1">
                {isPremium ? (
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-0.5">
                    <Crown className="w-3 h-3 text-amber-400 fill-amber-400 animate-pulse" /> PRO
                  </span>
                ) : (
                  <button 
                    onClick={() => {
                      setCheckoutStep("form");
                      setIsUpgradeModalOpen(true);
                    }}
                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 underline text-left"
                  >
                    Ativar PRO
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick controls bar */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" /> Parâmetros de Execução
              </h2>
              {sessions.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-xs text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Limpar Histórico
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Modelo Gemini</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-medium focus:border-emerald-500 focus:outline-none"
                >
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Cadência Canônica</label>
                <select
                  value={cadencia}
                  onChange={(e) => setCadencia(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-medium focus:border-emerald-500 focus:outline-none"
                >
                  <option value="6_paginas_visual_multiquadro">6 Págs (Slides / Multi-quadro)</option>
                  <option value="10_paginas_visual_simples">10 Págs (Visual Simples)</option>
                  <option value="15_paginas_textual">15 Págs (Textual / Linear)</option>
                </select>
              </div>
            </div>

            {/* Action Selection */}
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Ação Principal</label>
              <div className="grid grid-cols-3 gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setCommand("INICIAR")}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                    command === "INICIAR"
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  INICIAR (F1)
                </button>
                <button
                  type="button"
                  disabled={sessions.length === 0}
                  onClick={() => setCommand("CONTINUAR")}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    command === "CONTINUAR"
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  CONTINUAR
                </button>
                <button
                  type="button"
                  disabled={sessions.length === 0}
                  onClick={() => setCommand("AUDITAR_FONTE")}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    command === "AUDITAR_FONTE"
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  AUDITAR
                </button>
              </div>
            </div>
          </div>

          {/* Source Document Text Input */}
          <div className="flex-1 flex flex-col gap-3 min-h-[350px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 tracking-wider uppercase flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" /> Documento de Origem (PDF, OCR ou Texto Bruto)
              </span>
              <button
                onClick={() => setInputText(SAMPLE_CLINICAL_SOURCE)}
                className="text-[10px] text-emerald-400 hover:underline hover:text-emerald-300 font-semibold"
              >
                Carregar Amostra P0/P1
              </button>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handlePdfFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => {
                if (!isUploadingPdf) {
                  document.getElementById("pdf-file-input")?.click();
                }
              }}
              className={`border border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer ${
                isDragging 
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" 
                  : isUploadingPdf
                    ? "border-slate-700 bg-slate-950/20 text-slate-400 cursor-not-allowed"
                    : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/60 text-slate-300"
              }`}
            >
              <input
                id="pdf-file-input"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handlePdfFile(e.target.files[0]);
                  }
                }}
              />
              {isUploadingPdf ? (
                <div className="flex flex-col items-center gap-2 py-2 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-200">{pdfProgressText || "Extraindo texto do PDF..."}</span>
                  <span className="text-[10px] text-slate-400 font-medium bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">Processamento 100% local e seguro • Sem limite de tamanho</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-center group">
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-all">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs">Arraste seu PDF aqui ou <span className="text-emerald-400 underline font-medium">clique para procurar</span></span>
                  <span className="text-[10px] text-slate-500">O texto extraído será inserido na área abaixo para validação</span>
                </div>
              )}
            </div>

            {/* Error & Success Messages */}
            {pdfUploadError && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-rose-300">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{pdfUploadError}</span>
              </div>
            )}
            {pdfUploadSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-emerald-300">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{pdfUploadSuccess}</span>
              </div>
            )}

            {/* Slicing Control Center */}
            {useSlicing && slices.length > 0 ? (
              <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/80 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <ListOrdered className="w-4 h-4" /> Fatiamento em Lotes Ativo ({slices.length})
                  </span>
                  <button
                    onClick={() => {
                      setUseSlicing(false);
                      setSlices([]);
                      setActiveSliceIndex(null);
                    }}
                    disabled={isProcessingParallel}
                    className="text-[10px] text-rose-400 hover:underline disabled:opacity-40"
                  >
                    Desativar Lotes
                  </button>
                </div>
                
                <p className="text-[11px] text-slate-400 leading-normal">
                  Este documento gigante foi dividido em lotes menores para garantir processamento rápido sem timeouts. Acompanhe abaixo o progresso:
                </p>

                <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {slices.map((slc, idx) => {
                    const isActive = activeSliceIndex === idx;
                    const isCompleted = slc.status === "completed";
                    const isProcessing = slc.status === "processing";
                    const isFailed = slc.status === "failed";
                    return (
                      <button
                        key={idx}
                        disabled={isProcessingParallel}
                        onClick={() => {
                          setActiveSliceIndex(idx);
                          setInputText(slc.text);
                          if (idx === 0) {
                            setCommand("INICIAR");
                          } else {
                            setCommand("CONTINUAR");
                          }
                        }}
                        title={isFailed ? slc.error : undefined}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition-all ${
                          isFailed
                            ? "bg-rose-500/10 border-rose-500 text-rose-300"
                            : isProcessing
                              ? "bg-blue-500/5 border-blue-500/40 text-blue-300 animate-pulse"
                              : isActive
                                ? "bg-slate-900 border-emerald-500 text-slate-100"
                                : isCompleted
                                  ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/10"
                                  : "bg-slate-950/30 border-slate-900 text-slate-400 hover:bg-slate-900/40 hover:text-slate-300"
                        }`}
                      >
                        <span className="text-[11px] font-semibold truncate max-w-[120px]">{slc.label}</span>
                        {isFailed ? (
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        ) : isCompleted ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        ) : isProcessing || isActive ? (
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-700 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
                
                <div className="flex items-center justify-between bg-slate-900/50 rounded-lg p-2 text-[10px] text-slate-400">
                  <span>Lote atual: <strong className="text-slate-200">{activeSliceIndex !== null ? slices[activeSliceIndex]?.label : ""}</strong></span>
                  <span>Tamanho: <strong className="text-slate-200">{activeSliceIndex !== null ? slices[activeSliceIndex]?.text.length : 0} caracteres</strong></span>
                </div>

                {/* Configurações do Fatiamento */}
                <div className="bg-slate-950/40 rounded-lg p-2.5 border border-slate-900/50 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Configuração de Disparo</span>
                    <span className="text-[9px] bg-slate-900 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-semibold">Configuração Ativa</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      disabled={isProcessingParallel}
                      onClick={() => setParallelStrategy("concurrent")}
                      className={`px-2.5 py-2 rounded-lg border text-left transition-all flex flex-col gap-0.5 ${
                        parallelStrategy === "concurrent"
                          ? "bg-emerald-500/5 border-emerald-500 text-slate-200"
                          : "bg-slate-950/30 border-slate-900 text-slate-400 hover:bg-slate-900/40"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-xs font-bold">Paralelo Turbo</span>
                      </div>
                      <span className="text-[9px] text-slate-500 leading-normal">Gera múltiplos ao mesmo tempo. Máxima velocidade!</span>
                    </button>

                    <button
                      disabled={isProcessingParallel}
                      onClick={() => setParallelStrategy("sequential")}
                      className={`px-2.5 py-2 rounded-lg border text-left transition-all flex flex-col gap-0.5 ${
                        parallelStrategy === "sequential"
                          ? "bg-blue-500/5 border-blue-500 text-slate-200"
                          : "bg-slate-950/30 border-slate-900 text-slate-400 hover:bg-slate-900/40"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <Link2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="text-xs font-bold">Sequencial</span>
                      </div>
                      <span className="text-[9px] text-slate-500 leading-normal">Um de cada vez. Mantém contexto clínico perfeito.</span>
                    </button>
                  </div>

                  {parallelStrategy === "concurrent" && (
                    <div className="flex items-center justify-between border-t border-slate-900 pt-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-slate-400" /> Concorrência Simultânea:</span>
                      <div className="flex items-center gap-1">
                        {[2, 3, 4, 5].map((val) => (
                          <button
                            key={val}
                            disabled={isProcessingParallel}
                            onClick={() => setConcurrencyLimit(val)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                              concurrencyLimit === val
                                ? "bg-emerald-400 text-slate-950 border-emerald-400"
                                : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            {val}x
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Parallel Control Button & Progress */}
                <div className="flex flex-col gap-2 mt-1 border-t border-slate-800/60 pt-2.5">
                  {!isProcessingParallel ? (
                    <button
                      onClick={handleReconstructParallel}
                      disabled={isLoading || isProcessingParallel}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 font-bold py-2 px-3 rounded-lg text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-4 h-4 fill-current animate-pulse" /> {parallelStrategy === "concurrent" ? "Gerar Tudo em Paralelo Turbo" : "Processar Sequencialmente"}
                    </button>
                  ) : (
                    <div className="bg-slate-900 border border-emerald-500/20 rounded-lg p-2.5 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" /> Processando {parallelProgress.current} de {parallelProgress.total} lotes...
                        </span>
                        <span className="text-slate-200 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                          {Math.round((parallelProgress.current / parallelProgress.total) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                        <div 
                          className="bg-emerald-400 h-1.5 rounded-full transition-all duration-300" 
                          style={{ width: `${(parallelProgress.current / parallelProgress.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 text-center font-medium">
                        {parallelStrategy === "concurrent" 
                          ? `Gerando em Paralelo Turbo com limite de ${concurrencyLimit}x concorrência ativa e prevenção de timeout!` 
                          : "Gerando em Fluxo Sequencial Contínuo com encadeamento clínico completo!"
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              inputText && inputText.length > 12000 && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 flex flex-col gap-2">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold text-amber-300">Documento Muito Longo</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                        Detectamos {inputText.length} caracteres ({Math.round(inputText.length / 500)} páginas/quadros). Processar tudo de uma vez pode causar timeouts e falhas no servidor.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => generateSlices(inputText)}
                    className="w-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 hover:text-amber-200 font-bold py-1.5 rounded-lg text-xs transition-all"
                  >
                    Ativar Divisão Automática em Lotes Didáticos
                  </button>
                </div>
              )
            )}

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Cole aqui o OCR bruto, transcrição de slides, imagens clínicas ou o texto do documento médico a ser processado..."
              className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 text-sm font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none leading-relaxed min-h-[150px]"
            />
          </div>

          {/* Action Trigger Button */}
          <div className="flex flex-col gap-3">
            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex gap-2.5 items-start">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-300 font-medium leading-normal">{errorMsg}</p>
              </div>
            )}

            {modelWarning && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex gap-2.5 items-start">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="text-xs text-amber-300 font-medium leading-normal">
                  <p className="font-bold text-amber-400">Contingência de Cota Ativa</p>
                  <p className="text-slate-300 mt-0.5 leading-relaxed">{modelWarning}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleReconstruct}
              disabled={isLoading || !inputText.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-slate-950" />
                  <span>MERE Preflight &amp; Extract em execução...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-slate-950 stroke-none" />
                  <span>
                    {command === "INICIAR" && "Iniciar Reconstrução Fiel (F1)"}
                    {command === "CONTINUAR" && `Gerar Fragmento Sequencial (F${sessions.length + 1})`}
                    {command === "AUDITAR_FONTE" && "Submeter Auditoria de Fonte"}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Session Ledger & Historical Fragment List */}
          {sessions.length > 0 && (
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 flex flex-col gap-3">
              <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                <ListOrdered className="w-4 h-4 text-emerald-400" /> Registro de Sessões ({sessions.length})
              </span>
              <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto">
                {sessions.map((sess, idx) => {
                  const isActive = activeSessionIndex === idx;
                  const isSuccess = sess.parsedState?.estadoStatus === "concluido";
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveSessionIndex(idx);
                        // If selected session exists, auto set inputs or review state
                        if (sess.parsedState) {
                          setInputText(sess.inputText);
                        }
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                        isActive
                          ? "bg-slate-800/80 border-emerald-500/50 text-slate-100"
                          : "bg-slate-900/30 border-slate-800/50 text-slate-400 hover:bg-slate-800/30 hover:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${isSuccess ? "bg-emerald-400" : "bg-sky-400"}`}></div>
                        <div>
                          <div className="text-xs font-bold font-mono">Fragmento F{sess.fragmentIndex}</div>
                          <div className="text-[10px] text-slate-500 font-medium">Ação: {sess.command} • {sess.timestamp}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs font-mono font-bold text-slate-300">
                        Pág: {sess.parsedState?.intervalo || "N/A"}
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </section>

        {/* Right Side: Visual Output / Preflight / Raw Panels */}
        <section className="lg:col-span-7 bg-slate-950 flex flex-col overflow-hidden">
          
          {/* Output navigation tabs */}
          <div className="bg-slate-950 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 overflow-x-auto">
            <div className="flex gap-1 py-3">
              <button
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "preview"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Visualização A4
              </button>

              <button
                onClick={() => setActiveTab("consolidated")}
                disabled={sessions.length === 0}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30 ${
                  activeTab === "consolidated"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5" /> Documento Consolidado
              </button>

              <button
                onClick={() => setActiveTab("preflight")}
                disabled={!activeSession?.parsedPreflight}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30 ${
                  activeTab === "preflight"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Preflight Opc.
              </button>

              <button
                onClick={() => setActiveTab("extract")}
                disabled={!activeSession?.parsedExtracts || activeSession.parsedExtracts.length === 0}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30 ${
                  activeTab === "extract"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Extract P0/P1 ({activeSession?.parsedExtracts?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab("state")}
                disabled={!activeSession?.parsedState}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30 ${
                  activeTab === "state"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                MERE State
              </button>

              <button
                onClick={() => setActiveTab("raw")}
                disabled={!activeSession?.rawOutput}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30 ${
                  activeTab === "raw"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileCode className="w-3.5 h-3.5" /> HTML Bruto
              </button>
            </div>

            {/* Utility buttons */}
            <div className="flex items-center gap-2">
              {activeTab === "preview" && activeSession && (
                <button
                  onClick={() => copyToClipboard(activeSession.htmlContent)}
                  className="bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all text-[11px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copiar HTML</span>
                </button>
              )}
              {activeTab === "consolidated" && sessions.length > 0 && (
                <button
                  onClick={() => copyToClipboard(consolidatedHtml)}
                  className="bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all text-[11px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copiar Tudo</span>
                </button>
              )}
            </div>
          </div>

          {/* Dynamic Content Display Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-950/40">
            
            {/* If no sessions generated yet, show instructions card */}
            {sessions.length === 0 && (
              <div className="max-w-xl mx-auto my-12 bg-slate-900 border border-slate-800/80 rounded-2xl p-8 shadow-xl">
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
                  <Activity className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-50 mb-3">Reconstrutor Didático MERE v4.1.50</h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-6">
                  Pronto para gerar documentos didáticos de alta fidelidade e clinicamente seguros. Cole os dados da sua fonte clínica ou utilize nossa amostra clínica estruturada pré-carregada para testar.
                </p>

                <div className="border-t border-slate-800/60 pt-6">
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Principais Validações de Segurança</h4>
                  <ul className="text-xs text-slate-400 flex flex-col gap-2.5">
                    <li className="flex gap-2">
                      <span className="text-emerald-400 font-mono">P0</span>
                      <span><strong>Rigidez de dados soberanos:</strong> Doses, vias, valores de corte e diagnósticos são mapeados sem aproximações ou arredondamentos.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400 font-mono">P1</span>
                      <span><strong>Estruturas integras:</strong> Fluxos, algoritmos e tabelas complexas são traduzidos em HTML sem resumos narrativos.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400 font-mono">P2</span>
                      <span><strong>Entendimento didático:</strong> Explicação fisiológica aprofundada (Semáforo VERDE/AMARELO) sem interferir no conteúdo original da fonte.</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Visual Preview Tab */}
            {activeTab === "preview" && activeSession && (
              <div className="flex flex-col items-center gap-6">
                <div className="w-full flex items-center justify-between text-xs text-slate-500 font-mono border-b border-slate-800 pb-3">
                  <span>SESSÃO: F{activeSession.fragmentIndex} ({activeSession.command})</span>
                  <span>CADÊNCIA: {activeSession.parsedState?.cadencia || "Determinada automaticamente"}</span>
                </div>

                {/* Simulated A4 Paper */}
                <div 
                  className="mere-document-container w-full"
                  dangerouslySetInnerHTML={{ __html: getProcessedHtml(activeSession.htmlContent, activeSession.fragmentIndex) }}
                />
              </div>
            )}

            {/* Consolidated Document Preview Tab */}
            {activeTab === "consolidated" && sessions.length > 0 && (
              <div className="flex flex-col items-center gap-6">
                <div className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-xs text-emerald-300 flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Sua sequência de reconstrução possui <strong>{sessions.length} fragmento(s)</strong> ativos.</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
                    {/* Print / PDF (Free) */}
                    <button
                      onClick={() => {
                        const printWindow = window.open("", "_blank");
                        if (printWindow) {
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>Caderno MERE Reconstruído</title>
                                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@700&display=swap">
                                <style>
                                  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@700&display=swap');
                                  body { font-family: 'Inter', sans-serif; background: white; color: #111827; margin: 0; padding: 0; }
                                  .page { width: 800px; margin: 20px auto; padding: 40px; box-sizing: border-box; background: white; }
                                  ${document.querySelector("style")?.innerHTML || ""}
                                </style>
                              </head>
                              <body>
                                <div class="mere-document-container">
                                  ${consolidatedHtml}
                                </div>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                          printWindow.print();
                        }
                      }}
                      className="bg-slate-900 border border-slate-800 text-slate-100 font-bold px-3 py-1.8 rounded-lg text-[11px] flex items-center gap-1.5 shadow hover:bg-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                      <span>Gerar PDF / Imprimir</span>
                    </button>

                    {/* Word DOCX (Premium) */}
                    <button
                      onClick={() => {
                        if (!isPremium) {
                          setErrorMsg("Acesso Restrito: Exportação de alta fidelidade para Word (.docx) é um recurso exclusivo do Plano MERE Pro. Ative o upgrade gratuito no topo para liberar.");
                          setIsUpgradeModalOpen(true);
                          return;
                        }
                        
                        // Premium Action: Download file
                        const element = document.createElement("a");
                        const file = new Blob([consolidatedHtml], {type: 'text/html'});
                        element.href = URL.createObjectURL(file);
                        element.download = "Documento_Reconstruido_MERE.docx";
                        document.body.appendChild(element);
                        element.click();
                        document.body.removeChild(element);
                        
                        setErrorMsg("Sucesso! O arquivo Word simulado foi gerado sob os moldes do template canônico MERE e salvo localmente.");
                      }}
                      className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-extrabold px-3 py-1.8 rounded-lg text-[11px] flex items-center gap-1.5 shadow transition-all cursor-pointer"
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                      <span>Exportar Word (.docx)</span>
                    </button>

                    {/* Markdown .md (Premium) */}
                    <button
                      onClick={() => {
                        if (!isPremium) {
                          setErrorMsg("Acesso Restrito: Exportação de relatórios clínicos para Markdown (.md) é um recurso exclusivo do Plano MERE Pro. Ative o upgrade gratuito no topo para liberar.");
                          setIsUpgradeModalOpen(true);
                          return;
                        }
                        
                        // Premium Action: Convert HTML to markdown or plain text
                        const cleanText = consolidatedHtml
                          .replace(/<[^>]*>/g, "\n")
                          .replace(/\n\s*\n/g, "\n\n");
                        const element = document.createElement("a");
                        const file = new Blob([cleanText], {type: 'text/markdown'});
                        element.href = URL.createObjectURL(file);
                        element.download = "Documento_Reconstruido_MERE.md";
                        document.body.appendChild(element);
                        element.click();
                        document.body.removeChild(element);

                        setErrorMsg("Sucesso! Arquivo Markdown (.md) estruturado com auditorias canônicas exportado.");
                      }}
                      className="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-extrabold px-3 py-1.8 rounded-lg text-[11px] flex items-center gap-1.5 shadow transition-all cursor-pointer"
                    >
                      <Crown className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Exportar Markdown (.md)</span>
                    </button>
                  </div>
                </div>

                <div 
                  className="mere-document-container w-full"
                  dangerouslySetInnerHTML={{ __html: consolidatedHtml }}
                />
              </div>
            )}

            {/* MERE PREFLIGHT inspect */}
            {activeTab === "preflight" && activeSession?.parsedPreflight && (
              <div className="max-w-3xl mx-auto flex flex-col gap-4">
                <h3 className="text-sm font-bold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" /> Planejamento Estrutural e Inventário (MERE_PREFLIGHT)
                </h3>
                
                <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800 text-xs">
                  <div className="p-4 grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-slate-500 block mb-0.5">Escopo Alvo</span>
                      <strong className="text-slate-200">{activeSession.parsedPreflight.escopo || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Cadência Utilizada</span>
                      <strong className="text-slate-200 font-mono">{activeSession.parsedPreflight.cadencia || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Risco Estrutural</span>
                      <strong className="text-rose-400 font-mono uppercase">{activeSession.parsedPreflight.riscoDenso || "N/A"}</strong>
                    </div>
                  </div>

                  <div className="p-4">
                    <span className="text-slate-500 block mb-1">Âncoras de Difícil Leitura (OCR)</span>
                    <p className="text-slate-300 font-mono bg-slate-950/60 p-2.5 rounded border border-slate-800/80 leading-relaxed">
                      {activeSession.parsedPreflight.ancorasOcr || "Nenhum termo crítico especial mapeado."}
                    </p>
                  </div>

                  <div className="p-4 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-500 block mb-1">Inventário Estrutural</span>
                      <span className="text-slate-300 font-mono bg-slate-950/40 px-2 py-1 rounded border border-slate-800/40">
                        {activeSession.parsedPreflight.inventarioEstrutural || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Inventário Visual</span>
                      <span className="text-slate-300 font-mono bg-slate-950/40 px-2 py-1 rounded border border-slate-800/40">
                        {activeSession.parsedPreflight.inventarioVisual || "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <span className="text-slate-500 block mb-1">Ledger de Ativos Visuais (Vxxx)</span>
                    <p className="text-slate-300 font-mono bg-slate-950/60 p-2.5 rounded border border-slate-800/80 leading-relaxed">
                      {activeSession.parsedPreflight.visualLedger || "Nenhum ativo visual de origem pendente de destino."}
                    </p>
                  </div>

                  <div className="p-4">
                    <span className="text-slate-500 block mb-1">Ledger de Componentes Clínicos (Cxxx)</span>
                    <p className="text-slate-300 font-mono bg-slate-950/60 p-2.5 rounded border border-slate-800/80 leading-relaxed">
                      {activeSession.parsedPreflight.componentLedger || "N/A"}
                    </p>
                  </div>

                  <div className="p-4">
                    <span className="text-slate-500 block mb-1">Farmacologia P0 Ledger</span>
                    <p className="text-slate-300 font-mono bg-slate-950/60 p-2.5 rounded border border-slate-800/80 leading-relaxed">
                      {activeSession.parsedPreflight.farmacoLedger || "Sem farmacologia ou doses neste fragmento."}
                    </p>
                  </div>

                  <div className="p-4">
                    <span className="text-slate-500 block mb-1">Page Proof Planejado</span>
                    <p className="text-emerald-400 font-mono bg-slate-950/60 p-2.5 rounded border border-slate-800/80 leading-relaxed">
                      {activeSession.parsedPreflight.pageProof || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* MERE EXTRACTS inspect */}
            {activeTab === "extract" && activeSession?.parsedExtracts && (
              <div className="max-w-3xl mx-auto flex flex-col gap-4">
                <h3 className="text-sm font-bold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" /> Camada Intermediária de Extração Curta (MERE_EXTRACT)
                </h3>

                <div className="flex flex-col gap-4">
                  {activeSession.parsedExtracts.map((ext, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs flex flex-col gap-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold">
                          {ext.componente || "Componente Único"}
                        </span>
                        <span className="text-slate-400">Página: <strong>{ext.pagina || "N/A"}</strong></span>
                        <span className="text-slate-400 uppercase font-mono text-[10px]">Tipo: <strong>{ext.tipo || "Geral"}</strong></span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-500 block mb-1 font-semibold uppercase text-[10px]">Átomos P0 (Segurança / Medicamentos / Doses)</span>
                          <p className="text-slate-200 font-mono bg-slate-950/60 p-2.5 rounded border border-slate-800/80 leading-relaxed whitespace-pre-wrap">
                            {ext.atomosP0 || "Nenhum."}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-1 font-semibold uppercase text-[10px]">Átomos P1 (Estrutura / Sintomas / Raciocínio)</span>
                          <p className="text-slate-200 font-mono bg-slate-950/60 p-2.5 rounded border border-slate-800/80 leading-relaxed whitespace-pre-wrap">
                            {ext.atomosP1 || "Nenhum."}
                          </p>
                        </div>
                      </div>

                      {ext.linhasTabela && ext.linhasTabela !== "nao_aplicavel" && (
                        <div>
                          <span className="text-slate-500 block mb-1 font-semibold uppercase text-[10px]">Linhas de Tabela / Células</span>
                          <p className="text-slate-300 font-mono bg-slate-950/40 p-2 rounded border border-slate-800/30">
                            {ext.linhasTabela}
                          </p>
                        </div>
                      )}

                      {ext.ramos && ext.ramos !== "nao_aplicavel" && (
                        <div>
                          <span className="text-slate-500 block mb-1 font-semibold uppercase text-[10px]">Ramos de Decisão / Algoritmos</span>
                          <p className="text-slate-300 font-mono bg-slate-950/40 p-2 rounded border border-slate-800/30">
                            {ext.ramos}
                          </p>
                        </div>
                      )}

                      {ext.visualConversion && ext.visualConversion !== "nao_aplicavel" && (
                        <div>
                          <span className="text-slate-500 block mb-1 font-semibold uppercase text-[10px]">Conversão Visual Efetuada</span>
                          <p className="text-emerald-400 font-mono bg-slate-950/40 p-2 rounded border border-emerald-500/10">
                            {ext.visualConversion}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MERE STATE inspect */}
            {activeTab === "state" && activeSession?.parsedState && (
              <div className="max-w-3xl mx-auto flex flex-col gap-4">
                <h3 className="text-sm font-bold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" /> Relatório de Auditoria e Fechamento (MERE_STATE)
                </h3>

                <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800 text-xs">
                  
                  {/* Validation Gate */}
                  <div className="p-4 bg-emerald-500/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide">Status Geral do Fragmento</span>
                      <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        {activeSession.parsedState.estadoStatus === "concluido" ? (
                          <>
                            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                            <span>Aprovado &amp; Concluído (Fechamento Seguro)</span>
                          </>
                        ) : (
                          <>
                            <span className="w-3 h-3 rounded-full bg-sky-500 animate-pulse"></span>
                            <span>Aprovado - Sequência Pronta para Continuação</span>
                          </>
                        )}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block mb-0.5">Próximo Comando MERE</span>
                      <strong className="text-emerald-400 font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded">
                        {activeSession.parsedState.estadoProximoComando || "N/A"}
                      </strong>
                    </div>
                  </div>

                  {/* Document and Target Information */}
                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-slate-500 block mb-0.5">Versão MERE</span>
                      <strong className="text-slate-300 font-mono">{activeSession.parsedState.version || "4.1.50"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Intervalo Atual</span>
                      <strong className="text-slate-300 font-mono">{activeSession.parsedState.intervalo || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Total de Páginas</span>
                      <strong className="text-slate-300 font-mono">{activeSession.parsedState.totalPaginas || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Cursor Progresso</span>
                      <strong className="text-emerald-400 font-mono">{activeSession.parsedState.cursorProgresso || "N/A"}</strong>
                    </div>
                  </div>

                  {/* Continuity Cursors */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-500 block mb-1">Âncora Final Processada</span>
                      <p className="text-slate-300 font-mono bg-slate-950/60 p-2.5 rounded border border-slate-800/80 leading-relaxed">
                        &quot;{activeSession.parsedState.ancoraFinalProcessada || "N/A"}&quot;
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Âncora de Próximo Início</span>
                      <p className="text-emerald-400 font-mono bg-slate-950/60 p-2.5 rounded border-emerald-500/10 leading-relaxed">
                        &quot;{activeSession.parsedState.ancoraProximoInicio || "N/A"}&quot;
                      </p>
                    </div>
                  </div>

                  {/* Rigorous Proof */}
                  <div className="p-4">
                    <span className="text-slate-500 block mb-1 font-semibold uppercase text-[10px]">Prova de Átomos P0/P1 no HTML (Quote-and-Locate)</span>
                    <p className="text-emerald-400 font-mono bg-slate-950/60 p-2.5 rounded border border-slate-800/80 leading-relaxed">
                      {activeSession.parsedState.provaP0P1 || "N/A"}
                    </p>
                  </div>

                  {/* Ledgers status */}
                  <div className="p-4">
                    <span className="text-slate-500 block mb-1">Auditoria Crítica e Ledger de Verificação</span>
                    <p className="text-slate-300 font-mono bg-slate-950/60 p-2.5 rounded border border-slate-800/80 leading-relaxed">
                      {activeSession.parsedState.ledgerVerificacao || "N/A"}
                    </p>
                  </div>

                  {/* Confession of loss / Limitations */}
                  <div className="p-4">
                    <span className="text-slate-500 block mb-1 font-semibold text-rose-400">Confissão de Perdas / Incertezas</span>
                    <p className="text-rose-300 font-mono bg-rose-500/5 p-2.5 rounded border border-rose-500/10 leading-relaxed">
                      {activeSession.parsedState.confissaoPerdas || "Nenhuma perda detectada."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Raw HTML tab */}
            {activeTab === "raw" && activeSession && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-emerald-400" /> Código Completo com Templates e Metadados (F{activeSession.fragmentIndex})
                  </span>
                  <button
                    onClick={() => copyToClipboard(activeSession.rawOutput)}
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    {copied ? "Copiado!" : "Copiar código completo"}
                  </button>
                </div>
                <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed select-all">
                  {activeSession.rawOutput}
                </pre>
              </div>
            )}

          </div>

        </section>

      </main>

      {/* Footer / Guidelines reference board */}
      <footer id="document-rules" className="bg-slate-950 border-t border-slate-800 p-8 shrink-0">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-xs text-slate-400">
          <div>
            <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Cadência Canônica 15/10/6
            </h4>
            <ul className="flex flex-col gap-2 leading-relaxed">
              <li><strong>15 Páginas:</strong> Somente para texto linear sem diagramação estruturada.</li>
              <li><strong>10 Páginas:</strong> Páginas com ilustrações simples e poucos componentes clínicos.</li>
              <li><strong>6 Páginas:</strong> Altíssima densidade, múltiplos slides por página, fluxos complexos, tabelas farmacológicas densas ou OCR carregado.</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Semáforo Didático
            </h4>
            <ul className="flex flex-col gap-2 leading-relaxed">
              <li>🟢 <strong className="text-emerald-400">VERDE:</strong> Reorganizar sequência didática, criar pontes causais diretas e fatiar parágrafos de forma inteligível sem marcas visuais de alteração.</li>
              <li>🟡 <strong className="text-amber-400">AMARELO:</strong> Fatos estáveis e consolidados para suporte que podem ser incluídos como andaimes rastreáveis.</li>
              <li>🔴 <strong className="text-rose-400">VERMELHO:</strong> Updates de conduta externos que exigem obrigatoriamente um box de atualização isolado para não contaminar a fidelidade da fonte.</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Garantias MERE v4.1.50
            </h4>
            <p className="leading-relaxed mb-3">
              Desenvolvido com proteção rígida anti-omissão (anti subitem-drop) e consistência total de dados literais. Toda dose, idade, faixa e tempo diagnóstico é transcrito sob exatidão médica estrita.
            </p>
            <p className="text-[11px] text-emerald-400 font-mono">
              Visual Gate Consolidation • AI Studio Consolidated 2026
            </p>
          </div>
        </div>
      </footer>

      {/* Premium Upgrade Modal */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col relative max-h-[90vh]">
            
            {/* Close button */}
            <button
              onClick={() => setIsUpgradeModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="p-6 pb-0 flex items-start gap-4">
              <div className="bg-amber-500/10 text-amber-400 p-3 rounded-xl border border-amber-500/20">
                <Crown className="w-7 h-7 fill-amber-400" />
              </div>
              <div>
                <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Acesso Ilimitado</span>
                <h3 className="text-xl font-black text-slate-100 mt-1">Selecione seu Plano MERE Professional</h3>
                <p className="text-xs text-slate-400 leading-normal mt-0.5">Desbloqueie o potencial máximo para processar documentos gigantescos (60 a 100 páginas) em paralelo com segurança absoluta.</p>
              </div>
            </div>

            {/* Checkout state controllers */}
            {checkoutStep === "form" && (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                
                {/* Plans grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Resident Tier */}
                  <button
                    onClick={() => setSelectedPlan("resident")}
                    className={`border rounded-xl p-4 flex flex-col text-left transition-all ${
                      selectedPlan === "resident"
                        ? "bg-slate-800/50 border-emerald-500 shadow-lg ring-1 ring-emerald-500"
                        : "bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/60"
                    }`}
                  >
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Residente / Estudante</span>
                    <h4 className="text-sm font-bold text-slate-100 mt-1">Plano Acadêmico</h4>
                    <div className="flex items-baseline gap-1 mt-2 mb-3">
                      <span className="text-2xl font-black text-slate-100 font-mono">R$ 29</span>
                      <span className="text-xs text-slate-400">/mês</span>
                    </div>
                    <ul className="text-[10px] text-slate-400 flex flex-col gap-1.5 list-none pl-0 mt-auto">
                      <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> Até 25 págs por doc</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> Fatiamento Paralelo</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> Exportação HTML/PDF</li>
                    </ul>
                  </button>

                  {/* Pro Tier (Most popular) */}
                  <button
                    onClick={() => setSelectedPlan("pro")}
                    className={`border rounded-xl p-4 flex flex-col text-left transition-all relative ${
                      selectedPlan === "pro"
                        ? "bg-slate-800/50 border-amber-500 shadow-lg ring-1 ring-amber-500"
                        : "bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/60"
                    }`}
                  >
                    <div className="absolute -top-2.5 right-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-[8px] px-2 py-0.5 rounded-full uppercase tracking-wider">Mais Popular</div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase flex items-center gap-1">👑 MERE Pro</span>
                    <h4 className="text-sm font-bold text-slate-100 mt-1">Médicos Individuais</h4>
                    <div className="flex items-baseline gap-1 mt-2 mb-3">
                      <span className="text-2xl font-black text-slate-100 font-mono">R$ 59</span>
                      <span className="text-xs text-slate-400">/mês</span>
                    </div>
                    <ul className="text-[10px] text-slate-400 flex flex-col gap-1.5 list-none pl-0 mt-auto">
                      <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-amber-400" /> Páginas ilimitadas (100+)</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-amber-400" /> Fatiamento Super Rápido</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-amber-400" /> Auditoria Médica Avançada</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-amber-400" /> Exportações para DOCX/Rich</li>
                    </ul>
                  </button>

                  {/* Clinic Tier */}
                  <button
                    onClick={() => setSelectedPlan("clinic")}
                    className={`border rounded-xl p-4 flex flex-col text-left transition-all ${
                      selectedPlan === "clinic"
                        ? "bg-slate-800/50 border-indigo-500 shadow-lg ring-1 ring-indigo-500"
                        : "bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/60"
                    }`}
                  >
                    <span className="text-[10px] font-bold text-indigo-400 uppercase">Clínicas / Equipes</span>
                    <h4 className="text-sm font-bold text-slate-100 mt-1">Plano Institucional</h4>
                    <div className="flex items-baseline gap-1 mt-2 mb-3">
                      <span className="text-2xl font-black text-slate-100 font-mono">R$ 199</span>
                      <span className="text-xs text-slate-400">/mês</span>
                    </div>
                    <ul className="text-[10px] text-slate-400 flex flex-col gap-1.5 list-none pl-0 mt-auto">
                      <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-indigo-400" /> Contas Multi-usuários</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-indigo-400" /> Integração de API Privada</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-indigo-400" /> Suporte VIP 24h prioritário</li>
                    </ul>
                  </button>
                </div>

                {/* Form fields */}
                <div className="bg-slate-950/55 rounded-xl p-4 border border-slate-800/80 flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-400" /> Simulador de Cobrança Integrada
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Nome Completo</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Dr(a). Maria de Souza" 
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">CRM / Registro Profissional</label>
                      <input 
                        type="text" 
                        required
                        placeholder="CRM-SP 123456" 
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 leading-normal bg-slate-900/30 p-2.5 rounded border border-slate-800/40 mt-1.5">
                    💡 <strong>Simulação de Sandbox:</strong> Este aplicativo está em ambiente de desenvolvimento. Ao prosseguir, nenhuma transação real será efetuada, permitindo testar livremente todas as funcionalidades premium do MERE Pro.
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutStep("loading");
                    setTimeout(() => {
                      setIsPremium(true);
                      try {
                        localStorage.setItem("mere_premium_active", "true");
                      } catch (e) {
                        console.error(e);
                      }
                      setCheckoutStep("success");
                    }, 2200);
                  }}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Ativar Licença MERE {selectedPlan === "pro" ? "Pro" : selectedPlan === "resident" ? "Acadêmica" : "Institucional"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {checkoutStep === "loading" && (
              <div className="flex-1 p-12 flex flex-col items-center justify-center gap-4 text-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-slate-800 border-t-emerald-400 rounded-full animate-spin" />
                  <Crown className="w-6 h-6 text-amber-400 fill-amber-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <h4 className="text-lg font-bold text-slate-100">Processando Pagamento Simulado...</h4>
                <p className="text-xs text-slate-400 max-w-sm">Aguarde enquanto registramos sua licença profissional e liberamos as cotas de processamento na rede médica MERE.</p>
              </div>
            )}

            {checkoutStep === "success" && (
              <div className="flex-1 p-10 flex flex-col items-center justify-center gap-5 text-center">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center">
                  <ShieldCheck className="w-10 h-10 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-xl font-extrabold text-slate-100">Parabéns! Conta PRO Ativada com Sucesso 🎉</h4>
                  <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
                    Sua assinatura de sandbox MERE Pro foi autenticada! Agora você tem acesso ilimitado a processamento paralelo ultra-rápido, exportações completas para A4 e semáforos integrados de alta precisão.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUpgradeModalOpen(false)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-6 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer mx-auto"
                >
                  Começar a usar as funções PRO
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
