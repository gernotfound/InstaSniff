import React, { useId, useMemo, useRef, useState } from 'react';
import { Upload, Trash2, Clipboard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { parseInstagramText } from '../utils';

interface InputCardProps {
  title: string;
  description: string;
  value: string;
  onChange: (val: string) => void;
}

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB limit

export function InputCard({
  title,
  description,
  value,
  onChange,
}: InputCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaId = useId();
  const fileInputId = useId();
  const [fileError, setFileError] = useState<string | null>(null);
  const [pasteSuccess, setPasteSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const processFileContent = (content: string) => {
    const parsedUsernames = parseInstagramText(content);
    if (parsedUsernames.length > 0) {
      // If we found usernames (e.g. from HTML/JSON/CSV), just insert the clean list!
      onChange(parsedUsernames.join('\n'));
    } else {
      // Fallback to raw content if parsing didn't yield anything obvious
      onChange(content);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError('Il file supera la dimensione massima consentita di 15 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
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

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setFileError(null);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError('Il file supera la dimensione massima consentita di 15 MB.');
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
      setFileError('Impossibile leggere il file selezionato.');
    };
    reader.readAsText(file);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(value ? `${value}\n${text}` : text);
        setPasteSuccess(true);
        setTimeout(() => setPasteSuccess(false), 2000);
      }
    } catch {
      // Clipboard permissions denied or unsupported
    }
  };

  const handleClear = () => {
    onChange('');
    setFileError(null);
  };

  const { lineCount, parsedCount } = useMemo(() => {
    if (!value || !value.trim()) {
      return { lineCount: 0, parsedCount: 0 };
    }
    const lines = value.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
    const parsed = parseInstagramText(value).length;
    return { lineCount: lines, parsedCount: parsed };
  }, [value]);

  return (
    <section
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-slate-900 rounded-2xl border p-5 flex flex-col gap-3 shadow-md transition-colors ${
        isDragging ? 'border-indigo-500 bg-slate-800/80' : 'border-slate-800'
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <label
            htmlFor={textareaId}
            className="text-xs font-bold uppercase tracking-wider text-slate-300 block cursor-pointer"
          >
            {title}
          </label>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePasteFromClipboard}
            className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none flex items-center gap-1 text-xs"
            title="Incolla dagli appunti"
          >
            {pasteSuccess ? (
              <CheckCircle2 size={14} className="text-green-400" />
            ) : (
              <Clipboard size={14} />
            )}
            <span className="hidden sm:inline text-[11px] font-medium">Incolla</span>
          </button>

          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 bg-slate-950 hover:bg-red-950/40 border border-slate-800 hover:border-red-800/50 text-slate-400 hover:text-red-400 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none flex items-center gap-1 text-xs"
              title="Pulisci testo"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline text-[11px] font-medium">Pulisci</span>
            </button>
          )}
        </div>
      </div>

      <textarea
        id={textareaId}
        className="flex-grow min-h-[220px] bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-300 resize-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent custom-scrollbar leading-relaxed"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={title}
      />

      {fileError && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/40 border border-red-800/40 p-2.5 rounded-lg">
          <AlertCircle size={14} className="shrink-0" />
          <span>{fileError}</span>
        </div>
      )}

      <div className="flex justify-between items-center text-xs text-slate-400 font-mono mt-1">
        <div className="flex items-center gap-2">
          <span>{lineCount} righe</span>
          <span className="text-slate-600">•</span>
          <span className={parsedCount > 0 ? 'text-indigo-400 font-semibold' : 'text-slate-500'}>
            {parsedCount} account rilevati
          </span>
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
