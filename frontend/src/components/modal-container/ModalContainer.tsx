import React from "react";

import { CreatePins } from "~/components/modals/create-pins/CreatePins";
import { CreateSignet } from "~/components/modals/create-signet/CreateSignet";
import { SignetArchive } from "~/components/modals/signet-archive/SignetArchive";
import { SignetDelete } from "~/components/modals/signet-delete/SignetDelete";
import { SignetDeletePublish } from "~/components/modals/signet-delete-publish/SignetDeletePublish";
import { SignetProperty } from "~/components/modals/signet-property/SignetProperty";
import { SignetPropertyView } from "~/components/modals/signet-property-view/SignetPropertyView";
import { SignetPublish } from "~/components/modals/signet-publish/SignetPublish";
import { ModalEnum } from "~/core/enum/modal.enum";
import { useModalProvider } from "~/providers/ModalsProvider";

interface ModalContainerProps {
  levels: { id: string; label: string }[];
  disciplines: { id: string; label: string }[];
  chooseEmptyState: (text: string, image: string) => void;
  setAllResourceDisplayed: (resources: any) => void;
}

export const ModalContainer: React.FC<ModalContainerProps> = ({
  levels,
  disciplines,
  chooseEmptyState = () => {},
  setAllResourceDisplayed = () => {},
}) => {
  const { openModal } = useModalProvider();
  return (
    <div>
      {openModal === ModalEnum.PUBLISH_SIGNET && (
        <SignetPublish levels={levels} disciplines={disciplines} />
      )}
      {openModal === ModalEnum.PROPERTY_SIGNET && (
        <SignetProperty levels={levels} disciplines={disciplines} />
      )}
      {openModal === ModalEnum.ARCHIVE_SIGNET && (
        <SignetArchive levels={levels} disciplines={disciplines} />
      )}
      {openModal === ModalEnum.DELETE_SIGNET && <SignetDelete />}
      {openModal === ModalEnum.CREATE_PIN && <CreatePins />}
      {openModal === ModalEnum.CREATE_SIGNET && (
        <CreateSignet
          levels={levels}
          disciplines={disciplines}
          chooseEmptyState={chooseEmptyState}
          setAllResourcesDisplayed={setAllResourceDisplayed}
        />
      )}
      {openModal === ModalEnum.PROPERTY_VIEW_SIGNET && <SignetPropertyView />}
      {openModal === ModalEnum.DELETE_SIGNET_PUBLISHED && (
        <SignetDeletePublish />
      )}
    </div>
  );
};
