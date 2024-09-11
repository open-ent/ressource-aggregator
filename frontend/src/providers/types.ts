import { Dispatch, ReactNode, SetStateAction } from "react";

import { AlertTypes } from "@edifice-ui/react";
import {
  FetchArgs,
  QueryActionCreatorResult,
  QueryDefinition,
  BaseQueryFn,
  FetchBaseQueryMeta,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";

import { ModalEnum } from "~/core/enum/modal.enum";
import { ExternalResource } from "~/model/ExternalResource.model";
import { Moodle } from "~/model/Moodle.model";
import { Pin } from "~/model/Pin.model";
import { SearchResource } from "~/model/SearchResource.model";
import { Signet } from "~/model/Signet.model";
import { Textbook } from "~/model/Textbook.model";

export interface ModalProviderProviderProps {
  children: ReactNode;
}

export type ModalProviderContextType = {
  modalResource:
    | Textbook
    | Signet
    | ExternalResource
    | Moodle
    | SearchResource
    | null;
  setModalResource: Dispatch<
    SetStateAction<
      Textbook | Signet | ExternalResource | Moodle | SearchResource | null
    >
  >;
  openModal: string | null;
  openSpecificModal: (modal: ModalEnum) => void;
  closeAllModals: () => void;
};

export interface AlertProviderProviderProps {
  children: ReactNode;
}

export type AlertProviderContextType = {
  alertText: string;
  setAlertText: Dispatch<SetStateAction<string>>;
  alertType: AlertTypes;
  setAlertType: Dispatch<SetStateAction<AlertTypes>>;
  notify: (text: string, type: AlertTypes) => void;
};

export interface PinProviderProviderProps {
  children: ReactNode;
}

export type PinProviderContextType = {
  pins: Pin[] | null;
  setPins: Dispatch<SetStateAction<Pin[] | null>>;
  refetchPins: () => QueryActionCreatorResult<
    QueryDefinition<
      string,
      BaseQueryFn<
        string | FetchArgs,
        unknown,
        FetchBaseQueryError,
        {},
        FetchBaseQueryMeta
      >,
      never,
      any,
      "api"
    >
  >;
};

export interface SelectedStructureProviderProviderProps {
  children: ReactNode;
}

export type SelectedStructureProviderContextType = {
  nameSelectedStructure: string;
  setNameSelectedStructure: Dispatch<SetStateAction<string>>;
  idSelectedStructure: string;
};

export interface ToasterProviderProps {
  children: ReactNode;
}

export interface ToasterProviderContextType {
  toasterResources: SearchResource[] | null;
  setToasterResources: Dispatch<SetStateAction<SearchResource[] | null>>;
  toasterRights: toasterRightsState | null;
  setToasterRights: Dispatch<SetStateAction<toasterRightsState | null>>;
  selectedTab: string;
  setSelectedTab: Dispatch<SetStateAction<string>>;
  isSelectable: (resource: SearchResource) => boolean;
  toggleResource: (resource: SearchResource) => void;
  isToasterOpen: boolean;
  setIsToasterOpen: Dispatch<SetStateAction<boolean>>;
  resetResources: () => void;
}

export interface toasterRightsState {
  creator: boolean;
  contrib: boolean;
  manager: boolean;
  read: boolean;
}
