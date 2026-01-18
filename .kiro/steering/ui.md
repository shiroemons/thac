# UI ガイドライン

## アイコンマッピング

各エンティティに使用するアイコンの統一ルールです。

| エンティティ | アイコン | lucide-react | 用途 |
|-------------|---------|--------------|------|
| イベント | Calendar | `Calendar` | イベント関連の表示 |
| サークル | Users | `Users` | サークル関連の表示（グループを表す） |
| アーティスト | UserRound | `UserRound` | アーティスト関連の表示（個人を表す） |
| 作品 | Disc3 | `Disc3` | 作品・リリース関連の表示 |
| トラック | Music | `Music` | トラック・楽曲関連の表示 |

### 使用例

```tsx
import { Calendar, Users, UserRound, Disc3, Music } from "lucide-react";

// イベント
<Calendar className="size-4" />

// サークル（グループ・団体）
<Users className="size-4" />

// アーティスト（個人）
<UserRound className="size-4" />

// 作品・リリース
<Disc3 className="size-4" />

// トラック・楽曲
<Music className="size-4" />
```

### 使用禁止アイコン

以下のアイコンは使用しないでください（統一のため）:

| 禁止アイコン | 代わりに使用 | 理由 |
|-------------|-------------|------|
| `Building2` | `Users` | サークルは `Users` に統一 |
| `User` | `UserRound` | アーティストは `UserRound` に統一 |
| `Mic`, `Mic2` | `UserRound` | アーティストは `UserRound` に統一 |
| `UserPen` | `UserRound` | アーティストは `UserRound` に統一 |
| `Disc` | `Disc3` | 作品は `Disc3` に統一 |
| `Album` | `Disc3` | 作品は `Disc3` に統一 |

### 注意事項

- 新しいUIを作成する際は、必ずこのマッピングに従ってください
- アイコンの一貫性はUXの重要な要素です
- 変更が必要な場合は、プロジェクト全体で統一的に変更してください
