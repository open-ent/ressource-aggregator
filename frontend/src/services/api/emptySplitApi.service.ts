import {
  BaseQueryFn,
  createApi,
  fetchBaseQuery,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({ baseUrl: "/mediacentre/" });

/**
 * Options d'un endpoint : `surfaceErrors` fait remonter l'échec d'une lecture (listes principales).
 * Les autres lectures gardent l'ancien repli sur une liste vide (ex. épingles ou niveaux pour un profil sans droit).
 */
export interface MediacentreExtraOptions {
  surfaceErrors?: boolean;
}

/**
 * Une ÉCRITURE en échec est toujours remontée : avant, toute erreur (401, 403, 500) était convertie en
 * `{ data: [] }`, donc « ajouté aux favoris » ou « signet créé » s'affichaient même quand le serveur
 * avait refusé, et les `response?.error` des fenêtres ne se déclenchaient jamais.
 */
export const shouldSurfaceError = (
  args: string | { url: string; method?: string },
  extraOptions?: MediacentreExtraOptions,
): boolean => {
  const method = typeof args === "string" ? "GET" : (args.method ?? "GET").toUpperCase();
  return method !== "GET" || !!extraOptions?.surfaceErrors;
};

const customBaseQuery: BaseQueryFn<
  string | { url: string; method?: string; body?: any },
  unknown,
  FetchBaseQueryError,
  MediacentreExtraOptions
> = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  if (result.error && !shouldSurfaceError(args, extraOptions)) {
    return { data: [] as any };
  }

  return result;
};

export const emptySplitApi = createApi({
  baseQuery: customBaseQuery,
  tagTypes: ["PinsChanged", "FavoritesChanged", "SignetsChanged", "Search"],
  endpoints: () => ({}),
});
