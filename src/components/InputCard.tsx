import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Upload, Trash2, Clipboard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { parseInstagramText } from '../utils';

interface InputCardProps {
  title: string;
  description: string;
  value: string;
  onChange: (val: string) => void;
}

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const LIVE_COUNT_MAX_CHARS = 300_000;

export function InputCard({ title, description, value, onChange }: InputCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaId = useId();
  const fileInputId = useId();
  const [fileError, setFileError] = useState<string | null>(null);
  const [pasteSuccess, setPasteSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedCount, setParsedCount] = useState<number | null>(0);

  const processFileContent = (content: string) => {
    const parsedUsernames = parseInstagramText(content);
    onChange(parsedUsernames.length > 0 ? parsedUsernames.join('\n') : content);
  };

  const readFile = (file: File) => {
    setFileError(null);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError('Il file supera la dimensione massima consentita di 15 MB. Per gli export completi usa il caricamento ZIP qui sopra.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        processFileContent(event.target.result);
        setFileError(null);
      }
    };
    reader.onerror = () => {
      setFileError('Impossibile leggere il file selezionato. Riprova con un altro formato.');
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) readFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(value ? `${value}\n${text}` : text);
        setPasteSuccess(true);
        window.setTimeout(() => setPasteSuccess(false), 2000);
      }
    } catch {
      setFileError('Il browser non ha consentito l’accesso agli appunti. Puoi incollare direttamente nel campo di testo.');
    }
  };

  const handleClear = () => {
    onChange('');
    setFileError(null);
  };

  const lineCount = useMemo(() => {
    if (!value.trim()) return 0;
    return value.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
  }, [value]);

  useEffect(() => {
    if (!value.trim()) {
      setParsedCount(0);
      return;
    }

    if (value.length > LIVE_COUNT_MAX_CHARS) {
      setParsedCount(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setParsedCount(parseInstagramText(value).length);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <section
      onDragOver={(event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDrop={handleDrop}
      className={`bg-slate-900 rounded-2xl border p-5 flex flex-col gap-3 shadow-md transition-colors ${
        isDragging ? 'border-indigo-500 bg-slate-800/80' : 'border-slate-800'
      }`}
    >
      <div className="flex justify-between items-start gap-3">
        <div>
          <label
            htmlFor={textareaId}
            className="text-xs font-bold uppercase tracking-wider text-slate-300 block cursor-pointer"
          >
            {title}
          </label>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handlePasteFromClipboard}
            className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none flex items-center gap-1 text-xs"
            title="Incolla dagli appunti"
            aria-label="Incolla dagli appunti"
          >
            {pasteSuccess ? <CheckCircle2 size={14} className="text-green-400" /> : <Clipboard size={14} />}
            <span className="hidden sm:inline text-[11px] font-medium">Incolla</span>
          </button>

          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 bg-slate-950 hover:bg-red-950/40 border border-slate-800 hover:border-red-800/50 text-slate-400 hover:text-red-400 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none flex items-center gap-1 text-xs"
              title="Pulisci testo"
              aria-label={`Pulisci ${title}`}
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline text-[11px] font-medium">Pulisci</span>
            </button>
          )}
        </div>
      </div>

      <textarea
        id={textareaId}
        className="flex-grow min-h-[220px] bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-300 resize-y outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent custom-scrollbar leading-relaxed"
        value={value}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
        aria-label={title}
        spellCheck={false}
        placeholder="@username oppure contenuto JSON / HTML / CSV"
      />

      {fileError && (
        <div role="alert" className="flex items-start gap-2 text-xs text-red-400 bg-red-950/40 border border-red-800/40 p-2.5 rounded-lg">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{fileError}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs text-slate-400 font-mono mt-1">
        <div className="flex items-center gap-2 min-w-0">
          <span>{lineCount} righe</span>
          <span className="text-slate-600">•</span>
          {parsedCount === null ? (
            <span className="text-slate-500">conteggio al momento dell&apos;analisi</span>
          ) : (
            <span className={parsedCount > 0 ? 'text-indigo-400 font-semibold' : 'text-slate-500'}>
              {parsedCount} account rilevati
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <input
            id={fileInputId}
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".txt,.html,.htm,.json,.csv,.tsv"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors uppercase tracking-wider text-xs font-semibold focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          >
            <Upload size={14} />
            Carica file
          </button>
        </div>
      </div>
    </section>
  );
}
