export function parseInstagramText(rawText: string): string[] {
  // Rimuoviamo eventuali tag html nel caso in cui l'utente carichi un file html esportato
  const textWithoutTags = rawText.replace(/<[^>]*>?/gm, '\n');
  const lines = textWithoutTags.split(/\r?\n/);
  
  const usernames = new Set<string>();
  
  // I nomi utente Instagram possono contenere solo lettere, numeri, punti e underscore.
  // Escludiamo tutto ciò che contiene spazi, virgole o due punti (tipici delle date).
  // La lunghezza massima è 30 caratteri.
  const usernameRegex = /^[a-zA-Z0-9._]{1,30}$/;

  for (const line of lines) {
    const cleanLine = line.trim();
    // Se la riga non è vuota e rispetta il formato di un username IG
    if (cleanLine && usernameRegex.test(cleanLine)) {
      usernames.add(cleanLine.toLowerCase());
    }
  }
  
  return Array.from(usernames);
}
