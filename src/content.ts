import jsQR from "jsqr";

type ReadQRMessage = { type: "READ_QR"; imageUrl: string };
type ReadQRResponse = { url: string } | { error: string };

chrome.runtime.onMessage.addListener(
  (
    message: ReadQRMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: ReadQRResponse) => void
  ) => {
    if (sender.id !== chrome.runtime.id) return false;
    if (message.type !== "READ_QR") return false;

    readQRFromImage(message.imageUrl)
      .then((url) => sendResponse({ url }))
      .catch((err: Error) => sendResponse({ error: err.message }));

    return true;
  }
);

const MAX_IMAGE_PX = 8192;

async function readQRFromImage(imageUrl: string): Promise<string> {
  const parsed = new URL(imageUrl);
  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("対応していないURLスキームです");
  }

  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`画像の取得に失敗しました: ${response.status}`);

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);

  try {
    const img = await loadImage(blobUrl);

    if (img.naturalWidth > MAX_IMAGE_PX || img.naturalHeight > MAX_IMAGE_PX) {
      throw new Error("画像サイズが大きすぎます");
    }

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas コンテキストの取得に失敗しました");

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const code = jsQR(imageData.data, canvas.width, canvas.height);
    if (!code) throw new Error("QRコードが見つかりませんでした");

    return code.data;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    img.src = src;
  });
}
