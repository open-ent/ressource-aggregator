import { emptySplitApi } from "./emptySplitApi.service";

export const searchApi = emptySplitApi.injectEndpoints({
  endpoints: (builder) => ({
    search: builder.query({
      query: ({ jsondata, idStructure }) => ({
        url: `search?structureIds=${idStructure}&jsondata=${encodeURI(
          JSON.stringify(jsondata),
        )}`,
      }),
      providesTags: ["FavoritesChanged", "Search"],
    }),
  }),
});

export const { useSearchQuery } = searchApi;
