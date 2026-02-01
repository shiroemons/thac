# ジャンル シードデータ

## 概要

Wikipediaおよび主要音楽配信サービス（Spotify, Apple Music, YouTube Music等）の分類を参考に、
代表的な音楽ジャンルの大項目を選定。細かいサブジャンルは除外し、汎用性の高いジャンルのみを収録。

## ジャンル一覧（25件）

### カテゴリ別内訳

| カテゴリ | 件数 | ジャンル |
|----------|------|----------|
| ポピュラー音楽 | 5 | Pop, Rock, Hip-Hop, R&B, Country |
| 電子音楽 | 4 | Electronic, House, Techno, Trance |
| クラシック・ジャズ | 4 | Classical, Orchestral, Jazz, Blues |
| メタル・パンク | 2 | Metal, Punk |
| ワールド・フォーク | 3 | Folk, Latin, Reggae |
| 日本音楽 | 4 | J-Pop, J-Rock, Enka, City Pop |
| アニメ・ゲーム・同人 | 3 | Anime, Game, Vocaloid |

---

## シードデータ

```typescript
/**
 * 音楽ジャンル シードデータ
 *
 * 選定基準:
 * - Wikipedia「音楽ジャンル一覧」の大項目
 * - 主要音楽配信サービスの分類
 * - 同人音楽・東方アレンジ界隈で使用される主要ジャンル
 *
 * 参考:
 * - https://en.wikipedia.org/wiki/List_of_music_genres_and_styles
 * - https://en.wikipedia.org/wiki/Music_genre
 */
export const genreSeedData = [
  // ========================================
  // ポピュラー音楽（Popular Music）
  // ========================================
  {
    code: "pop",
    nameJa: "ポップ",
    nameEn: "Pop",
    color: "#FF69B4",
    icon: "heart",
    description: "キャッチーなメロディと親しみやすい構成が特徴の大衆音楽。1950年代に誕生し、世界で最も広く聴かれるジャンル。",
    sortOrder: 1,
  },
  {
    code: "rock",
    nameJa: "ロック",
    nameEn: "Rock",
    color: "#DC143C",
    icon: "guitar",
    description: "エレキギター、ベース、ドラムを中心としたバンドサウンド。1950年代のロックンロールから発展し、多様なサブジャンルを生んだ。",
    sortOrder: 2,
  },
  {
    code: "hip_hop",
    nameJa: "ヒップホップ",
    nameEn: "Hip-Hop",
    color: "#FFD700",
    icon: "mic",
    description: "ラップ、ビートメイキング、サンプリングを特徴とする音楽。1970年代ニューヨークで誕生したストリートカルチャー。",
    sortOrder: 3,
  },
  {
    code: "rnb",
    nameJa: "R&B",
    nameEn: "R&B",
    color: "#9400D3",
    icon: "heart-pulse",
    description: "リズム・アンド・ブルースの略。ソウルフルなボーカルとグルーヴィーなリズムが特徴。ソウル、ファンクを含む。",
    sortOrder: 4,
  },
  {
    code: "country",
    nameJa: "カントリー",
    nameEn: "Country",
    color: "#CD853F",
    icon: "mountain",
    description: "アメリカ南部発祥のフォーク音楽。アコースティックギター、バンジョー、フィドルを使用し、物語性のある歌詞が特徴。",
    sortOrder: 5,
  },

  // ========================================
  // 電子音楽（Electronic Music）
  // ========================================
  {
    code: "electronic",
    nameJa: "エレクトロニック",
    nameEn: "Electronic",
    color: "#00CED1",
    icon: "zap",
    description: "シンセサイザーやドラムマシンを使用した電子音楽の総称。EDM、アンビエント、IDMなど幅広いスタイルを包含。",
    sortOrder: 6,
  },
  {
    code: "house",
    nameJa: "ハウス",
    nameEn: "House",
    color: "#00BFFF",
    icon: "home",
    description: "1980年代シカゴ発祥のダンスミュージック。四つ打ちビート（120-130 BPM）とソウルフルなサンプリングが特徴。",
    sortOrder: 7,
  },
  {
    code: "techno",
    nameJa: "テクノ",
    nameEn: "Techno",
    color: "#4169E1",
    icon: "cpu",
    description: "1980年代デトロイト発祥。反復的でミニマルなビート、シンセサイザーとドラムマシンによる機械的サウンドが特徴。",
    sortOrder: 8,
  },
  {
    code: "trance",
    nameJa: "トランス",
    nameEn: "Trance",
    color: "#9370DB",
    icon: "sparkles",
    description: "1990年代ドイツ発祥。メロディックで高揚感のあるビルドアップとドロップ、反復的なフレーズが特徴。",
    sortOrder: 9,
  },

  // ========================================
  // クラシック・ジャズ（Classical & Jazz）
  // ========================================
  {
    code: "classical",
    nameJa: "クラシック",
    nameEn: "Classical",
    color: "#8B4513",
    icon: "music-2",
    description: "西洋の伝統的な芸術音楽。バロック、古典派、ロマン派など数世紀にわたる楽曲を含む。",
    sortOrder: 10,
  },
  {
    code: "orchestral",
    nameJa: "オーケストラ",
    nameEn: "Orchestral",
    color: "#800000",
    icon: "users",
    description: "フルオーケストラによる演奏。映画音楽、ゲーム音楽、現代クラシックなど幅広く使用される。",
    sortOrder: 11,
  },
  {
    code: "jazz",
    nameJa: "ジャズ",
    nameEn: "Jazz",
    color: "#B8860B",
    icon: "music",
    description: "20世紀初頭アメリカ発祥。即興演奏、スウィング、複雑なハーモニーが特徴。ビバップ、フュージョンなど多様なスタイルを含む。",
    sortOrder: 12,
  },
  {
    code: "blues",
    nameJa: "ブルース",
    nameEn: "Blues",
    color: "#4682B4",
    icon: "sunset",
    description: "アフリカ系アメリカ人の音楽伝統から生まれた。12小節ブルース進行と感情表現豊かなボーカル・ギターが特徴。",
    sortOrder: 13,
  },

  // ========================================
  // メタル・パンク（Metal & Punk）
  // ========================================
  {
    code: "metal",
    nameJa: "メタル",
    nameEn: "Metal",
    color: "#2F4F4F",
    icon: "skull",
    description: "重厚で歪んだギターリフ、パワフルなドラム、攻撃的または技巧的なサウンドが特徴。ヘヴィメタルから派生した多様なサブジャンルを含む。",
    sortOrder: 14,
  },
  {
    code: "punk",
    nameJa: "パンク",
    nameEn: "Punk",
    color: "#FF4500",
    icon: "flame",
    description: "1970年代に反体制的なメッセージと共に誕生。シンプルで速いテンポ、DIY精神、短い曲が特徴。",
    sortOrder: 15,
  },

  // ========================================
  // ワールド・フォーク（World & Folk）
  // ========================================
  {
    code: "folk",
    nameJa: "フォーク",
    nameEn: "Folk",
    color: "#556B2F",
    icon: "leaf",
    description: "伝統的な民謡やその影響を受けた音楽。アコースティック楽器と物語性のある歌詞が特徴。アコースティック系全般を含む。",
    sortOrder: 16,
  },
  {
    code: "latin",
    nameJa: "ラテン",
    nameEn: "Latin",
    color: "#FF4500",
    icon: "sun",
    description: "ラテンアメリカ発祥の音楽。サルサ、ボサノバ、レゲトン、タンゴなど多様なスタイルを包含。リズミカルで情熱的。",
    sortOrder: 17,
  },
  {
    code: "reggae",
    nameJa: "レゲエ",
    nameEn: "Reggae",
    color: "#228B22",
    icon: "palm-tree",
    description: "ジャマイカ発祥の音楽。オフビートを強調したリズムが特徴。スカ、ダブ、ダンスホールを含む。",
    sortOrder: 18,
  },

  // ========================================
  // 日本音楽（Japanese Music）
  // ========================================
  {
    code: "jpop",
    nameJa: "J-POP",
    nameEn: "J-Pop",
    color: "#FF1493",
    icon: "sparkles",
    description: "日本のポピュラー音楽。1990年代以降の日本の大衆音楽を指し、アイドル、シンガーソングライター、バンドなど多様なスタイルを含む。",
    sortOrder: 19,
  },
  {
    code: "jrock",
    nameJa: "J-ROCK",
    nameEn: "J-Rock",
    color: "#B22222",
    icon: "guitar",
    description: "日本のロック音楽。1960年代のグループサウンズから発展し、ヴィジュアル系、オルタナティブなど独自のスタイルを生んだ。",
    sortOrder: 20,
  },
  {
    code: "enka",
    nameJa: "演歌",
    nameEn: "Enka",
    color: "#8B0000",
    icon: "mic-2",
    description: "日本の伝統的なバラード音楽。こぶしを効かせた独特の歌唱法、哀愁漂うメロディが特徴。",
    sortOrder: 21,
  },
  {
    code: "city_pop",
    nameJa: "シティポップ",
    nameEn: "City Pop",
    color: "#FF8C00",
    icon: "building",
    description: "1970〜80年代の日本のアーバンポップ。ファンク、ディスコ、AORの影響を受けた洗練されたサウンド。近年世界的に再評価。",
    sortOrder: 22,
  },

  // ========================================
  // アニメ・ゲーム・同人（Anime, Game & Doujin）
  // ========================================
  {
    code: "anime",
    nameJa: "アニソン",
    nameEn: "Anime",
    color: "#FF6347",
    icon: "tv",
    description: "アニメのオープニング、エンディング、挿入歌などテーマ曲全般。ポップ、ロック、電子音楽など多様なスタイルを包含。",
    sortOrder: 23,
  },
  {
    code: "game",
    nameJa: "ゲーム音楽",
    nameEn: "Game",
    color: "#7B68EE",
    icon: "gamepad-2",
    description: "ビデオゲームのサウンドトラック、BGM全般。チップチューンからオーケストラまで幅広いスタイルを含む。",
    sortOrder: 24,
  },
  {
    code: "vocaloid",
    nameJa: "ボーカロイド",
    nameEn: "Vocaloid",
    color: "#00FFFF",
    icon: "bot",
    description: "音声合成ソフトウェアを使用した楽曲。初音ミクなどのキャラクターが有名。ニコニコ動画を中心に発展した文化。",
    sortOrder: 25,
  },
] as const;

export type GenreSeedData = (typeof genreSeedData)[number];
```

