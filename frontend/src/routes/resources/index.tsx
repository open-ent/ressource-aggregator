import React, { useEffect, useState } from "react";

import { Alert, useUser } from "@edifice.io/react";
import LaptopIcon from "@mui/icons-material/Laptop";
import { useTranslation } from "react-i18next";

import { EmptyState } from "~/components/empty-state/EmptyState";
import { FilterLayout } from "~/components/filter-layout/FilterLayout";
import { InfiniteScrollList } from "~/components/infinite-scroll-list/InfiniteScrollList";
import { MainLayout } from "~/components/main-layout/MainLayout";
import { CreatePins } from "~/components/modals/create-pins/CreatePins";
import { ModalEnum } from "~/core/enum/modal.enum";
import { useExternalResource } from "~/hooks/useExternalResource";
import { useGlobal } from "~/hooks/useGlobal";
import { Resource } from "~/model/Resource.model";
import { useAlertProvider } from "~/providers/AlertProvider";
import { useModalProvider } from "~/providers/ModalsProvider";
import "~/styles/page/search.scss";
import { sortByAlphabet } from "~/utils/sortResources.util";
import { useSelectedStructureProvider } from "~/providers/SelectedStructureProvider";

export const ResourcePage: React.FC = () => {
  const { user } = useUser();
  const { t } = useTranslation("mediacentre");
  const { alertType, alertText, setAlertText } = useAlertProvider();
  const { openModal } = useModalProvider();
  const { idSelectedStructure } = useSelectedStructureProvider();

  const { globals } = useGlobal();
  const { externalResources } = useExternalResource(idSelectedStructure);

  const [externalResourcesData, setExternalResourcesData] = useState<
    Resource[] | null
  >(null);

  const [allResourcesDisplayed, setAllResourcesDisplayed] = useState<
    Resource[] | null
  >(null); // all resources after the filters

  useEffect(() => {
    if (user?.type === "PERSRELELEVE") {
      if (globals) {
        setExternalResourcesData(globals);
      }
    } else {
      setExternalResourcesData(externalResources);
    }
  }, [user, externalResources, globals]);

  useEffect(() => {
    if (externalResourcesData) {
      setAllResourcesDisplayed(sortByAlphabet(externalResourcesData));
    }
  }, [externalResourcesData]);

  return (
    <>
      <MainLayout />
      {alertText !== "" && (
        <Alert
          autoClose
          autoCloseDelay={3000}
          isDismissible={false}
          isToast
          onClose={() => setAlertText("")}
          position="top-right"
          type={alertType}
          className="med-alert"
        >
          {alertText}
        </Alert>
      )}
      {openModal === ModalEnum.CREATE_PIN && <CreatePins />}
      <div className="med-search-container">
        <div className="med-search-page-content">
          <div className="med-search-page-header">
            <div className="med-search-page-title">
              <LaptopIcon className="med-search-icon" />
              <h1 className="med-search-title">
                {t("mediacentre.sidebar.resources")}
              </h1>
            </div>
          </div>
          <div className="med-search-page-content-body">
            {externalResourcesData && !externalResourcesData.length ? (
              <EmptyState
                image="empty-state.png"
                title="mediacentre.empty.state.resources"
              />
            ) : (
              <>
                <FilterLayout
                  resources={externalResourcesData}
                  allResourcesDisplayed={allResourcesDisplayed}
                  setAllResourcesDisplayed={setAllResourcesDisplayed}
                />
                {allResourcesDisplayed && !allResourcesDisplayed.length ? (
                  <EmptyState title="mediacentre.empty.state.filter" />
                ) : (
                  <InfiniteScrollList
                    redirectLink="/resources"
                    allResourcesDisplayed={allResourcesDisplayed}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
