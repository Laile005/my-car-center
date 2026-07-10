# 山本マイカーセンター サイト引き継ぎ資料

この `docs` フォルダは、山本マイカーセンター株式会社のWebサイトを、別のAI・開発者・運用担当者が引き継ぐための資料です。

## 最初に読むもの

1. [project-overview.md](./project-overview.md)
   - 事業方針、サイトの目的、これまで何をしてきたか。

2. [site-structure.md](./site-structure.md)
   - ページ構成、主要ファイル、どこを触ればよいか。

3. [implementation-decisions.md](./implementation-decisions.md)
   - 実装した理由、検討したが採用しなかったこと、同じ議論を繰り返さないための判断メモ。

4. [operations-playbook.md](./operations-playbook.md)
   - 日常運用、デプロイ、計測除外、記事追加、確認手順。

5. [marketing-roadmap.md](./marketing-roadmap.md)
   - SEO / LLO / GEO、GA4、Clarity、Search Consoleを使った改善方針。

6. [marketing-reporting.md](./marketing-reporting.md)
   - GA4 / Clarity の週次レポート実行方法と、手動発行が必要な項目。

## 既存資料

- [staging-checklist.md](./staging-checklist.md)
  - ステージング確認の基本手順。
- [marketing-measurement-plan.md](./marketing-measurement-plan.md)
  - 計測ツールと見るべきイベント。
- [seo-llo-geo-content-plan.md](./seo-llo-geo-content-plan.md)
  - 記事テーマの候補と投稿ペース。
- [gas-doPost-improved.js](./gas-doPost-improved.js)
  - 採用フォーム送信用GASの改善案。

## このサイトで特に大事な前提

- 主軸は「板金塗装・保険修理」と「中古車相談」。
- 新車販売は対応可能だが、最優先の訴求ではない。
- 採用も重要。求人媒体だけに頼らず、オーガニック検索・LLM経由の流入を狙う。
- 電話対応が主導線。フォームやオンライン面談より、電話で問い合わせる導線を優先する。
- 「地域密着の整備工場」は使ってよいが、「町の整備工場」「町工場」「少人数の地域工場」は避ける。
- LLM向けの構造化は重要だが、本文に制作側の都合が見えすぎる表現は避ける。
