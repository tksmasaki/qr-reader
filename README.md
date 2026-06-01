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

常駐するコンテンツスクリプトは持たず、右クリック時だけ `activeTab` でその場のタブに最小限のコードを注入する設計です。

- **Service worker**（[entrypoints/background.ts](entrypoints/background.ts)）— `image` コンテキストにメニューを登録。クリックされたら `chrome.scripting.executeScript` でアクティブタブにピクセル取得関数を注入し、返ってきたピクセルデータを [jsQR](https://github.com/cozmo/jsQR) でデコード。結果が `http(s)` であれば新しいタブで開く。jsQR は背景側に一度だけ読み込まれ、ページには注入されない。
- **注入される関数** — 画像を `fetch` して Canvas に描画し、ピクセルデータ（長辺 2048px まで縮小）を返すだけ。`import` を持たない自己完結コードで、ページコンテキストで実行されるため `blob:` / `data:` 画像も読める。

### `<all_urls>` を使わない理由

旧構成は QR デコード用ライブラリ（約 135KB）を含むコンテンツスクリプトを全ページに常時注入し、`host_permissions: ["<all_urls>"]` を要求していました。実際に必要なのは右クリックした瞬間だけなので、`activeTab` + オンデマンド注入に変更し、全サイトへの永続アクセス権を不要にしています。

## 技術スタック

- TypeScript
- [WXT](https://wxt.dev/)（Vite ベースの拡張機能フレームワーク）
- [jsQR](https://github.com/cozmo/jsQR)（QR コードデコード）
- Manifest V3

## 権限

- `contextMenus` — 画像の右クリックメニューを追加
- `scripting` + `activeTab` — 右クリックしたタブにだけ、その操作を起点に一時的にコードを注入（全サイトへの永続権限は不要）
- `notifications` — 読み取り結果・失敗をユーザーに通知する

## 安全性

- **最小権限** — `<all_urls>` / `host_permissions` を要求せず、`activeTab` でユーザー操作時のみ対象タブへアクセス
- **画像 URL スキーム検証** — 注入前に `http` / `https` / `data` / `blob` 以外の画像 URL を拒否
- **開く URL のスキーム検証** — デコード結果が `http://` / `https://` の場合のみタブを開く（`javascript:` / `data:` / `file:` 等は拒否）
- **開く URL の可視化** — タブを開く際にデコード結果の URL を通知で提示し、失敗時も無言にせず通知する
- **メモリ解放** — 取得した画像の Object URL は処理後に必ず `revokeObjectURL` で解放

## ライセンス

MIT
