import dayjs from "dayjs";

const START_DATE = dayjs("2026-05-31", "YYYY-MM-DD");
const TODAY = dayjs();

export function issueNumber() {
  return TODAY.diff(START_DATE, "days");
}
