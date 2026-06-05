import dayjs from "dayjs";

export const TODAY = dayjs().hour(0).minute(0);
export const TODAY_STR = TODAY.format("YYYY-MM-DD");
