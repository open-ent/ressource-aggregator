import { emptySplitApi } from "./emptySplitApi.service";

export const signetsApi = emptySplitApi.injectEndpoints({
  endpoints: (builder) => ({
    getPublishedSignets: builder.query({
      query: () => "signets",
      providesTags: ["SignetsChanged"],
    }),
    getMySignets: builder.query({
      query: () => "mysignets",
      providesTags: ["SignetsChanged"],
    }),
    createSignet: builder.mutation({
      query: ({ payload }) => ({
        url: `signets`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["SignetsChanged"],
    }),
    updateSignet: builder.mutation({
      query: ({ idSignet, payload }) => ({
        url: `signets/${idSignet}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: ["SignetsChanged", "FavoritesChanged"],
    }),
    deleteSignet: builder.mutation({
      query: ({ idSignet }) => ({
        url: `signets/${idSignet}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SignetsChanged"],
    }),
    publishSignet: builder.mutation({
      query: ({ idSignet, payload }) => ({
        url: `signet/publish/${idSignet}`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["SignetsChanged"],
    }),
    updateShareResource: builder.mutation({
      query: ({ idSignet, payload }) => ({
        url: `share/resource/${idSignet}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: ["SignetsChanged"],
    }),
    getMyPublishedSignets: builder.query({
      query: () => "signets/public/",
      providesTags: ["SignetsChanged"],
    }),
    deleteSignetPublic: builder.mutation({
      query: ({ idSignet }) => ({
        url: `signets/public/${idSignet}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SignetsChanged"],
    }),
  }),
});

export const {
  useGetPublishedSignetsQuery,
  useGetMySignetsQuery,
  useCreateSignetMutation,
  useUpdateSignetMutation,
  usePublishSignetMutation,
  useUpdateShareResourceMutation,
  useDeleteSignetMutation,
  useDeleteSignetPublicMutation,
  useGetMyPublishedSignetsQuery,
} = signetsApi;
