// 読み取り対象として fetch を許可する画像 URL のスキーム。
// data: / blob: はページに埋め込まれた画像（拡張自身のコンテキスト由来）なので安全に扱える。
const ALLOWED_IMAGE_SCHEMES = ["http:", "https:", "data:", "blob:"];

// デコード結果として新しいタブで開いてよい URL のスキーム。
// javascript: / data: / file: 等を弾き、ナビゲーションを http(s) に限定する。
const OPENABLE_SCHEMES = ["http:", "https:"];

function schemeOf(url: string): string | null {
  try {
    return new URL(url).protocol;
  } catch {
    return null;
  }
}

/** 画像の取得元として許可されたスキームか（http/https/data/blob）。 */
export function isAllowedImageScheme(url: string): boolean {
  const scheme = schemeOf(url);
  return scheme !== null && ALLOWED_IMAGE_SCHEMES.includes(scheme);
}

/** デコード結果を新しいタブで開いてよい URL か（http/https のみ）。 */
export function isOpenableUrl(url: string): boolean {
  const scheme = schemeOf(url);
  return scheme !== null && OPENABLE_SCHEMES.includes(scheme);
}
