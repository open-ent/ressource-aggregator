import React, { useEffect, useState } from "react";

import { Checkbox } from "@edifice.io/react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import { filterByAllDropdowns } from "./utils";
import { DropDown } from "../drop-down/DropDown";
import { useResourceListInfo } from "~/hooks/useResourceListInfo";
import { Resource } from "~/model/Resource.model";
import "./FilterLayout.scss";
import { ResourcesMap } from "~/model/ResourcesMap";
import { Signet } from "~/model/Signet.model";
import { useToasterProvider } from "~/providers/ToasterProvider";

interface FilterLayoutProps {
  publishedIsChecked?: boolean;
  setPublishedIsChecked?: React.Dispatch<React.SetStateAction<boolean>>;
  myPublishedSignets?: Signet[] | null;
  resources: Resource[] | null;
  allResourcesDisplayed: Resource[] | null;
  setAllResourcesDisplayed: React.Dispatch<
    React.SetStateAction<Resource[] | null>
  >;
}

export const FilterLayout: React.FC<FilterLayoutProps> = ({
  publishedIsChecked = null,
  setPublishedIsChecked = () => {},
  myPublishedSignets = null,
  resources,
  allResourcesDisplayed,
  setAllResourcesDisplayed,
}) => {
  const { resourcesMap, resourcesInfosMap, getResourcesMap } =
    useResourceListInfo(resources);
  const { resourcesInfosMap: displayedResourcesInfosMap } = useResourceListInfo(
    allResourcesDisplayed,
  );
  const { selectedTab } = useToasterProvider();

  const page = useLocation().pathname;
  const { t } = useTranslation("mediacentre");

  const [sources, setSources] = useState<string[]>([]);
  const themes = [
    t("mediacentre.signets.themes.orientation"),
    t("mediacentre.signets.without.theme"),
  ];

  const [selectedCheckboxes, setSelectedCheckboxes] = useState({
    sources: [] as string[],
    themes: [] as string[],
    levels: [] as string[],
    types: [] as string[],
    disciplines: [] as string[],
  });

  const setSelectedCheckboxesItems = (key: string) => {
    return (value: string[]) =>
      setSelectedCheckboxes({ ...selectedCheckboxes, [key]: value });
  };

  const SOURCES = {
    MANUALS: t("mediacentre.sidebar.textbooks"),
    RESOURCES: t("mediacentre.sidebar.resources"),
    SIGNETS: t("mediacentre.sidebar.signets"),
    MOODLES: t("mediacentre.search.card.moodle"),
    GLOBAL_RESOURCES: t("mediacentre.resource.globalResources"),
  };

  const THEMES = {
    ORIENTATION: t("mediacentre.signets.themes.orientation"),
    WITHOUT_THEME: t("mediacentre.signets.without.theme"),
  };

  // we show themes only on signets page
  const isShowingThemes = page === "/signets";

  // we show types only if we have resources in displayed resources
  const isShowingTypes = !!displayedResourcesInfosMap.types.length;

  // we show sources only if we are on favorites or search page
  const isShowingSources = page === "/favorites" || page === "/search";

  const isShowingPublished =
    page === "/signets" && selectedTab === "mediacentre.signets.published";

  useEffect(() => {
    let sourcesTemp: string[] = [];
    if (resourcesMap.textbooks.length) {
      sourcesTemp = [...sourcesTemp, SOURCES.MANUALS];
    }
    if (resourcesMap.externalResources.length) {
      sourcesTemp = [...sourcesTemp, SOURCES.RESOURCES];
    }
    if (resourcesMap.signets.length) {
      sourcesTemp = [...sourcesTemp, SOURCES.SIGNETS];
    }
    if (resourcesMap.moodle.length) {
      sourcesTemp = [...sourcesTemp, SOURCES.MOODLES];
    }
    if (resourcesMap.global.length) {
      sourcesTemp = [...sourcesTemp, SOURCES.GLOBAL_RESOURCES];
    }
    setSources(sourcesTemp);
    // reset selected checkboxes when we change the resources
    setSelectedCheckboxes({
      sources: [],
      themes: [],
      levels: [],
      types: [],
      disciplines: [],
    });
    setPublishedIsChecked(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourcesMap]);

  useEffect(() => {
    if (publishedIsChecked && myPublishedSignets) {
      const myPublishedSignetsResult = getResourcesMap(myPublishedSignets);
      const myPublishedSignetsResourceMap: ResourcesMap = {
        textbooks: [],
        externalResources: [],
        moodle: [],
        signets: (myPublishedSignetsResult?.signets as Signet[]) ?? [],
        global: [],
      };
      const filteredResources = filterByAllDropdowns(
        myPublishedSignetsResourceMap,
        selectedCheckboxes,
        SOURCES,
        THEMES,
      );
      if (
        JSON.stringify(filteredResources) !==
        JSON.stringify(allResourcesDisplayed)
      ) {
        setAllResourcesDisplayed(filteredResources);
      }
    } else {
      const filteredResources = filterByAllDropdowns(
        resourcesMap,
        selectedCheckboxes,
        SOURCES,
        THEMES,
      );
      if (
        JSON.stringify(filteredResources) !==
        JSON.stringify(allResourcesDisplayed)
      ) {
        setAllResourcesDisplayed(filteredResources);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedCheckboxes,
    resourcesMap,
    publishedIsChecked,
    myPublishedSignets,
  ]);

  return (
    <>
      <div className="med-filters">
        {isShowingSources && (
          <DropDown
            selectedCheckboxes={selectedCheckboxes.sources}
            setSelectedCheckboxes={setSelectedCheckboxesItems("sources")}
            checkboxOptions={sources ?? []}
            label={t(
              `mediacentre.filter.${sources.length > 1 ? "sources" : "source"}`,
            )}
          />
        )}
        {isShowingTypes && (
          <DropDown
            selectedCheckboxes={selectedCheckboxes.types}
            setSelectedCheckboxes={setSelectedCheckboxesItems("types")}
            checkboxOptions={resourcesInfosMap.types ?? []}
            label={t(
              `mediacentre.filter.${
                resourcesInfosMap.types.length > 1 ? "types" : "type"
              }`,
            )}
          />
        )}
        {isShowingThemes && (
          <DropDown
            selectedCheckboxes={selectedCheckboxes.themes}
            setSelectedCheckboxes={setSelectedCheckboxesItems("themes")}
            checkboxOptions={themes ?? []}
            label={t("mediacentre.filter.themes")}
          />
        )}
        <DropDown
          selectedCheckboxes={selectedCheckboxes.levels}
          setSelectedCheckboxes={setSelectedCheckboxesItems("levels")}
          checkboxOptions={resourcesInfosMap.levels ?? []}
          label={t(
            `mediacentre.filter.${
              resourcesInfosMap.levels.length > 1 ? "levels" : "level"
            }`,
          )}
        />
        <DropDown
          selectedCheckboxes={selectedCheckboxes.disciplines}
          setSelectedCheckboxes={setSelectedCheckboxesItems("disciplines")}
          checkboxOptions={resourcesInfosMap.disciplines ?? []}
          label={t(
            `mediacentre.filter.${
              resourcesInfosMap.disciplines.length > 1
                ? "disciplines"
                : "discipline"
            }`,
          )}
        />
        {isShowingPublished && (
          <div className="med-published-checkbox">
            <Checkbox
              label={t("mediacentre.filter.signets.published")}
              checked={publishedIsChecked ?? false}
              onChange={() => setPublishedIsChecked((isChecked) => !isChecked)}
            />
          </div>
        )}
      </div>
    </>
  );
};
