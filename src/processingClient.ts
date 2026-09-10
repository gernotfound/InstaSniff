import type { AnalysisStats } from './utils';

export interface ProcessedInstagramZipResult {
  stats: AnalysisStats;
  followersCount: number;
  followingCount: number;
  followerFiles: string[];
  followingFiles: string[];
  warnings: string[];
}

interface ProcessingJob<T> {
  promise: Promise<T>;
  cancel: () => void;
}

interface WorkerSuccess<T> {
  id: number;
  ok: true;
  result: T;
}

interface WorkerFailure {
  id: number;
  ok: false;
  error: string;
}

type WorkerResponse<T> = WorkerSuccess<T> | WorkerFailure;

let nextJobId = 1;

function createAbortError(): Error {
  const error = new Error('Elaborazione annullata.');
  error.name = 'AbortError';
  return error;
}

function runWorkerJob<T>(payload: Record<string, unknown>): ProcessingJob<T> {
  const id = nextJobId++;
  let worker: Worker | null = null;
  let settled = false;
  let rejectPromise: ((reason?: unknown) => void) | null = null;

  const promise = new Promise<T>((resolve, reject) => {
    rejectPromise = reject;

    const resolveOnce = (value: T) => {
      if (settled) return;
      settled = true;
      worker?.terminate();
      worker = null;
      resolve(value);
    };

    const rejectOnce = (reason: unknown) => {
      if (settled) return;
      settled = true;
      worker?.terminate();
      worker = null;
      reject(reason);
    };

    if (typeof Worker === 'undefined') {
      rejectOnce(new Error('Questo browser non supporta i Web Worker richiesti per elaborare i dati in sicurezza. Aggiorna il browser e riprova.'));
      return;
    }

    try {
      worker = new Worker(new URL('./processing.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (event: MessageEvent<WorkerResponse<T>>) => {
        const response = event.data;
        if (!response || response.id !== id) return;
        if (response.ok) resolveOnce(response.result);
        else rejectOnce(new Error(response.error));
      };
      worker.onerror = (event: ErrorEvent) => {
        rejectOnce(
          new Error(
            event.message
              ? `Elaborazione interrotta: ${event.message}`
              : 'Il processo di elaborazione si è arrestato in modo anomalo. Riprova con l’export originale di Instagram.'
          )
        );
      };
      worker.onmessageerror = () => {
        rejectOnce(new Error('Il browser non è riuscito a trasferire correttamente i dati al processo di elaborazione.'));
      };
      worker.postMessage({ id, ...payload });
    } catch {
      rejectOnce(new Error('Impossibile avviare il processo isolato di elaborazione. Aggiorna il browser e riprova.'));
    }
  });

  return {
    promise,
    cancel: () => {
      if (settled) return;
      settled = true;
      worker?.terminate();
      worker = null;
      rejectPromise?.(createAbortError());
    },
  };
}

export function analyzeManualLists(
  followersText: string,
  followingText: string
): ProcessingJob<AnalysisStats> {
  return runWorkerJob<AnalysisStats>({ kind: 'manual', followersText, followingText });
}

export function importInstagramZipInWorker(file: File): ProcessingJob<ProcessedInstagramZipResult> {
  return runWorkerJob<ProcessedInstagramZipResult>({ kind: 'zip', file });
}
