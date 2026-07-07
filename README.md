# 山本マイカーセンター公式サイト

山本マイカーセンター株式会社の公式サイトです。

本番URL: https://mycarcenter.netlify.app/

## 引き継ぎ資料

このプロジェクトの背景、実装判断、運用手順、マーケティング方針は `docs` にまとめています。

最初に読むもの:

- [docs/README.md](./docs/README.md)
- [docs/project-overview.md](./docs/project-overview.md)
- [docs/site-structure.md](./docs/site-structure.md)
- [docs/implementation-decisions.md](./docs/implementation-decisions.md)
- [docs/operations-playbook.md](./docs/operations-playbook.md)
- [docs/marketing-roadmap.md](./docs/marketing-roadmap.md)

## 技術構成

- 静的HTML / CSS / JavaScript
- Netlify Hosting
- Netlify Functions
- Google Apps Script
- Google Analytics 4
- Microsoft Clarity
- Google Search Console

## 重要な方針

- 主軸は「中古車相談」と「板金塗装・保険修理」。
- 採用も重要。採用向け記事は顧客向け記事と分ける。
- 電話問い合わせを主導線にする。
- Goo-net在庫はNetlify Function経由で取得し、取得失敗時は固定のダミー車両を出さない。
- LLM向け補助として `llms.txt` と `llms-full.txt` を置いている。

## デプロイ

通常は `main` にpushするとNetlifyで本番デプロイされます。

```powershell
cd "C:\Users\ko0v0\Documents\Codex\2026-07-04\https-mycarcenter-netlify-app\work\my-car-center"
git -c http.sslBackend=openssl push origin main
```
