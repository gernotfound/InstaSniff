import type { AnalysisStats } from './utils';
import type { InstagramZipImportResult } from './instagramZip';
import { computeAnalysis, parseInstagramText } from './utils';
import { importInstagramZip } from './instagramZip';

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

function runWorkerJob<T>(
  payload: Record<string, unknown>,
  fallback: () => Promise<T> | T
): ProcessingJob<T> {
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

    try {
      if (typeof Worker === 'undefined') throw new Error('Web Worker non disponibile');
      worker = new Worker(new URL('./processing.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (event: MessageEvent<WorkerResponse<T>>) => {
        const response = event.data;
        if (!response || response.id !== id) return;
        if (response.ok) resolveOnce(response.result);
        else rejectOnce(new Error(response.error));
      };
      worker.onerror = () => {
        worker?.terminate();
        worker = null;
        Promise.resolve()
          .then(fallback)
          .then(resolveOnce, rejectOnce);
      };
      worker.postMessage({ id, ...payload });
    } catch {
      worker?.terminate();
      worker = null;
      Promise.resolve()
        .then(fallback)
        .then(resolveOnce, rejectOnce);
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
  return runWorkerJob<AnalysisStats>(
    { kind: 'manual', followersText, followingText },
    () => computeAnalysis(parseInstagramText(followingText), parseInstagramText(followersText))
  );
}

export function importInstagramZipInWorker(file: File): ProcessingJob<InstagramZipImportResult> {
  return runWorkerJob<InstagramZipImportResult>(
    { kind: 'zip', file },
    () => importInstagramZip(file)
  );
}
