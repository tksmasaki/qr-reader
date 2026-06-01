# 手動 QA

QR デコードはブラウザの DOM / Chrome API に依存し、CI のユニットテストでは検証できません
（スキーム検証など純粋なロジックは [`lib/url.test.ts`](../lib/url.ts) がカバーしています）。
このディレクトリは、実ブラウザで拡張の挙動を目視確認するための**手動 QA 用フィクスチャ**です。

## `manual-qa.html`

各ケースの QR 画像を 1 ページに並べた確認用ページ。各画像を右クリックして
「QRコードを読み取って開く」を実行し、通知と開かれるタブを確認します。

| # | ケース | 期待 |
|---|--------|------|
| 1 | `data:` の QR | タブで開く + 通知 |
| 2 | `blob:` の QR（本命） | タブで開く + 通知 |
| 3 | 別ドメイン(CDN)のリモート QR | 開く（CORS 次第・要ネットワーク） |
| 4 | QR でない画像 | 「QRコードが見つかりませんでした」通知 |
| 5 | 危険スキーム（`WIFI:`） | 「安全でない URL のため開きませんでした」通知 |
| 6 | 危険スキーム（`javascript:`） | 同上（実行されない） |

### 使い方

```sh
npm run build   # .output/chrome-mv3/ を生成し、chrome://extensions で読み込む
python3 -m http.server   # リポジトリ直下で実行
# → http://localhost:8000/test/manual-qa.html を開く
```

`file://` で開く場合は、`chrome://extensions` で本拡張の「ファイルの URL へのアクセスを許可する」を ON に。
`chrome://` などの特権ページでは `activeTab` 注入ができないため読み取れません（仕様）。

### QR フィクスチャの再生成

埋め込みの QR 画像は [`qrcode-generator`](https://www.npmjs.com/package/qrcode-generator)
で事前生成した `data:` URI です。内容を変えたい場合は次のように再生成します。

```sh
npm i qrcode-generator
node -e '
  const qrcode = require("qrcode-generator");
  const gen = (d) => { const q = qrcode(0, "M"); q.addData(d); q.make(); return q.createDataURL(6, 16); };
  console.log(gen("https://example.com/from-qr"));
'
```

得られた `data:image/gif;base64,...` を `manual-qa.html` の対応する `<img src>` に貼り替えます。
