# UI ガイドライン

## アイコンマッピング

各エンティティに使用するアイコンの統一ルールです。

| エンティティ | アイコン | lucide-react | 用途 |
|-------------|---------|--------------|------|
| イベント | Calendar | `Calendar` | イベント関連の表示 |
| サークル | Users | `Users` | サークル関連の表示、メンバー数 |
| アーティスト | UserRound | `UserRound` | アーティスト関連の表示、参加アーティスト数 |
| 作品 | Disc3 | `Disc3` | 作品・リリース関連の表示 |
| トラック | Music | `Music` | トラック・楽曲関連の表示 |

### 使用例

```tsx
import { Calendar, Users, UserRound, Disc3, Music } from "lucide-react";

// イベント
<Calendar className="size-4" />

// サークル
<Users className="size-4" />

// アーティスト
<UserRound className="size-4" />

// 作品
<Disc3 className="size-4" />

// トラック
<Music className="size-4" />
```

### 注意事項

- 新しいUIを作成する際は、必ずこのマッピングに従ってください
- アイコンの一貫性はUXの重要な要素です
- 変更が必要な場合は、プロジェクト全体で統一的に変更してください
