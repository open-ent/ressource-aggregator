import { textbooksUrl } from "../../utils/queryString";
import { emptySplitApi } from "./emptySplitApi.service";

export const textbooksApi = emptySplitApi.injectEndpoints({
  endpoints: (builder) => ({
    getTextbooks: builder.query({
      query: (idStructure) => ({
        url: textbooksUrl(idStructure),
      }),
      providesTags: ["FavoritesChanged"],
      extraOptions: { surfaceErrors: true },
    }),
  }),
});

export const { useGetTextbooksQuery } = textbooksApi;