---

## アイコン一覧

使用しているLucideアイコン:

| アイコン名 | 使用ジャンル |
|------------|--------------|
| `heart` | Pop |
| `guitar` | Rock, J-Rock |
| `mic` | Hip-Hop |
| `mic-2` | Enka |
| `heart-pulse` | R&B |
| `mountain` | Country |
| `zap` | Electronic |
| `home` | House |
| `cpu` | Techno |
| `sparkles` | Trance, J-Pop |
| `music` | Jazz |
| `music-2` | Classical |
| `users` | Orchestral |
| `sunset` | Blues |
| `skull` | Metal |
| `flame` | Punk |
| `leaf` | Folk |
| `sun` | Latin |
| `palm-tree` | Reggae |
| `building` | City Pop |
| `tv` | Anime |
| `gamepad-2` | Game |
| `bot` | Vocaloid |

---

## カラーパレット

```
Pop:        #FF69B4 (ホットピンク)
Rock:       #DC143C (クリムゾン)
Hip-Hop:    #FFD700 (ゴールド)
R&B:        #9400D3 (ダークバイオレット)
Country:    #CD853F (ペルー)
Electronic: #00CED1 (ダークターコイズ)
House:      #00BFFF (ディープスカイブルー)
Techno:     #4169E1 (ロイヤルブルー)
Trance:     #9370DB (ミディアムパープル)
Classical:  #8B4513 (サドルブラウン)
Orchestral: #800000 (マルーン)
Jazz:       #B8860B (ダークゴールデンロッド)
Blues:      #4682B4 (スチールブルー)
Metal:      #2F4F4F (ダークスレートグレー)
Punk:       #FF4500 (オレンジレッド)
Folk:       #556B2F (ダークオリーブグリーン)
Latin:      #FF4500 (オレンジレッド)
Reggae:     #228B22 (フォレストグリーン)
J-Pop:      #FF1493 (ディープピンク)
J-Rock:     #B22222 (ファイアブリック)
Enka:       #8B0000 (ダークレッド)
City Pop:   #FF8C00 (ダークオレンジ)
Anime:      #FF6347 (トマト)
Game:       #7B68EE (ミディアムスレートブルー)
Vocaloid:   #00FFFF (シアン)
```

---

## 参考文献

1. [List of music genres and styles - Wikipedia](https://en.wikipedia.org/wiki/List_of_music_genres_and_styles)
2. [Music genre - Wikipedia](https://en.wikipedia.org/wiki/Music_genre)
3. [Electronic music - Wikipedia](https://en.wikipedia.org/wiki/Electronic_music)
4. [J-pop - Wikipedia](https://en.wikipedia.org/wiki/J-pop)
5. [City pop - Wikipedia](https://en.wikipedia.org/wiki/City_pop)
6. [Vocaloid - Wikipedia](https://en.wikipedia.org/wiki/Vocaloid)
7. [Spotify Genres](https://everynoise.com/) - Every Noise at Once
8. [Apple Music Genres](https://music.apple.com/browse)
