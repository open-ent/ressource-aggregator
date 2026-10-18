import { searchUrl } from "../../utils/queryString";
import { emptySplitApi } from "./emptySplitApi.service";

export const searchApi = emptySplitApi.injectEndpoints({
  endpoints: (builder) => ({
    search: builder.query({
      query: ({ jsondata, idStructure }) => ({
        url: searchUrl(idStructure, jsondata),
      }),
      providesTags: ["FavoritesChanged", "Search"],
      extraOptions: { surfaceErrors: true },
    }),
  }),
});

export const { useSearchQuery } = searchApi;
