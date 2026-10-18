/** Jeton XSRF posé par la plateforme en cookie : à renvoyer en en-tête sur toute écriture. */
const xsrfHeader = (): Record<string, string> => {
  const match = typeof document !== "undefined" ? document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/) : null;
  return match ? { "X-XSRF-TOKEN": decodeURIComponent(match[1]) } : {};
};

/**
 * Duplique une ressource Moodle (URL fournie par le serveur dans `resource.action.url`).
 * Renvoie `false` sur toute erreur, y compris un échec réseau : l'appelant affiche alors le message
 * d'erreur au lieu de laisser une promesse rejetée muette.
 */
export async function duplicateResource(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "POST", credentials: "same-origin", headers: xsrfHeader() });
    return !!response?.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
}
