# QR Reader

画像を右クリックして QR コードを読み取り、デコードした URL を新しいタブで開く Chrome 拡張機能。

ページ上の QR コード画像を、スクリーンショットや別アプリを使わずにその場で読み取れます。

## 使い方

1. ページ内の QR コード画像を**右クリック**する
2. コンテキストメニューから「**QR コードを読み取って開く**」を選ぶ
3. デコードされた URL が新しいタブで開く

`http://` / `https://` 以外のスキームの URL は、安全のため開きません。

## インストール（開発版）

Node.js 20 以上が必要です。

```bash
git clone https://github.com/tksmasaki/qr-reader.git
cd qr-reader
npm install
npm run build
```

1. Chrome で `chrome://extensions/` を開く
2. デベロッパーモードを ON にする
3. 「パッケージ化されていない拡張機能を読み込む」→ `.output/chrome-mv3/` フォルダを選択

## 開発

```bash
npm run dev            # 開発サーバー（HMR 付き、ブラウザ自動起動）
npm run build          # プロダクションビルド → .output/chrome-mv3/
npm run zip            # 配布用 zip を生成
npm run typecheck      # 型チェック
npm test               # ユニットテスト
npm run generate-icons # アイコンを再生成（sharp で SVG → PNG）
```

## アーキテクチャ

- **Service worker**（[entrypoints/background.ts](entrypoints/background.ts)）— `image` コンテキストにメニューを登録し、クリックされた画像 URL をコンテンツスクリプトへ送信。返ってきた URL が `http(s)` であれば新しいタブで開く。
- **Content script**（[entrypoints/content.ts](entrypoints/content.ts)）— 画像を `fetch` し、Canvas に描画して [jsQR](https://github.com/cozmo/jsQR) でデコードする。

## 技術スタック

- TypeScript
- [WXT](https://wxt.dev/)（Vite ベースの拡張機能フレームワーク）
- [jsQR](https://github.com/cozmo/jsQR)（QR コードデコード）
- Manifest V3

## 権限

- `contextMenus` — 画像の右クリックメニューを追加
- `tabs` — デコードした URL を新しいタブで開く
- `host_permissions: ["<all_urls>"]` — 任意のページ上の画像を取得・解析

## 安全性

- **URL スキーム検証** — デコード結果が `http://` / `https://` の場合のみタブを開く
- **送信元の検証** — `sender.id` を拡張機能自身の ID と照合し、外部からのメッセージを拒否
- **画像サイズ制限** — 8192 × 8192 px を超える画像は処理しない
- **メモリ解放** — 取得した画像の Object URL は処理後に必ず `revokeObjectURL` で解放

## ライセンス

ISC
