# 暮らしの計算室 — kzy1225.github.io

ブラウザーで使う、小さなお金・買い物の計算ツールです。ビルドやバックエンドは不要です。

| ページ | パス | 内容 |
| --- | --- | --- |
| ツール一覧 | `/` | 共通デザインのホーム |
| 現金合計 | `/total-the-cash/` | 10券種×最大8列、画面テンキー切替、任意列・2列ペアの合計分析 |
| ウェル活計算機 | `/welkatsu/` | WAON POINTで買える額・必要な現金等を試算。青と黄色の配色 |
| 両替最適化 | `/echange/` | 基準枚数に合わせた両替の内訳 |
| 単価比較 | `/unit-price/` | 価格と内容量から単価を比較 |
| 週間シート | `/weekly-plan-review/` | ISO週番号・A4横・ルーティーン付きPDF出力 |
| 試作スペース | `/text/` | 準備中ページ |

`assets/site.css`と`assets/site.js`で共通デザイン・ナビゲーションを管理します。既存の`echange`ディレクトリ名は維持し、ホームにあった`exchange`へのリンク切れを修正しました。空だった`text`ページには戻り先を含む案内を置き、ホームの`test`へのリンク切れも解消しました。

## ローカル起動

```sh
python3 -m http.server 8000
```

`http://localhost:8000/`を開きます。ES Modulesを使うため、HTMLのファイル直開きではなくHTTPで確認してください。

## テスト

```sh
node --test total-the-cash/calc.test.mjs welkatsu/calc.test.mjs weekly-plan-review/week.test.mjs
```

- [現金合計の仕様・修正内容](total-the-cash/README.md)
- [ウェル活の仕様・公式情報](welkatsu/SPEC.md)
- [週間シートの使い方・ルーティーン編集方法](weekly-plan-review/README.md)

この作業フォルダーはGitチェックアウトではありません。GitHub Pagesへの本番公開は、変更ファイルをリポジトリに反映した後に行います。
