
import React, { useState, useCallback, useRef, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { GoogleGenAI } from "@google/genai";
import type { FileState, XmlResult, ParsedDocument, ProcessingLog } from './types';
import { FileUpload } from './components/FileUpload';
import { ProcessingView } from './components/ProcessingView';
import { PreviewPane } from './components/PreviewPane';
import { convertJsonToXml } from './services/xmlGenerator';
import { geminiSchema } from './services/geminiSchema';

// Worker Legacy para máxima estabilidad
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://aistudiocdn.com/pdfjs-dist@5.4.296/legacy/build/pdf.worker.min.js`;

const BASE_COOLDOWN = 8000; 
const RATE_LIMIT_HIBERNATION = 30000;
const MAX_ATTEMPTS = 3;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function App() {
  const [fileState, setFileState] = useState<FileState>({ file: null, base64: null, name: '' });
  const [processingState, setProcessingState] = useState({ active: false, message: '', progress: 0 });
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [xmlResult, setXmlResult] = useState<XmlResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const filePreviewUrl = useRef<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const aiClient = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY }), []);

  const addLog = (message: string, type: ProcessingLog['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => {
      const newLogs = [...prev, { id: Math.random().toString(36).substr(2, 9), timestamp, message, type }];
      return newLogs.slice(-100); 
    });
  };

  const handleFileChange = useCallback((file: File) => {
    if (filePreviewUrl.current) URL.revokeObjectURL(filePreviewUrl.current);
    filePreviewUrl.current = URL.createObjectURL(file);
    setFileState({ file, base64: null, name: file.name });
    setXmlResult(null);
    setError(null);
    setLogs([]);
    addLog(`Sistema listo. Archivo cargado: ${file.name}`, 'info');
  }, []);

  const aggressiveJsonRepair = (text: string): string => {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return text;
    let cleaned = match[0];
    cleaned = cleaned
      .replace(/,\s*([}\]])/g, '$1') 
      .replace(/}\s*{/g, '},{'); 
    const openBraces = (cleaned.match(/\{/g) || []).length;
    const closeBraces = (cleaned.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      cleaned += '}'.repeat(openBraces - closeBraces);
    }
    return cleaned;
  };

  const processPageWithVisualCues = async (imagePart: any, pageNum: number, attempt: number = 0): Promise<ParsedDocument> => {
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
    - If text is Bold or Italic, mark it in the 'parts' array properties.
    `;

    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { 
          parts: [
            { inlineData: imagePart }, 
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
      if (!text) throw new Error("EMPTY_RESPONSE");

      const repaired = aggressiveJsonRepair(text);
      return JSON.parse(repaired) as ParsedDocument;

    } catch (e: any) {
      if (e.message?.includes('429') || e.status === 429) throw new Error("QUOTA_EXCEEDED");
      throw e;
    }
  };

  const executePipeline = useCallback(async () => {
    if (!fileState.file) return;
    setProcessingState({ active: true, message: 'Iniciando escaneo cromático...', progress: 1 });
    setError(null);
    setLogs([]);
    addLog('Motor de Visión Cromática Activado (Rojo/Verde/Magenta).', 'info');

    try {
      const allPages: ParsedDocument[] = [];
      let total = 1;

      if (fileState.file.type === 'application/pdf') {
        const loadingTask = pdfjsLib.getDocument(filePreviewUrl.current!);
        const pdf = await loadingTask.promise;
        total = pdf.numPages;

        if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        for (let i = 1; i <= total; i++) {
          const currentProgress = Math.round(((i - 1) / total) * 90) + 5;
          setProcessingState({ active: true, message: `Analizando P${i}/${total} (Tablas y Colores)...`, progress: currentProgress });
          
          const page = await pdf.getPage(i);
          let attempts = 0;
          let success = false;
          
          while (attempts < MAX_ATTEMPTS && !success) {
            try {
              const scale = 2.0; 
              const viewport = page.getViewport({ scale });
              canvas.height = viewport.height;
              canvas.width = viewport.width;

              if (ctx) {
                await page.render({ canvasContext: ctx, viewport }).promise;
                const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
                
                addLog(`Procesando P${i} [Intento ${attempts + 1}]...`, 'ai');
                const pageResult = await processPageWithVisualCues({ data: base64, mimeType: 'image/jpeg' }, i, attempts);
                
                if (pageResult && pageResult.content) {
                    allPages.push(pageResult);
                    success = true;
                } else {
                    throw new Error("INVALID_JSON_STRUCTURE");
                }
              }
            } catch (err: any) {
              attempts++;
              const isQuota = err.message === "QUOTA_EXCEEDED";
              
              if (isQuota) {
                addLog(`Límite de API. Pausa de seguridad (${RATE_LIMIT_HIBERNATION/1000}s)...`, 'warning');
                await sleep(RATE_LIMIT_HIBERNATION);
              } else {
                addLog(`Fallo en P${i}: ${err.message}. Reintentando...`, 'error');
                await sleep(3000 * attempts);
              }

              if (attempts >= MAX_ATTEMPTS) {
                addLog(`Saltando P${i} por fallos reiterados.`, 'error');
                allPages.push({
                   metadata: allPages[0]?.metadata || {} as any,
                   content: [{ type: 'paragraph', parts: [{ text: `[ERROR: P${i} no procesada]` }] }]
                });
                success = true;
              }
            }
          }
          
          (page as any).cleanup?.();
          if (i < total) await sleep(BASE_COOLDOWN);
        }
        await pdf.destroy();
      }

      setProcessingState({ active: true, message: 'Generando XML Estructurado...', progress: 98 });
      
      const finalData: ParsedDocument = {
        metadata: allPages[0]?.metadata || { publicationDate: "", documentType: "", publicationSource: "", issuingOrganism: "", documentTitle: "", thematicArea: "" },
        content: allPages.flatMap(p => p.content)
      };

      const xml = convertJsonToXml(finalData, fileState.name);
      setXmlResult(xml);
      setProcessingState({ active: false, message: '', progress: 100 });
      addLog('Conversión completada exitosamente.', 'ai');

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error desconocido en el pipeline");
      addLog(e.message, 'error');
      setProcessingState({ active: false, message: '', progress: 0 });
    }
  }, [fileState, aiClient]);

  const reset = () => {
    setFileState({ file: null, base64: null, name: '' });
    setProcessingState({ active: false, message: '', progress: 0 });
    setXmlResult(null);
    setError(null);
    setLogs([]);
    if (filePreviewUrl.current) URL.revokeObjectURL(filePreviewUrl.current);
    filePreviewUrl.current = null;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#020617] text-slate-100 font-sans selection:bg-emerald-500/30">
      <header className="p-6 bg-slate-900/60 backdrop-blur-3xl border-b border-slate-800 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-5">
          <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase italic leading-none">Legal<span className="text-emerald-500">Vision</span></h1>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.4em] mt-1">Color-Coded Structural Engine v2.1</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
           <div className="flex items-center space-x-2 px-3 py-1 bg-slate-800/50 rounded-full border border-slate-700/50">
              <span className="w-2 h-2 rounded-full bg-red-500"></span><span className="text-[9px] text-slate-400 font-bold">PRE</span>
              <span className="w-2 h-2 rounded-full bg-green-500 ml-2"></span><span className="text-[9px] text-slate-400 font-bold">SUP</span>
              <span className="w-2 h-2 rounded-full bg-fuchsia-500 ml-2"></span><span className="text-[9px] text-slate-400 font-bold">ART</span>
           </div>
           <button onClick={reset} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-[10px] font-black tracking-widest transition-all border border-slate-700 hover:border-emerald-500/30 active:scale-95">NEW PROCESS</button>
        </div>
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 max-w-[1920px] mx-auto w-full">
        <div className="lg:col-span-4 flex flex-col space-y-8">
          <section className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 p-10 shadow-3xl backdrop-blur-xl relative overflow-hidden group">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-10">Document Source</h2>
            <FileUpload onFileChange={handleFileChange} disabled={processingState.active} />
            
            {fileState.file && !processingState.active && (
              <button 
                onClick={executePipeline}
                className="mt-10 w-full bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white font-black py-6 rounded-[2rem] transition-all shadow-[0_10px_30px_-10px_rgba(16,185,129,0.3)] flex items-center justify-center space-x-4 group active:translate-y-1 ring-1 ring-emerald-500/20"
              >
                <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/></svg>
                <span className="uppercase tracking-[0.2em] text-sm">Ejecutar Análisis Estructural</span>
              </button>
            )}

            {error && (
              <div className="mt-10 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl animate-fade-in">
                <div className="flex items-center space-x-2 text-red-400 mb-2">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   <span className="font-bold text-xs uppercase tracking-widest">Error del Sistema</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">{error}</p>
              </div>
            )}
          </section>

          <section className="flex-grow bg-slate-900/30 rounded-[2.5rem] border border-slate-800 overflow-hidden min-h-[400px] relative group shadow-inner">
            {fileState.file ? (
              <iframe src={filePreviewUrl.current!} className="w-full h-full opacity-50 grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-700 relative z-10" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-700 p-10 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700">
                   <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">Vista Previa Inactiva</p>
              </div>
            )}
          </section>
        </div>

        <div className="lg:col-span-8 bg-slate-900/40 rounded-[3rem] border border-slate-800 shadow-4xl overflow-hidden flex flex-col relative min-h-[700px]">
          {processingState.active ? (
            <ProcessingView message={processingState.message} progress={processingState.progress} logs={logs} />
          ) : xmlResult ? (
            <PreviewPane xmlResult={xmlResult} />
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-24">
              <div className="w-32 h-32 mb-12 bg-gradient-to-tr from-slate-800 to-slate-900 rounded-[2.5rem] flex items-center justify-center border border-slate-700 shadow-2xl relative group">
                <div className="absolute inset-0 bg-emerald-500/10 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                <svg className="w-16 h-16 text-slate-600 group-hover:text-emerald-500/80 transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
              </div>
              <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic">Neural Core Idle</h3>
              <p className="text-slate-500 text-sm mt-6 max-w-md font-medium leading-relaxed opacity-60">
                Sube un documento con marcado cromático (PDF/Imagen). El motor de IA identificará las unidades estructurales basándose en el código de color: Rojo (PRE), Verde (SUP) y Magenta (ART).
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
