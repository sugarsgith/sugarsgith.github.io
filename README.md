# スロットセンス（SLOTSENSE）

パチスロの実戦メモです。設定の目安、示唆の記録、天井・ゾーンの狙い目判定を、iPhone の Safari で使います。データはこの端末のブラウザ内に保存されます。

公開 URL: <https://sugarsgith.github.io>

静的な HTML です。ビルドはありません。GitHub Pages が `main` ブランチのルートを配信します。

## 保守するとき

- AI（Codex など）が守るルール: [AGENTS.md](AGENTS.md)
- ファイルの対応: [docs/structure.md](docs/structure.md)
- 機種ごとの出典と調査中: [docs/machines.md](docs/machines.md)
- ローカルでの開き方、公開、機種追加と確率表のチェックリスト: [docs/maintenance.md](docs/maintenance.md)
- 未着手のアイデア: [docs/backlog.md](docs/backlog.md)

リンクと JS の構文だけ確認するスクリプトです。依存パッケージはありません。

```bash
node scripts/check-site.js
```

## 体調ログ

別アプリです。公開 URL は <https://sugarsgith.github.io/taicho/> です。スロットセンスのメニューには出ていません。記録はこの端末のブラウザ内に保存されます。

- AI 向けのルール: [taicho/AGENTS.md](taicho/AGENTS.md)
- ファイル、データ、テスト環境、公開: [docs/taicho/structure.md](docs/taicho/structure.md)
