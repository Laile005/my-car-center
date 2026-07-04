# ステージング運用メモ

## 目的

公開中の `main` ブランチを直接触らず、確認用ブランチで表示・フォーム・SEOを確認してから本番へ反映する。

## 推奨フロー

1. `staging/site-improvements` ブランチで作業する
2. GitHub にブランチを push する
3. GitHub Pull Request を作る
4. Netlify の Deploy Preview または Branch deploy で確認する
5. 問題なければ PR を `main` に merge する
6. Netlify の本番デプロイ完了後に Search Console で sitemap を再送信する

## Netlify 側で確認すること

- Deploy previews が有効になっていること
- Branch deploys で `staging/*` または対象ブランチが許可されていること
- Production branch が `main` のままであること

## GAS 側で確認すること

- Web アプリの実行ユーザー: 自分
- アクセスできるユーザー: 全員
- コード更新後に新しいバージョンで再デプロイ済み
- 初回実行時に `SpreadsheetApp` と `MailApp` の権限承認済み
