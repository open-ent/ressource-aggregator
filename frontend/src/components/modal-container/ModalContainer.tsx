import React from "react";

import { CreatePins } from "~/components/modals/create-pins/CreatePins";
import { CreateSignet } from "~/components/modals/create-signet/CreateSignet";
import { SignetArchive } from "~/components/modals/signet-archive/SignetArchive";
import { SignetDelete } from "~/components/modals/signet-delete/SignetDelete";
import { SignetProperty } from "~/components/modals/signet-property/SignetProperty";
import { SignetPropertyView } from "~/components/modals/signet-property-view/SignetPropertyView";
import { SignetPublish } from "~/components/modals/signet-publish/SignetPublish";
import { ModalEnum } from "~/core/enum/modal.enum";
import { useModalProvider } from "~/providers/ModalsProvider";

interface ModalContainerProps {
  refetchSignet: () => void;
  refetchPins: () => void;
  levels: { id: string; label: string }[];
  disciplines: { id: string; label: string }[];
}

export const ModalContainer: React.FC<ModalContainerProps> = ({
  refetchSignet = () => {},
  refetchPins = () => {},
  levels,
  disciplines,
}) => {
  const { openModal } = useModalProvider();
  return (
    <div>
      {openModal === ModalEnum.PUBLISH_SIGNET && (
        <SignetPublish
          refetch={refetchSignet}
          levels={levels}
          disciplines={disciplines}
        />
      )}
      {openModal === ModalEnum.PROPERTY_SIGNET && (
        <SignetProperty
          refetch={refetchSignet}
          levels={levels}
          disciplines={disciplines}
        />
      )}
      {openModal === ModalEnum.ARCHIVE_SIGNET && (
        <SignetArchive
          refetch={refetchSignet}
          levels={levels}
          disciplines={disciplines}
        />
      )}
      {openModal === ModalEnum.DELETE_SIGNET && (
        <SignetDelete refetch={refetchSignet} />
      )}
      {openModal === ModalEnum.CREATE_PIN && (
        <CreatePins refetch={refetchPins} />
      )}
      {openModal === ModalEnum.CREATE_SIGNET && (
        <CreateSignet
          refetch={refetchSignet}
          levels={levels}
          disciplines={disciplines}
        />
      )}
      {openModal === ModalEnum.PROPERTY_VIEW_SIGNET && <SignetPropertyView />}
    </div>
  );
};
