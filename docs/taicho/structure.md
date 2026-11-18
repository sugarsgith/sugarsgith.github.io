# 体調ログのファイル

体調ログはビルド無しの静的 PWA です。本番は GitHub Pages が `main` の `taicho/` を <https://sugarsgith.github.io/taicho/> で配信します。スロットセンスのメニューには出ていません。

ルールは `taicho/AGENTS.md`、記録の形は `docs/taicho/data.md`、確認と公開は `docs/taicho/maintenance.md`、コードに残っている未使用は `docs/taicho/backlog.md` です。

説明用の Markdown は、この `docs/taicho/` に置きます。Service Worker のスコープは `/taicho/` で、その配下の GET は `taicho/sw.js` がネットワーク優先で扱います。アプリの隣に `taicho/docs/` を作ると、そのファイルもそのスコープに入ります。SLOTSENSE の引き継ぎ文書がルートの `docs/` にあるのと同じ置き方にしています。例外は `taicho/AGENTS.md` の 1 枚です。画面からはリンクしていません。

## 本番（`main` の `taicho/`）

| パス | 役割 |
| --- | --- |
| `taicho/index.html` | 画面、CSS、記録の JS。タイトルは「体調ログ（テスト版）」、見出しの下は「テスト版 v3」。データの `v` は 2 で、この表示用の版とは別 |
| `taicho/manifest.webmanifest` | 名前「体調ログ」。`start_url` と `scope` は `/taicho/`。`display` は `standalone` |
| `taicho/sw.js` | スコープ `/taicho/`。キャッシュ名 `taicho-v1`（2026-11-18 の `main`） |
| `taicho/icons/` | `icon-192.png`、`icon-512.png`、`icon-512-maskable.png`、`apple-touch-icon.png`。SLOTSENSE の `icons/` とは別ファイル |
| `taicho/AGENTS.md` | このアプリを直す AI 向けのルール |

登録は `index.html` の中です。マニフェストは `/taicho/manifest.webmanifest`、Service Worker は `/taicho/sw.js` を `scope: '/taicho/'` で登録します。ホーム画面用の `apple-mobile-web-app-capable` と `apple-mobile-web-app-title`（体調ログ）があります。

`sw.js` はネットワーク優先です。オフラインのとき、同じパスのキャッシュか、ナビゲーションなら `/taicho/` を返します。`activate` は、名前が `taicho-` で始まり、今の `CACHE` ではないキャッシュを消します。`slotsense-` には触れません。

## 画面にあるもの

CSS と JS は `index.html` の中だけです。外部の JS ファイルはありません。

- 記録 … 月のカレンダー、朝 / 夜 / 気づいた時、気分、エネルギー、朝だけの睡眠、できたこと、薬、副作用、ひとこと、その枠の削除、気づいた時の一覧、薬の変更、直近の日付 30 日分の診察用コピー、書き出しと取り込み。
- まとめ … 1 週間から 1 年。気分の波（分けて表示 / 重ねて表示）、睡眠、できたこと、飲んだ薬、薬の変更の前後 2 週間、副作用とひとこと。
- ページ末尾の注記 … 診断や判定はしない。データはこの端末のブラウザ内に保存される。

`chart` 関数は、存在しない `#chart` を書き、どこからも呼ばれていません。まとめのグラフは `renderSum` です。`docs/taicho/backlog.md` に残しています。

## スロットセンスとの境界

| | 体調ログ | SLOTSENSE |
| --- | --- | --- |
| パス | `/taicho/` | `/` と機種フォルダ |
| Service Worker | `/taicho/sw.js` | `/sw.js` |
| キャッシュ | `taicho-vN` | `slotsense-vN` |
| マニフェスト | `taicho/manifest.webmanifest` | `manifest.webmanifest` |
| 保存 | `taicho-log-v2` ほか | `slotmemo:v1:*` と `slotsense:sessions:v1` |
| メニュー | 出さない | ルート `index.html` の `a.m` |

ルートの `sw.js` の `PRECACHE` に `/taicho/` はありません。体調ログの `PRECACHE` は `/taicho/` 以下だけです。

## テスト環境

`main` に `taicho/test/` はありません。テスト用のファイルはブランチ `fix/taicho-data-protection` にあります（2026-11-18 時点。このブランチは `main` にマージされていません）。

