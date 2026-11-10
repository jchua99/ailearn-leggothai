import { describe, expect, it } from "vitest";
import { scheduleStatus, type ScheduleItem } from "./schedule";
import { nowInTimeZone, toMinutes } from "./time";

const at = (date: string, time: string) => toMinutes(date, time);

describe("nowInTimeZone", () => {
  it("returns trip-local wall-clock time regardless of host zone", () => {
    // 2026-11-10T03:30:00Z is 10:30 in Bangkok (UTC+7) and 11:30 in Singapore (UTC+8)
    const instant = new Date("2026-11-10T03:30:00Z");
    expect(nowInTimeZone("Asia/Bangkok", instant)).toEqual({ date: "2026-11-10", time: "10:30" });
    expect(nowInTimeZone("Asia/Singapore", instant)).toEqual({ date: "2026-11-10", time: "11:30" });
  });

  it("rolls over the date across midnight", () => {
    const instant = new Date("2026-11-10T18:15:00Z");
    expect(nowInTimeZone("Asia/Bangkok", instant)).toEqual({ date: "2026-11-11", time: "01:15" });
  });
});

describe("scheduleStatus", () => {
  const items: ScheduleItem[] = [
    { id: 1, date: "2026-11-10", startTime: "09:00", endTime: "10:00" },
    { id: 2, date: "2026-11-10", startTime: "10:30", endTime: null },
    { id: 3, date: "2026-11-10", startTime: "13:00", endTime: "15:00" },
    { id: 4, date: "2026-11-10", startTime: null, endTime: null }, // all-day
    { id: 5, date: "2026-11-11", startTime: "08:00", endTime: null },
  ];

  it("highlights the item whose start/end window contains now", () => {
    const s = scheduleStatus(items, at("2026-11-10", "09:30"));
    expect(s.currentIds).toEqual([1]);
    expect(s.nextId).toBe(2);
  });

  it("treats the end time as exclusive", () => {
    const s = scheduleStatus(items, at("2026-11-10", "10:00"));
    expect(s.currentIds).toEqual([]);
    expect(s.nextId).toBe(2);
  });

  it("an item with no end time lasts until the next item starts", () => {
    expect(scheduleStatus(items, at("2026-11-10", "12:59")).currentIds).toEqual([2]);
    expect(scheduleStatus(items, at("2026-11-10", "13:00")).currentIds).toEqual([3]);
  });

  it("the last item of a day with no end time is capped at midnight", () => {
    const s = scheduleStatus(
      [
        { id: 1, date: "2026-11-10", startTime: "20:00", endTime: null },
        { id: 2, date: "2026-11-12", startTime: "08:00", endTime: null },
      ],
      at("2026-11-11", "07:00"),
    );
    expect(s.currentIds).toEqual([]);
    expect(s.nextId).toBe(2);
    expect(scheduleStatus(
      [{ id: 1, date: "2026-11-10", startTime: "20:00", endTime: null }],
      at("2026-11-10", "23:59"),
    ).currentIds).toEqual([1]);
  });

  it("all-day items are never 'current' or 'up next'", () => {
    const s = scheduleStatus([{ id: 4, date: "2026-11-10", startTime: null, endTime: null }], at("2026-11-10", "12:00"));
    expect(s).toEqual({ currentIds: [], nextId: null });
  });

  it("highlights every overlapping item", () => {
    const s = scheduleStatus(
      [
        { id: 1, date: "2026-11-10", startTime: "09:00", endTime: "12:00" },
        { id: 2, date: "2026-11-10", startTime: "10:00", endTime: "11:00" },
      ],
      at("2026-11-10", "10:15"),
    );
    expect(s.currentIds).toEqual([1, 2]);
    expect(s.nextId).toBeNull();
  });

  it("an end time before the start means it ends the next day", () => {
    const overnight: ScheduleItem[] = [{ id: 1, date: "2026-11-10", startTime: "22:00", endTime: "06:00" }];
    expect(scheduleStatus(overnight, at("2026-11-11", "05:00")).currentIds).toEqual([1]);
    expect(scheduleStatus(overnight, at("2026-11-11", "06:00")).currentIds).toEqual([]);
  });

  it("an item with no end time ignores later items starting at the same time", () => {
    const s = scheduleStatus(
      [
        { id: 1, date: "2026-11-10", startTime: "09:00", endTime: null },
        { id: 2, date: "2026-11-10", startTime: "09:00", endTime: null },
        { id: 3, date: "2026-11-10", startTime: "11:00", endTime: null },
      ],
      at("2026-11-10", "10:00"),
    );
    expect(s.currentIds).toEqual([1, 2]);
    expect(s.nextId).toBe(3);
  });

  it("before the trip, the first item is up next", () => {
    const s = scheduleStatus(items, at("2026-11-01", "00:00"));
    expect(s).toEqual({ currentIds: [], nextId: 1 });
  });

  it("after the trip, nothing is current or next", () => {
    expect(scheduleStatus(items, at("2026-12-01", "00:00"))).toEqual({ currentIds: [], nextId: null });
  });
});
