export interface MerePreflight {
  escopo: string;
  cadencia: string;
  riscos: string;
  ancorasOcr: string;
  inventarioEstrutural: string;
  inventarioVisual: string;
  inventarioVisualBruto: string;
  inventarioIncerto: boolean;
  visualLedger: string;
  componentLedger: string;
  subitemLedger: string;
  farmacoLedger: string;
  evidenciasExcecoes: string;
  pageProof: string;
  riscoDenso: string;
  updateOportunidades: string;
  pontoParada: string;
}

export interface MereExtract {
  pagina: string;
  componente: string;
  tipo: string;
  atomosP0: string;
  atomosP1: string;
  linhasTabela: string;
  bullets: string;
  ramos: string;
  microtexto: string;
  visualConversion: string;
  pendencias: string;
}

export interface MereState {
  version: string;
  profile: string;
  statusDoc: string;
  route: string;
  densidade: string;
  perfil: string;
  totalPaginas: string;
  cadencia: string;
  intervalo: string;
  motivoRota: string;
  cursorFragmento: string;
  cursorProgresso: string;
  cursorIntervalo: string;
  cursorUltimaPagina: string;
  ancoraFinalProcessada: string;
  ancoraProximoInicio: string;
  proximoInicioPrevisto: string;
  contextoClinico: string;
  fragmentosAnteriores: string;
  auditoriaStatus: string;
  auditoriaMetodo: string;
  provaP0P1: string;
  ledgerVerificacao: string;
  pageProofAudit: string;
  extractDiff: string;
  inventarioVisualAudit: string;
  visualConversionAudit: string;
  suspeitasOmissao: string;
  indiceAulasAudit: string;
  confissaoPerdas: string;
  updateStatus: string;
  updatesVisiveis: string;
  updateFontes: string;
  updateSeparacao: string;
  updateContaminacao: string;
  estadoStatus: string;
  estadoProximoComando: string;
  estadoPodeAvancar: boolean;
  estadoFechamentoPermitido: boolean;
  estadoMotivoReducao: string;
  estadoFlagOmissaoCritica: string;
}

export interface FragmentSession {
  fragmentIndex: number;
  command: string;
  timestamp: string;
  inputText: string;
  rawOutput: string;
  htmlContent: string;
  parsedPreflight: MerePreflight | null;
  parsedExtracts: MereExtract[];
  parsedState: MereState | null;
}
