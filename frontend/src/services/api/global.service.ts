import { emptySplitApi } from "./emptySplitApi.service";

export const globalApi = emptySplitApi.injectEndpoints({
  endpoints: (builder) => ({
    getGlobal: builder.query({
      query: () => "global/resources",
      providesTags: ["FavoritesChanged"],
      extraOptions: { surfaceErrors: true },
    }),
  }),
});

export const { useGetGlobalQuery } = globalApi;
