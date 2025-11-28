export interface ErrorDetail {
  title: string;
  description: string;
  action?: string;
  canRetry: boolean;
}

export const ERROR_MESSAGES = {
  UPLOAD: {
    FILE_TOO_LARGE: {
      title: "ファイルサイズが大きすぎます",
      description: "ファイルサイズが50MBを超えています。50MB以下のPDFファイルをお選びください。",
      action: "別のファイルを選択",
      canRetry: true,
    },
    INVALID_TYPE: {
      title: "無効なファイル形式です",
      description: "PDFファイルのみアップロード可能です。ファイル形式を確認してください。",
      action: "PDFファイルを選択",
      canRetry: true,
    },
    NETWORK_ERROR: {
      title: "接続に失敗しました",
      description:
        "ネットワーク接続を確認してください。接続が安定しない場合は、しばらくしてからもう一度お試しください。",
      action: "再試行",
      canRetry: true,
    },
    UNAUTHORIZED: {
      title: "認証が必要です",
      description: "ファイルをアップロードするにはログインが必要です。",
      action: "ログイン",
      canRetry: false,
    },
    SERVER_ERROR: {
      title: "サーバーエラーが発生しました",
      description: "一時的な問題が発生しています。しばらくしてからもう一度お試しください。",
      action: "再試行",
      canRetry: true,
    },
    TIMEOUT: {
      title: "アップロードがタイムアウトしました",
      description:
        "アップロードに時間がかかりすぎています（2分）。ファイルサイズを確認するか、ネットワーク接続を改善してもう一度お試しください。",
      action: "再試行",
      canRetry: true,
    },
    GENERIC: {
      title: "アップロードに失敗しました",
      description: "予期しないエラーが発生しました。もう一度お試しください。",
      action: "再試行",
      canRetry: true,
    },
  },
  CHAT: {
    SESSION_INIT_FAILED: {
      title: "チャットを開始できませんでした",
      description:
        "サーバーとの接続に問題がありました。ページを再読み込みするか、しばらくしてからもう一度お試しください。",
      action: "再試行",
      canRetry: true,
    },
    MESSAGE_SEND_FAILED: {
      title: "メッセージを送信できませんでした",
      description:
        "ネットワーク接続を確認してください。接続が安定しない場合は、しばらくしてからもう一度お試しください。",
      action: "再送信",
      canRetry: true,
    },
    STREAMING_INTERRUPTED: {
      title: "応答が中断されました",
      description: "AIの応答中に接続が切れました。もう一度質問してください。",
      action: "再送信",
      canRetry: true,
    },
    NETWORK_ERROR: {
      title: "接続に失敗しました",
      description:
        "ネットワーク接続を確認してください。接続が安定しない場合は、しばらくしてからもう一度お試しください。",
      action: "再試行",
      canRetry: true,
    },
    TIMEOUT: {
      title: "リクエストがタイムアウトしました",
      description: "応答に時間がかかりすぎています（30秒）。もう一度お試しください。",
      action: "再送信",
      canRetry: true,
    },
    UNAUTHORIZED: {
      title: "認証が必要です",
      description: "セッションの有効期限が切れています。ページを再読み込みしてください。",
      action: "再読み込み",
      canRetry: false,
    },
    SERVER_ERROR: {
      title: "サーバーエラーが発生しました",
      description: "一時的な問題が発生しています。しばらくしてからもう一度お試しください。",
      action: "再試行",
      canRetry: true,
    },
    GENERIC: {
      title: "エラーが発生しました",
      description: "予期しないエラーが発生しました。もう一度お試しください。",
      action: "再試行",
      canRetry: true,
    },
  },
} as const;

export function getUploadError(error: unknown): ErrorDetail {
  if (error instanceof Response) {
    if (error.status === 413) return ERROR_MESSAGES.UPLOAD.FILE_TOO_LARGE;
    if (error.status === 400) return ERROR_MESSAGES.UPLOAD.INVALID_TYPE;
    if (error.status === 401) return ERROR_MESSAGES.UPLOAD.UNAUTHORIZED;
    if (error.status >= 500) return ERROR_MESSAGES.UPLOAD.SERVER_ERROR;
  }

  if (error instanceof Error) {
    if (error.message.includes("network") || error.message.includes("fetch")) {
      return ERROR_MESSAGES.UPLOAD.NETWORK_ERROR;
    }
    if (error.message.includes("timeout") || error.message.includes("タイムアウト")) {
      return ERROR_MESSAGES.UPLOAD.TIMEOUT;
    }
    // Return custom error if it's descriptive
    if (error.message.length > 10) {
      return {
        title: "アップロードエラー",
        description: error.message,
        action: "再試行",
        canRetry: true,
      };
    }
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return ERROR_MESSAGES.UPLOAD.TIMEOUT;
  }

  return ERROR_MESSAGES.UPLOAD.GENERIC;
}

export function getChatError(
  error: unknown,
  context: "session" | "message" | "stream"
): ErrorDetail {
  if (error instanceof Response) {
    if (error.status === 401) return ERROR_MESSAGES.CHAT.UNAUTHORIZED;
    if (error.status >= 500) return ERROR_MESSAGES.CHAT.SERVER_ERROR;
  }

  if (error instanceof Error) {
    if (error.message.includes("network") || error.message.includes("fetch")) {
      return ERROR_MESSAGES.CHAT.NETWORK_ERROR;
    }
    if (error.message.includes("timeout") || error.message.includes("タイムアウト")) {
      return ERROR_MESSAGES.CHAT.TIMEOUT;
    }
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return ERROR_MESSAGES.CHAT.TIMEOUT;
  }

  switch (context) {
    case "session":
      return ERROR_MESSAGES.CHAT.SESSION_INIT_FAILED;
    case "stream":
      return ERROR_MESSAGES.CHAT.STREAMING_INTERRUPTED;
    default:
      return ERROR_MESSAGES.CHAT.MESSAGE_SEND_FAILED;
  }
}

// Backward compatibility - deprecated, use getUploadError instead
export function getUploadErrorMessage(error: unknown): string {
  return getUploadError(error).description;
}

// Backward compatibility - deprecated, use getChatError instead
export function getChatErrorMessage(
  error: unknown,
  context: "session" | "message" | "stream"
): string {
  return getChatError(error, context).description;
}
