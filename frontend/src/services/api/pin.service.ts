import { emptySplitApi } from "./emptySplitApi.service";

export const pinApi = emptySplitApi.injectEndpoints({
  endpoints: (builder) => ({
    createPin: builder.mutation({
      query: ({ idStructure, payload }) => ({
        url: `/structures/${idStructure}/pins`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["PinsChanged"],
    }),
    deletePin: builder.mutation({
      query: ({ idStructure, idResource }) => ({
        url: `/structures/${idStructure}/pins/${idResource}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PinsChanged"],
    }),
    updatePin: builder.mutation({
      query: ({ idStructure, idResource, payload }) => ({
        url: `/structures/${idStructure}/pins/${idResource}`,
        method: `PUT`,
        body: payload,
      }),
      invalidatesTags: ["PinsChanged"],
    }),
    getPins: builder.query({
      query: (idStructure: string) => `structures/${idStructure}/pins`,
      providesTags: ["PinsChanged", "FavoritesChanged"],
    }),
  }),
});

export const {
  useCreatePinMutation,
  useDeletePinMutation,
  useUpdatePinMutation,
  useGetPinsQuery,
} = pinApi;
