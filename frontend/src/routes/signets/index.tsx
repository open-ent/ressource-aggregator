import { useEffect, useState } from "react";

import { isActionAvailable } from "@edifice.io/client";
import { Alert, Button } from "@edifice.io/react";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import { useTranslation } from "react-i18next";

import { AdminSignet } from "~/components/admin-signet/AdminSignet";
import { EmptyState } from "~/components/empty-state/EmptyState";
import { FilterLayout } from "~/components/filter-layout/FilterLayout";
import { InfiniteScrollList } from "~/components/infinite-scroll-list/InfiniteScrollList";
import { MainLayout } from "~/components/main-layout/MainLayout";
import { ModalContainer } from "~/components/modal-container/ModalContainer";
import { ToasterContainer } from "~/components/toaster-container/ToasterContainer";
import { ModalEnum } from "~/core/enum/modal.enum";
import { useFavorite } from "~/hooks/useFavorite";
import { useSignet } from "~/hooks/useSignet";
import { Resource } from "~/model/Resource.model";
import { Signet } from "~/model/Signet.model";
import { useAlertProvider } from "~/providers/AlertProvider";
import { useModalProvider } from "~/providers/ModalsProvider";
import { usePinProvider } from "~/providers/PinProvider";
import { useToasterProvider } from "~/providers/ToasterProvider";
import { useGetDisciplinesQuery } from "~/services/api/disciplines.service";
import { useGetLevelsQuery } from "~/services/api/levels.service";
import { useActions } from "~/services/queries";
import { sortByAlphabet } from "~/utils/sortResources.util";

import "~/styles/page/signet.scss";
import "~/styles/page/search.scss";

export const SignetPage: React.FC = () => {
  const { t } = useTranslation("mediacentre");
  const { refetchPins } = usePinProvider();
  const { alertType, alertText, setAlertText } = useAlertProvider();
  const { openSpecificModal } = useModalProvider();
  const { selectedTab, setSelectedTab } = useToasterProvider();

  // RIGHTS
  const { data: actions } = useActions();
  const hasSignetRight = isActionAvailable("signets", actions);

  const {
    allSignets,
    myPublishedSignets,
    mine,
    shared,
    archived,
    published,
    refetchSignet,
  } = useSignet();
  const { data: disciplines } = useGetDisciplinesQuery(null);
  const { data: levels } = useGetLevelsQuery(null);
  const [allResourcesDisplayed, setAllResourcesDisplayed] = useState<
    Resource[] | null
  >(null); // all resources after the filters
  const [signetsData, setSignetsData] = useState<Signet[] | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState<boolean>(false);
  const [emptyText, setEmptyText] = useState("mediacentre.empty.state.mine");
  const [emptyImage, setEmptyImage] = useState("empty-state-mine.png");
  const [publishedIsChecked, setPublishedIsChecked] = useState<boolean>(false);
  const { refetchFavorite } = useFavorite();

  const canAccess = () => (hasSignetRight ? "signets" : "search");

  useEffect(() => {
    refetchFavorite();
    setSelectedTab("mediacentre.signets.mine");
    setEmptyText("mediacentre.empty.state.mine");
    setEmptyImage("empty-state-mine.png");
  }, []);

  useEffect(() => {
    if (allSignets) {
      if (hasSignetRight) {
        switch (selectedTab) {
          case "mediacentre.signets.mine":
            setSignetsData(mine(allSignets));
            break;
          case "mediacentre.signets.shared":
            setSignetsData(shared(allSignets));
            break;
          case "mediacentre.signets.published":
            setSignetsData(published(allSignets));
            break;
          case "mediacentre.signets.archived":
            setSignetsData(archived(allSignets));
            break;
          default:
            setSignetsData(allSignets);
        }
      } else {
        setSignetsData(allSignets);
      }
    }
  }, [allSignets, hasSignetRight]);

  useEffect(() => {
    if (signetsData && !initialLoadDone) {
      setInitialLoadDone(true);
      setAllResourcesDisplayed(sortByAlphabet(signetsData));
    }
  }, [signetsData]);

  const chooseEmptyState = (text: string, image: string) => {
    setEmptyText(text);
    setEmptyImage(image);
  };

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
      {canAccess() && (
        <ToasterContainer
          selectedTab={selectedTab}
          levels={levels}
          disciplines={disciplines}
          refetch={refetchSignet}
        />
      )}
      <ModalContainer
        refetchSignet={refetchSignet}
        levels={levels}
        disciplines={disciplines}
        refetchPins={refetchPins}
        chooseEmptyState={chooseEmptyState}
        setAllResourceDisplayed={setAllResourcesDisplayed}
      />
      <div className="med-root-container">
        <div className={`med-${canAccess()}-container`}>
          {hasSignetRight && (
            <div className="med-signets-admin-container">
              <AdminSignet
                signets={allSignets}
                setSignetsData={setSignetsData}
                setAllResourcesDisplayed={setAllResourcesDisplayed}
                chooseEmptyState={chooseEmptyState}
              />
            </div>
          )}
          <div className={`med-${canAccess()}-page-content`}>
            <div className={`med-${canAccess()}-page-header`}>
              <div className={`med-${canAccess()}-page-title`}>
                <BookmarkIcon className={`med-${canAccess()}-icon`} />
                <h1 className={`med-${canAccess()}-title`}>
                  {t("mediacentre.sidebar.signets")}
                </h1>
                {hasSignetRight && (
                  <div className="med-signets-selected-tab">
                    <span>{">"}</span>
                    <p>{t(selectedTab)}</p>
                  </div>
                )}
              </div>
              {hasSignetRight && (
                <Button
                  color="primary"
                  type="button"
                  className="med-signets-create-button"
                  onClick={() => openSpecificModal(ModalEnum.CREATE_SIGNET)}
                >
                  {t("mediacentre.signet.create.button")}
                </Button>
              )}
            </div>
            <div className={`med-${canAccess()}-page-content-body`}>
              {signetsData && !signetsData.length ? (
                <EmptyState image={emptyImage} title={emptyText} size="big" />
              ) : (
                <>
                  <FilterLayout
                    publishedIsChecked={publishedIsChecked}
                    setPublishedIsChecked={setPublishedIsChecked}
                    resources={signetsData}
                    allResourcesDisplayed={allResourcesDisplayed}
                    setAllResourcesDisplayed={setAllResourcesDisplayed}
                    myPublishedSignets={myPublishedSignets}
                  />
                  {allResourcesDisplayed && !allResourcesDisplayed.length ? (
                    <EmptyState title="mediacentre.empty.state.filter" />
                  ) : (
                    <InfiniteScrollList
                      publishedIsChecked={publishedIsChecked}
                      redirectLink="/signets"
                      allResourcesDisplayed={allResourcesDisplayed}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
