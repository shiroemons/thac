/**
 * エラーメッセージ定数
 * すべてのAPIエンドポイントで使用する統一されたエラーメッセージ
 */
export const ERROR_MESSAGES = {
	// ===== 汎用エラー =====
	NOT_FOUND: "データが見つかりません",
	VALIDATION_FAILED: "入力内容に誤りがあります",
	DB_ERROR: "データベースエラーが発生しました",

	// ===== リソース別 Not Found =====
	EVENT_NOT_FOUND: "イベントが見つかりません",
	EVENT_SERIES_NOT_FOUND: "イベントシリーズが見つかりません",
	EVENT_DAY_NOT_FOUND: "イベント日が見つかりません",
	RELEASE_NOT_FOUND: "リリースが見つかりません",
	TRACK_NOT_FOUND: "トラックが見つかりません",
	CIRCLE_NOT_FOUND: "サークルが見つかりません",
	ARTIST_NOT_FOUND: "アーティストが見つかりません",
	ARTIST_ALIAS_NOT_FOUND: "アーティスト別名が見つかりません",
	PLATFORM_NOT_FOUND: "プラットフォームが見つかりません",
	DISC_NOT_FOUND: "ディスクが見つかりません",
	WORK_NOT_FOUND: "公式作品が見つかりません",
	SONG_NOT_FOUND: "公式楽曲が見つかりません",
	CREDIT_NOT_FOUND: "クレジットが見つかりません",
	ROLE_NOT_FOUND: "役割が見つかりません",
	PARENT_TRACK_NOT_FOUND: "親トラックが見つかりません",
	SWAP_TARGET_NOT_FOUND: "入れ替え対象が見つかりません",
	DERIVATION_NOT_FOUND: "派生関係が見つかりません",
	ISRC_NOT_FOUND: "ISRCが見つかりません",
	PUBLICATION_NOT_FOUND: "配信情報が見つかりません",
	JAN_CODE_NOT_FOUND: "JANコードが見つかりません",
	ALIAS_TYPE_NOT_FOUND: "別名タイプが見つかりません",
	CREDIT_ROLE_NOT_FOUND: "クレジット役割が見つかりません",
	OFFICIAL_WORK_CATEGORY_NOT_FOUND: "公式作品カテゴリが見つかりません",
	ROLE_NOT_FOUND_IN_MASTER: "役割がマスターデータに見つかりません",

	// ===== 重複エラー (409) =====
	ID_ALREADY_EXISTS: "このIDは既に使用されています",
	NAME_ALREADY_EXISTS: "この名前は既に使用されています",
	CODE_ALREADY_EXISTS: "このコードは既に使用されています",
	URL_ALREADY_EXISTS: "このURLは既に登録されています",
	URL_ALREADY_EXISTS_FOR_CIRCLE: "このURLは既にこのサークルに登録されています",
	URL_ALREADY_EXISTS_FOR_SONG: "このURLは既にこの楽曲に登録されています",
	URL_ALREADY_EXISTS_FOR_WORK: "このURLは既にこの作品に登録されています",
	ISRC_ALREADY_EXISTS: "このISRCは既にこのトラックに登録されています",
	PRIMARY_ISRC_ALREADY_EXISTS: "プライマリISRCは既にこのトラックに存在します",
	JAN_CODE_ALREADY_EXISTS: "このJANコードは既に登録されています",
	PRIMARY_JAN_CODE_ALREADY_EXISTS:
		"プライマリJANコードは既にこのリリースに存在します",
	ALIAS_ALREADY_EXISTS: "この別名は既にこのアーティストに登録されています",
	DAY_NUMBER_ALREADY_EXISTS: "この日番号は既にこのイベントに存在します",
	DATE_ALREADY_EXISTS: "この日付は既にこのイベントに存在します",
	EDITION_ALREADY_EXISTS: "このエディションは既にこのシリーズに存在します",
	ASSOCIATION_ALREADY_EXISTS: "この関連付けは既に存在します",
	TRACK_NUMBER_ALREADY_EXISTS_FOR_DISC:
		"このトラック番号は既にこのディスクに存在します",
	TRACK_NUMBER_ALREADY_EXISTS_FOR_RELEASE:
		"このトラック番号は既にこのリリースに存在します",
	DERIVATION_ALREADY_EXISTS: "この派生関係は既に存在します",
	DISC_NUMBER_ALREADY_EXISTS_FOR_RELEASE:
		"このディスク番号は既にこのリリースに存在します",
	CREDIT_ALREADY_EXISTS_FOR_TRACK:
		"このアーティスト（同一別名義）のクレジットは既にこのトラックに存在します",
	ROLE_ALREADY_EXISTS_FOR_CREDIT:
		"この役割（同一位置）は既にこのクレジットに存在します",
	OFFICIAL_SONG_ALREADY_LINKED:
		"この公式楽曲は既に同じ順序でこのトラックに紐付けられています",
	ITEMS_REQUIRED_NON_EMPTY: "itemsは必須で、空でない配列である必要があります",

	// ===== 削除制約エラー =====
	CANNOT_DELETE_SERIES_WITH_EVENTS:
		"関連するイベントがあるため、このシリーズは削除できません",

	// ===== バリデーションエラー (400) =====
	INVALID_SORT_ORDER: "無効な並び順です",
	INVALID_DIRECTION: "無効な方向です。'up' または 'down' を指定してください",
	INVALID_ROLE_POSITION: "無効な役割位置です",
	INVALID_STATE: "無効な状態です",
	ITEMS_ARRAY_REQUIRED: "items配列が必要です",
	ITEMS_MUST_HAVE_ID_AND_SORT_ORDER: "各要素にはidとsortOrderが必要です",
	ITEMS_MUST_HAVE_CODE_AND_SORT_ORDER: "各要素にはcodeとsortOrderが必要です",
	PARTICIPATION_TYPE_REQUIRED: "participationTypeクエリパラメータが必要です",
	SOURCE_SONG_CANNOT_REFERENCE_ITSELF: "原曲は自身を参照できません",
	DISC_REQUIRES_RELEASE: "ディスクを設定するにはリリースが必要です",
	CANNOT_MOVE_FURTHER: "これ以上移動できません",
	ALREADY_AT_TOP: "既に先頭です",
	ALREADY_AT_BOTTOM: "既に末尾です",
	ARTIST_ALIAS_NOT_BELONG_TO_ARTIST:
		"アーティスト別名が見つからないか、指定されたアーティストに属していません",
	URL_PATTERN_MISMATCH: "URLが選択されたプラットフォームの形式と一致しません",
	EVENT_DAY_MISMATCH: "event_idとevent_day_idが整合していません",
	MAXIMUM_BATCH_ITEMS: "一括操作は最大100件までです",

	// ===== ファイルアップロード関連 =====
	FILE_NOT_SPECIFIED: "ファイルが指定されていません",
	FILE_NOT_UPLOADED: "ファイルがアップロードされていません",
	ONLY_CSV_ALLOWED: "CSVファイルのみアップロード可能です",
	FILE_SIZE_EXCEEDED: (maxSizeMB: number) =>
		`ファイルサイズが${maxSizeMB}MBを超えています`,
	DATA_FETCH_FAILED: "データの取得に失敗しました",
	INVALID_REQUEST_DATA: "リクエストデータが不正です",
	UNEXPECTED_ERROR: "予期しないエラーが発生しました",
} as const;
