import {
  BaseQueryFn,
  createApi,
  fetchBaseQuery,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({ baseUrl: "/mediacentre/" });

const customBaseQuery: BaseQueryFn<
  string | { url: string; method?: string; body?: any },
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  if (result.error) {
    return { data: [] as any };
  }

  return result;
};

export const emptySplitApi = createApi({
  baseQuery: customBaseQuery,
  tagTypes: ["PinsChanged", "FavoritesChanged", "SignetsChanged", "Search"],
  endpoints: () => ({}),
});
