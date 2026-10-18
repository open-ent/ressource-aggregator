/**
 * Construction des URL d'API : chaque valeur est encodée avec `encodeURIComponent`.
 * `encodeURI` laissait passer `& # + ;` : une recherche « maths & physique » tronquait la requête
 * au `&`, « c# » au `#`.
 */
export const searchUrl = (idStructure: string | number | undefined, jsondata: unknown): string =>
  `search?structureIds=${encodeURIComponent(String(idStructure ?? ""))}&jsondata=${encodeURIComponent(
    JSON.stringify(jsondata),
  )}`;

export const textbooksUrl = (idStructure: string | number | undefined): string =>
  `textbooks/refresh?structureIds=${encodeURIComponent(String(idStructure ?? ""))}`;

export const addFavoriteUrl = (id: string | number | undefined): string =>
  `favorites?id=${encodeURIComponent(String(id ?? ""))}`;

export const removeFavoriteUrl = (
  id: string | number | undefined,
  source: string | undefined,
): string =>
  `favorites?id=${encodeURIComponent(String(id ?? ""))}&source=${encodeURIComponent(source ?? "")}`;
