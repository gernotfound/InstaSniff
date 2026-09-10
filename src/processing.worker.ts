import { computeAnalysis, parseInstagramText } from './utils';
import { importInstagramZip } from './instagramZip';

interface ManualRequest {
  id: number;
  kind: 'manual';
  followersText: string;
  followingText: string;
}

interface ZipRequest {
  id: number;
  kind: 'zip';
  file: File;
}

type WorkerRequest = ManualRequest | ZipRequest;

type WorkerResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string };

const workerScope = globalThis as unknown as {
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<WorkerRequest>) => void
  ) => void;
  postMessage: (message: WorkerResponse) => void;
};

workerScope.addEventListener('message', (event) => {
  void handleRequest(event.data);
});

async function handleRequest(request: WorkerRequest): Promise<void> {
  try {
    if (!request || !Number.isSafeInteger(request.id)) {
      throw new Error('Richiesta di elaborazione non valida.');
    }

    if (request.kind === 'manual') {
      const followers = parseInstagramText(request.followersText);
      const following = parseInstagramText(request.followingText);
      workerScope.postMessage({
        id: request.id,
        ok: true,
        result: computeAnalysis(following, followers),
      });
      return;
    }

    if (request.kind === 'zip') {
      const result = await importInstagramZip(request.file);
      workerScope.postMessage({ id: request.id, ok: true, result });
      return;
    }

    throw new Error('Tipo di elaborazione non supportato.');
  } catch (error) {
    workerScope.postMessage({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto durante l’elaborazione.',
    });
  }
}
