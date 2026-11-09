# Kotonoha

ビルド不要の静的サイトです。公開用ファイルを保存した状態で、デプロイは行っていません。

## 公開
同じディレクトリ構成で `index.html`、`style.css`、`app.mjs`、`count.mjs` を静的ホスティングへ配置してください。公開ディレクトリはサイト内の `kotonoha`、ビルドコマンドは不要です。ドメイン直下でも `/kotonoha/` 以下でも動作する相対パスです。JavaScriptモジュール（.mjs）をJavaScriptのContent-Typeで配信してください。

ローカル確認：`python3 -m http.server 8080 --directory kotonoha` を実行して http://localhost:8080 を開きます。モジュールを使うため、file:// での直接起動ではなくHTTP経由で確認してください。

本文はブラウザ内に保存されます。公開先のドメインが変わると保存済み本文は引き継がれません。
