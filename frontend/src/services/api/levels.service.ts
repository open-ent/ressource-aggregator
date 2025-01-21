import { emptySplitApi } from "./emptySplitApi.service";

export const signetsApi = emptySplitApi.injectEndpoints({
  endpoints: (builder) => ({
    getLevels: builder.query({
      query: () => "levels",
      providesTags: ["PinsChanged"],
    }),
  }),
});

export const { useGetLevelsQuery } = signetsApi;
