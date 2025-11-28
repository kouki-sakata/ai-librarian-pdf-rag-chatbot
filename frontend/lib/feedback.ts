import { toast } from "sonner";
import type { ErrorDetail } from "./error-messages";

export interface FeedbackOptions {
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * 統一されたフィードバックAPI
 * Toast通知を一貫した方法で表示します
 */

export function showSuccess(options: FeedbackOptions) {
  toast.success(options.title, {
    description: options.description,
    duration: options.duration ?? 3000,
    action: options.action
      ? {
          label: options.action.label,
          onClick: options.action.onClick,
        }
      : undefined,
  });
}

export function showError(error: ErrorDetail | FeedbackOptions) {
  const isErrorDetail = "canRetry" in error;

  if (isErrorDetail) {
    toast.error(error.title, {
      description: error.description,
      duration: 4000,
      action: error.action
        ? {
            label: error.action,
            onClick: () => {
              // Action handled by caller
            },
          }
        : undefined,
    });
  } else {
    toast.error(error.title, {
      description: error.description,
      duration: error.duration ?? 4000,
      action: error.action
        ? {
            label: error.action.label,
            onClick: error.action.onClick,
          }
        : undefined,
    });
  }
}

export function showWarning(options: FeedbackOptions) {
  toast.warning(options.title, {
    description: options.description,
    duration: options.duration ?? 3500,
    action: options.action
      ? {
          label: options.action.label,
          onClick: options.action.onClick,
        }
      : undefined,
  });
}

export function showInfo(options: FeedbackOptions) {
  toast.info(options.title, {
    description: options.description,
    duration: options.duration ?? 3000,
    action: options.action
      ? {
          label: options.action.label,
          onClick: options.action.onClick,
        }
      : undefined,
  });
}

export function showLoading(options: Omit<FeedbackOptions, "action">) {
  return toast.loading(options.title, {
    description: options.description,
  });
}

export function dismissToast(toastId: string | number) {
  toast.dismiss(toastId);
}

/**
 * 進行状況付きToastのヘルパー
 */
export function showProgress(options: {
  title: string;
  description?: string;
  onDismiss?: () => void;
}) {
  const toastId = toast.loading(options.title, {
    description: options.description,
  });

  return {
    update: (newDescription: string) => {
      toast.loading(options.title, {
        id: toastId,
        description: newDescription,
      });
    },
    success: (message: string) => {
      toast.success(options.title, {
        id: toastId,
        description: message,
        duration: 3000,
      });
    },
    error: (message: string) => {
      toast.error(options.title, {
        id: toastId,
        description: message,
        duration: 4000,
      });
    },
    dismiss: () => {
      toast.dismiss(toastId);
      options.onDismiss?.();
    },
  };
}
