/**
 * Les mutations RTK Query ne lèvent jamais : un échec revient dans `{ error }`. Sans ce garde, le
 * `catch` des appelants n'était jamais atteint et le toast « ajouté aux favoris » s'affichait
 * même quand le serveur avait refusé la requête.
 */
export function assertMutationOk<T>(result: T): T {
  const error = (result as { error?: unknown } | null | undefined)?.error;
  if (error) throw error;
  return result;
}
