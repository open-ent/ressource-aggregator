import { FunctionComponent } from "react";

import {
  useEdificeClient,
  ShareModal,
  EdificeClientProvider,
} from "@edifice.io/react";

import { ModalEnum } from "~/core/enum/modal.enum";
import { useModalProvider } from "~/providers/ModalsProvider";

type ShareResourceModalProps = {
  shareOptions: {
    resourceId: string;
    resourceRights: string[];
    resourceCreatorId: string;
  };
  onClose: () => void;
};

export const ShareModalMediacentre: FunctionComponent<
  ShareResourceModalProps
> = ({ shareOptions, onClose }: ShareResourceModalProps) => {
  const { appCode } = useEdificeClient();
  const { openModal, closeAllModals } = useModalProvider();
  const handleShareClose = (): void => {
    onClose();
    closeAllModals();
  };

  const handleShareSuccess = (): void => {
    onClose();
    closeAllModals();
  };

  if (openModal !== ModalEnum.SHARE_MODAL) {
    return null;
  }

  const formatAppPath = `${appCode}`;
  return (
    <>
      <EdificeClientProvider
        params={{
          app: formatAppPath,
        }}
      >
        <ShareModal
          isOpen={true}
          shareOptions={shareOptions}
          onCancel={handleShareClose}
          onSuccess={handleShareSuccess}
        />
      </EdificeClientProvider>
    </>
  );
};
