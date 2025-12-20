import { nanoid } from "nanoid";

const ID_LENGTH = 21;

export const createId = {
	artist: () => `a_${nanoid(ID_LENGTH)}`,
	artistAlias: () => `aa_${nanoid(ID_LENGTH)}`,
	circle: () => `c_${nanoid(ID_LENGTH)}`,
	circleLink: () => `cl_${nanoid(ID_LENGTH)}`,
	track: () => `t_${nanoid(ID_LENGTH)}`,
	trackCredit: () => `tc_${nanoid(ID_LENGTH)}`,
	release: () => `r_${nanoid(ID_LENGTH)}`,
	disc: () => `d_${nanoid(ID_LENGTH)}`,
	eventSeries: () => `es_${nanoid(ID_LENGTH)}`,
	event: () => `e_${nanoid(ID_LENGTH)}`,
	eventDay: () => `ed_${nanoid(ID_LENGTH)}`,
} as const;
