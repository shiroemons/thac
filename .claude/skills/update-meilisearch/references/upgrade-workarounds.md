# アップグレード回避策

## 背景

devbox は nixpkgs のパッケージインデックスを使用しているが、新バージョンのマージ後も
`devbox search` への反映に遅延が生じることがある。
この場合、nixpkgs のコミットを直接参照してアップグレードを行う。

## nixpkgs 直接参照でのアップグレード

```
Task 5-devbox-workaround: nixpkgs直接参照でアップグレード
- subagent_type: Bash
- prompt: |
    devbox search に目的バージョンがない場合、nixpkgs を直接参照して更新してください。

    1. nixpkgs で該当バージョンの PR を検索:
       gh search prs --repo NixOS/nixpkgs "meilisearch <version>"

    2. マージ済み PR のコミットハッシュを取得:
       gh pr view <PR番号> --repo NixOS/nixpkgs --json mergeCommit

    3. バージョン確認:
       nix eval "github:NixOS/nixpkgs/<commit>#meilisearch.version"

    4. store パス取得:
       nix eval --raw "github:NixOS/nixpkgs/<commit>#meilisearch.outPath"

    5. devbox.lock を手動更新:
       - resolved: "github:NixOS/nixpkgs/<commit>#meilisearch" に変更
       - version: 新バージョンに変更
       - store_path: 取得した store パスに変更

    6. devbox install でインストール

    7. meilisearch --version で確認
```

## 通常フローとの使い分け

| 状況 | フロー |
|------|--------|
| `devbox search` に目的バージョンあり | `devbox update meilisearch` → `devbox install` |
| `devbox search` に未反映 | nixpkgs 直接参照（上記手順） |

## nixpkgs のパッケージ管理場所

- `pkgs/by-name/me/meilisearch/package.nix` in NixOS/nixpkgs
