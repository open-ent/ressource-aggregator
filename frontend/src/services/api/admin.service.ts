import { emptySplitApi } from "./emptySplitApi.service";

/**
 * Administration (super-administrateur) : ressources globales, ressources mises en avant, réindexation GAR.
 * Les lectures remontent leurs échecs : une liste vide ne doit pas masquer une panne.
 */
export const adminApi = emptySplitApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminGlobals: builder.query<any[], void>({
      query: () => "global/resources/all",
      providesTags: ["AdminChanged"],
      extraOptions: { surfaceErrors: true },
    }),
    createGlobal: builder.mutation({
      query: (payload) => ({ url: "global/resources", method: "POST", body: payload }),
      invalidatesTags: ["AdminChanged", "FavoritesChanged"],
    }),
    updateGlobal: builder.mutation({
      query: ({ id, payload }) => ({ url: `global/resources/${id}`, method: "PUT", body: payload }),
      invalidatesTags: ["AdminChanged", "FavoritesChanged"],
    }),
    deleteGlobal: builder.mutation({
      query: (id: string) => ({ url: `global/resources/${id}`, method: "DELETE" }),
      invalidatesTags: ["AdminChanged", "FavoritesChanged"],
    }),
    getAdminFeatured: builder.query<any[], void>({
      query: () => "featured",
      providesTags: ["AdminChanged"],
      extraOptions: { surfaceErrors: true },
    }),
    createFeatured: builder.mutation({
      query: (payload) => ({ url: "featured", method: "POST", body: payload }),
      invalidatesTags: ["AdminChanged"],
    }),
    deleteFeatured: builder.mutation({
      query: (resourceId: string) => ({ url: `featured?idRessource=${encodeURIComponent(resourceId)}`, method: "DELETE" }),
      invalidatesTags: ["AdminChanged"],
    }),
    reindexGar: builder.mutation<{ status?: string; message?: string }, void>({
      query: () => ({ url: "gar/reindex", method: "POST" }),
    }),
  }),
});

export const {
  useGetAdminGlobalsQuery,
  useCreateGlobalMutation,
  useUpdateGlobalMutation,
  useDeleteGlobalMutation,
  useGetAdminFeaturedQuery,
  useCreateFeaturedMutation,
  useDeleteFeaturedMutation,
  useReindexGarMutation,
} = adminApi;
