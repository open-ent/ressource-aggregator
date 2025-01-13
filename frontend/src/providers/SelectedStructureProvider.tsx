import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { useUser } from "@edifice.io/react";

import {
  SelectedStructureProviderContextType,
  SelectedStructureProviderProviderProps,
} from "./types";
import { PREF_STRUCTURE } from "~/core/const/preferences.const";
import usePreferences from "~/hooks/usePreferences";

const SelectedStructureProviderContext =
  createContext<SelectedStructureProviderContextType | null>(null);

export const useSelectedStructureProvider = () => {
  const context = useContext(SelectedStructureProviderContext);
  if (!context) {
    throw new Error(
      "useSelectedStructureProvider must be used within a SelectedStructureProviderProvider",
    );
  }
  return context;
};

export const SelectedStructureProvider: React.FC<
  SelectedStructureProviderProviderProps
> = ({ children }) => {
  const [idSelectedStructure, setIdSelectedStructure] = useState<string>("");
  const [nameSelectedStructure, setNameSelectedStructure] =
    useState<string>("");
  const { user } = useUser();
  const { getPreference, savePreference } = usePreferences(PREF_STRUCTURE);

  useEffect(() => {
    (async () => {
      const idPrefStructure = await getPreference();
      if (idPrefStructure) {
        const index = user?.structures.indexOf(idPrefStructure);
        if (index !== undefined && index !== -1) {
          setIdSelectedStructure(idPrefStructure);
          setNameSelectedStructure(user?.structureNames[index] ?? "");
        } else if (user?.structures.length) {
          setIdSelectedStructure(user?.structures[0]);
          setNameSelectedStructure(user?.structureNames[0]);
        }
        return;
      }
      if (user?.structures.length) {
        setIdSelectedStructure(user?.structures[0]);
        setNameSelectedStructure(user?.structureNames[0]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [PREF_STRUCTURE, user]);

  useEffect(() => {
    if (nameSelectedStructure && user) {
      const index = user.structureNames.indexOf(nameSelectedStructure);
      const id = user.structures[index];
      setIdSelectedStructure(id);
      savePreference(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameSelectedStructure, user]);

  const value = useMemo<SelectedStructureProviderContextType>(
    () => ({
      nameSelectedStructure,
      setNameSelectedStructure,
      idSelectedStructure,
    }),
    [idSelectedStructure, nameSelectedStructure],
  );

  return (
    <SelectedStructureProviderContext.Provider value={value}>
      {children}
    </SelectedStructureProviderContext.Provider>
  );
};
