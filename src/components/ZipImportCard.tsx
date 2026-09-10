import React, { useEffect, useRef, useState } from 'react';
import { Archive, CheckCircle2, FileArchive, Loader2, ShieldCheck, Upload } from 'lucide-react';
import type { InstagramZipImportResult } from '../instagramZip';
import { importInstagramZipInWorker } from '../processingClient';

interface ZipImportCardProps {
  onImported: (result: InstagramZipImportResult, fileName: string) => void;
  onError: (message: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

export function ZipImportCard({ onImported, onError }: ZipImportCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const operationRef = useRef(0);
  const mountedRef = useRef(true);
  const jobRef = useRef<{ cancel: () => void } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastImport, setLastImport] = useState<{
    name: string;
    size: number;
    followers: number;
    following: number;
  } | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      operationRef.current += 1;
      jobRef.current?.cancel();
      jobRef.current = null;
    };
  }, []);

  const processFile = async (file: File) => {
    if (isImporting) return;

    const operationId = operationRef.current + 1;
    operationRef.current = operationId;
    setIsImporting(true);
    setLastImport(null);

    const job = importInstagramZipInWorker(file);
    jobRef.current = job;

    try {
      const result = await job.promise;
      if (!mountedRef.current || operationId !== operationRef.current) return;

      setLastImport({
        name: file.name,
        size: file.size,
        followers: result.followers.length,
        following: result.following.length,
      });
      onImported(result, file.name);
    } catch (error) {
      if (!mountedRef.current || operationId !== operationRef.current) return;
      if (error instanceof Error && error.name === 'AbortError') return;

      setLastImport(null);
      onError(error instanceof Error ? error.message : 'Impossibile importare il file ZIP.');
    } finally {
      if (jobRef.current === job) jobRef.current = null;
      if (mountedRef.current && operationId === operationRef.current) {
        setIsImporting(false);
        setIsDragging(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void processFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (isImporting) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  return (
    <section className="bg-gradient-to-br from-indigo-950/60 to-slate-900 rounded-2xl border border-indigo-500/40 p-5 shadow-lg shadow-indigo-950/30">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 flex items-center justify-center shrink-0">
              <Archive size={20} aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-white">Importa il ZIP di Instagram</h2>
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-500/30 rounded-full px-2 py-0.5">
                  Consigliato
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Carica direttamente l&apos;archivio scaricato da Meta: InstaSniff trova follower e seguiti da solo e avvia subito il confronto.
              </p>
            </div>
          </div>
        </div>

        <div
          onDragOver={(event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            if (!isImporting) setIsDragging(true);
          }}
          onDragLeave={(event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          aria-busy={isImporting}
          className={`rounded-xl border border-dashed p-4 transition-colors ${
            isDragging
              ? 'border-indigo-400 bg-indigo-500/10'
              : 'border-slate-700 bg-slate-950/50 hover:border-slate-600'
          } ${isImporting ? 'opacity-80' : ''}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            className="hidden"
            onChange={handleFileChange}
            disabled={isImporting}
            aria-label="Seleziona ZIP esportato da Instagram"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileArchive size={22} className="text-slate-400 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200">
                  {isImporting ? 'Analisi del file in corso…' : 'Trascina qui il file .zip oppure selezionalo'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Leggiamo solo i file follower/seguiti presenti nell&apos;archivio.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isImporting}
              className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none cursor-pointer disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                  Lettura ZIP...
                </>
              ) : (
                <>
                  <Upload size={15} aria-hidden="true" />
                  Scegli ZIP
                </>
              )}
            </button>
          </div>
        </div>

        {lastImport && (
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-950/25 px-3 py-2.5 text-xs">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold text-emerald-300 truncate" title={lastImport.name}>
                {lastImport.name} · {formatBytes(lastImport.size)}
              </p>
              <p className="text-slate-400 mt-0.5">
                {lastImport.followers} follower · {lastImport.following} seguiti rilevati
              </p>
            </div>
          </div>
        )}

        <details className="group rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2.5">
          <summary className="cursor-pointer text-xs font-semibold text-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none rounded-lg">
            Come ottenere il ZIP corretto da Instagram
          </summary>
          <div className="mt-2.5 text-[11px] text-slate-400 leading-relaxed space-y-2">
            <p>
              Centro gestione account → Le tue informazioni e autorizzazioni → Scarica le tue informazioni → seleziona il profilo Instagram.
            </p>
            <p>
              Scegli <strong className="text-slate-300">Alcune delle tue informazioni</strong> → <strong className="text-slate-300">Follower e seguiti</strong> → download sul dispositivo → intervallo <strong className="text-slate-300">Dall&apos;inizio</strong> → formato <strong className="text-slate-300">JSON</strong>.
            </p>
          </div>
        </details>

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck size={13} className="text-emerald-400 shrink-0" aria-hidden="true" />
          <span>Elaborazione locale: il tuo ZIP non viene caricato su server esterni.</span>
        </div>
      </div>
    </section>
  );
}
