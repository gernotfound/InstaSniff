# InstaSniff

InstaSniff confronta follower e seguiti di Instagram usando esclusivamente i dati esportati dall'utente. Non richiede login, cookie di sessione, API Instagram o backend: l'elaborazione avviene nel browser.

**Demo:** https://gernotfound.github.io/InstaSniff/

## Funzioni

- Import diretto del file ZIP ufficiale scaricato da Instagram/Meta.
- Rilevamento automatico di `following.json` e di tutti i file `followers_*.json` presenti nell'archivio.
- Compatibilità di fallback con export HTML, file JSON/CSV/TSV/TXT e liste incollate.
- Confronto tra account che non ricambiano, follower che non segui e follow reciproci.
- Ricerca, ordinamento, link ai profili, copia ed export TXT/CSV/JSON.
- Elaborazione 100% client-side: i file non vengono inviati a server esterni.

## Ottenere il file corretto da Instagram

Da **Centro gestione account** apri **Le tue informazioni e autorizzazioni → Scarica le tue informazioni**, seleziona il profilo Instagram e scegli **Alcune delle tue informazioni → Follower e seguiti**.

Per un confronto completo usa **Dall'inizio** come intervallo e **JSON** come formato. Meta restituisce un file `.zip`; InstaSniff può leggerlo direttamente, senza estrarlo. In genere l'archivio contiene `following.json` e `followers_1.json`; gli account con molti follower possono avere anche `followers_2.json`, `followers_3.json`, ecc.

## Sviluppo locale

Prerequisito: Node.js.

```bash
npm ci
npm run dev
```

Controlli di qualità:

```bash
npm run lint
npm test
npm run build
```

## Deploy

Ogni push su `main` esegue lint, typecheck, test e build; se tutto passa, GitHub Actions pubblica `dist/` su GitHub Pages.

## Privacy

InstaSniff è un'applicazione statica. Il parser ZIP legge nel browser soltanto i file necessari al confronto e non estrae foto o video dall'archivio. Nessun dato dell'export viene inviato a un backend.
