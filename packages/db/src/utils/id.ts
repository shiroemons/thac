import { customAlphabet } from "nanoid";

// 英数字のみ（ダブルクリックで全選択可能）
const ALPHABET =
	"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const ID_LENGTH = 21;

const nanoid = customAlphabet(ALPHABET, ID_LENGTH);

export const createId = {
	artist: () => `ar_${nanoid()}`,
	artistAlias: () => `aa_${nanoid()}`,
	circle: () => `ci_${nanoid()}`,
	circleLink: () => `cl_${nanoid()}`,
	track: () => `tr_${nanoid()}`,
	trackCredit: () => `tc_${nanoid()}`,
	release: () => `re_${nanoid()}`,
	disc: () => `di_${nanoid()}`,
	eventSeries: () => `es_${nanoid()}`,
	event: () => `ev_${nanoid()}`,
	eventDay: () => `ed_${nanoid()}`,
} as const;
