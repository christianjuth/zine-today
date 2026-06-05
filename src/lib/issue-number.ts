import dayjs from "dayjs";

const START_DATE = dayjs("2026-05-31", "YYYY-MM-DD");
const TODAY = dayjs();

export function issueNumber(date = TODAY) {
  return date.diff(START_DATE, "days");
}
