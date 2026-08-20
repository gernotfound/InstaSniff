import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

interface InputCardProps {
  title: string;
  description: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function InputCard({ title, description, value, onChange, placeholder }: InputCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onChange(event.target.result as string);
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const lineCount = value.split('\n').filter(l => l.trim()).length;

  return (
    <section className="bg-slate-900 rounded-2xl border border-slate-800 p-5 flex flex-col gap-3">
      <div className="flex justify-between items-center mb-1">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      
      <textarea
        className="flex-grow min-h-[220px] bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-400 resize-none outline-none focus:border-indigo-500/50 custom-scrollbar leading-relaxed"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-1">
        <span>Righe: {lineCount}</span>
        <div className="flex items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".txt,.html,.json,.csv"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors uppercase tracking-wider"
          >
            <Upload size={12} />
            Carica file
          </button>
        </div>
      </div>
    </section>
  );
}
