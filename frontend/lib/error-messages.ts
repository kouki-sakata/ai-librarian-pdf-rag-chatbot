export const ERROR_MESSAGES = {
  UPLOAD: {
    FILE_TOO_LARGE: "ファイルサイズが50MBを超えています",
    INVALID_TYPE: "PDFファイルのみアップロード可能です",
    NETWORK_ERROR: "接続に失敗しました。再試行してください",
    UNAUTHORIZED: "認証が必要です",
    SERVER_ERROR: "サーバーエラーが発生しました。再試行してください",
    GENERIC: "アップロードに失敗しました",
  },
  CHAT: {
    SESSION_INIT_FAILED: "セッションの初期化に失敗しました",
    MESSAGE_SEND_FAILED: "メッセージの送信に失敗しました",
    STREAMING_INTERRUPTED: "応答が中断されました",
    NETWORK_ERROR: "接続に失敗しました。再試行してください",
    UNAUTHORIZED: "認証が必要です",
    SERVER_ERROR: "サーバーエラーが発生しました",
    GENERIC: "エラーが発生しました",
  },
} as const;

export function getUploadErrorMessage(error: unknown): string {
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
    // Return the error message if it's descriptive
    if (error.message.length > 10) return error.message;
  }

  return ERROR_MESSAGES.UPLOAD.GENERIC;
}

export function getChatErrorMessage(
  error: unknown,
  context: "session" | "message" | "stream"
): string {
  if (error instanceof Response) {
    if (error.status === 401) return ERROR_MESSAGES.CHAT.UNAUTHORIZED;
    if (error.status >= 500) return ERROR_MESSAGES.CHAT.SERVER_ERROR;
  }

  if (error instanceof Error) {
    if (error.message.includes("network") || error.message.includes("fetch")) {
      return ERROR_MESSAGES.CHAT.NETWORK_ERROR;
    }
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
