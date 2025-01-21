import { emptySplitApi } from "./emptySplitApi.service";

export const globalApi = emptySplitApi.injectEndpoints({
  endpoints: (builder) => ({
    getGlobal: builder.query({
      query: () => "global/resources",
      providesTags: ["FavoritesChanged"],
    }),
  }),
});

export const { useGetGlobalQuery } = globalApi;
