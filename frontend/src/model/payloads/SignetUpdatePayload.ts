export interface SignetUpdatePayload {
  levels: { id: string; label: string }[];
  disciplines: { id: string; label: string }[];
  plain_text: { label: string }[];
  title: string;
  image: string;
  url: string;
  date_creation: string | null;
  collab: boolean;
  archived: boolean;
  orientation: boolean;
}
