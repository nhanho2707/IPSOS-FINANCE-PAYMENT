import { useCallback, useRef, useState } from "react";
import { ConfirmDialogTone } from "../components/Dialogs/ConfirmDialog";

interface DialogOptions {
  title?: string;
  message?: string;
  onConfirm?: () => void | Promise<unknown>;
  onClose?: () => void;
  showConfirmButton?: boolean;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmDialogTone;
}

const DEFAULT_TITLE = "Xác nhận hành động";
const DEFAULT_MESSAGE = "Bạn có chắc chắn muốn thực hiện thao tác này?";

const useDialog = () => {
  const [open, setOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [options, setOptions] = useState<DialogOptions>({});
  // Callbacks live in a ref and are consumed once: an onClose handler that itself calls
  // closeDialog() (Gifts, ParttimeEmployees) would otherwise recurse forever.
  const callbacksRef = useRef<Pick<DialogOptions, "onConfirm" | "onClose">>({});

  const openDialog = useCallback((next: DialogOptions = {}): void => {
    callbacksRef.current = { onConfirm: next.onConfirm, onClose: next.onClose };
    setOptions({ showConfirmButton: false, ...next });
    setLoading(false);
    setOpen(true);
  }, []);

  const takeCallbacks = () => {
    const callbacks = callbacksRef.current;
    callbacksRef.current = {};
    return callbacks;
  };

  const closeDialog = useCallback((): void => {
    const { onClose } = takeCallbacks();
    setOpen(false);
    onClose?.();
  }, []);

  const confirmDialog = useCallback(async (): Promise<void> => {
    const { onConfirm } = takeCallbacks();
    const result = onConfirm?.();

    if (result instanceof Promise) {
      setLoading(true);
      try {
        await result;
      } finally {
        setLoading(false);
      }
    }

    setOpen(false);
  }, []);

  const title = options.title || DEFAULT_TITLE;
  const message = options.message || DEFAULT_MESSAGE;
  const showConfirmButton = options.showConfirmButton || false;

  return {
    open,
    title,
    message,
    showConfirmButton,
    setOpen,
    openDialog,
    closeDialog,
    confirmDialog,
    dialogProps: {
      open,
      title,
      message,
      showConfirmButton,
      confirmText: options.confirmText,
      cancelText: options.cancelText,
      tone: options.tone,
      loading,
      onClose: closeDialog,
      onConfirm: confirmDialog,
    },
  };
};

export default useDialog;
