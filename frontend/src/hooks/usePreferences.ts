import { odeServices } from "@edifice.io/client";
import { useDispatch } from "react-redux";
import { searchApi } from "~/services/api/search.service";

export default function usePreferences(name: string) {
  const dispatch = useDispatch();

  const getPreference = async (): Promise<any> => {
    const res = await odeServices.conf().getPreference(name);
    return res;
  };

  const savePreference = async (value: any): Promise<void> => {
    const res = await odeServices
      .conf()
      .savePreference(name, JSON.stringify(value));

    dispatch(searchApi.util.invalidateTags(["Search"]));

    return res;
  };

  return { getPreference, savePreference };
}