| | 場所 |
| --- | --- |
| ブランチ | `fix/taicho-data-protection` |
| アプリのソース | そのブランチの `taicho/index.html`、`taicho/sw.js`、`taicho/manifest.webmanifest`、`taicho/icons/` |
| ビルド | `taicho/build-preview.cjs`。このファイルは `main` には無い |
| 出力 | リポジトリルートの `taicho-preview-dist/taicho/`。同じブランチの `.gitignore` が `/taicho-preview-dist/` を無視する。`main` に `.gitignore` は無い |
| 配信パス | 出力先ホスト上の `/taicho/` |
| 本番 URL | <https://sugarsgith.github.io/taicho/> |

`build-preview.cjs` の先頭コメントが、Cloudflare Pages の設定として次を書いています。ルートはリポジトリルート、コマンドは `node taicho/build-preview.cjs`、出力ディレクトリは `taicho-preview-dist`。コピーするのは上のアプリファイルだけです。加えて、出力先に `404.html` と `_headers`（`X-Robots-Tag: noindex, nofollow` と、`sw.js` の `Cache-Control: no-cache`）を書き出します。

公開ホスト名は、スクリプト、コミット、PR #1 と PR #2 の本文のどこにもありません。PR は「Cloudflareテスト環境」で iPhone の確認をした、とだけ書いています。`wrangler.toml` のような設定ファイルも履歴にありません。どの Git ブランチを Cloudflare が追うかは、リポジトリからは断定できません。スクリプトを持っているブランチは `fix/taicho-data-protection` だけです。

ビルドがソースから変えるのは次だけです。

- `h1` を「体調ログ テスト」にし、その直後に「テスト環境・架空データ専用。本番のバックアップは取り込まないでください。」を足す。
- `apple-mobile-web-app-title` と、マニフェストの `name` と `short_name` を「体調ログ テスト」にする。

`<title>` は置換しません。テスト画面のタブ名も、本番と同じ「体調ログ（テスト版）」のままです。保存キー、Service Worker のスコープ、キャッシュ名、`start_url` は置換しません。

### 本番のソースとの差（2026-11-18）

`sw.js` と `manifest.webmanifest` のソースは、`main` とテストブランチで同じです。キャッシュ名は両方 `taicho-v1` です。

`index.html` は、テストブランチの方が新しいです。コミット `f8cff53`（睡眠のまとめの文言、軸、◆の色）が `main` に無く、その前の中途覚醒の対応は本番にも入っています（PR #2）。テストブランチはこの表示を変えたあと、`CACHE` を上げていません。

### データが混ざる条件

ブラウザの `localStorage`、Cache Storage、Service Worker はオリジンごとです。Cloudflare のホストと `sugarsgith.github.io` が別オリジンである間は、キーの文字列が同じでも記録は混ざりません。テスト用 iPhone から本番の記録は読めません。

ソースはキーを分けていません。次は、同じオリジンで両方を開いたときのリスクです。コードは変えていません。

- 保存キーは両方 `taicho-log-v2`、`taicho-log-v1`、`taicho-ov` です。`localStorage` はオリジン単位で、パスでは分かれません。同じホストの別パスにテストを置いても、本番の記録を読み、次の保存で上書きします。
- Service Worker のスコープは両方 `/taicho/`、キャッシュ名も同じ `taicho-vN` です。`activate` は、そのオリジンのキャッシュ一覧から、`taicho-` で始まる他の名前を消します。別パスのワーカーでも、起動すれば本番の `taicho-` キャッシュを消します。名前を `taicho-test-vN` にしても、接頭辞が `taicho-` なので、本番の `activate` がそれを消します。
- マニフェストの `scope` と `start_url` も、ビルド前は `/taicho/` のままです。ビルドは表示名だけを変えます。
- 「取り込む」は、形式が合えば本番の書き出しもテストの書き出しも受けます。画面の注意は、ビルドが足す段落だけです。コードは本番の文字列を拒否しません。テストで作った記録を本番へ取り込むと、朝と夜は同じ id で、`updatedAt` が新しい方が残ります。

テスト用の生成物を `sugarsgith.github.io` に置かないでください。本番のバックアップをテストへ取り込まないでください。
