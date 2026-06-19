import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { DayEntry } from "../scripts/lib/config.js";
import {
  expectedHourDisplayValues,
  findPeriodOptionIndex,
  isExpiredSession,
  isMidnightEndTrap,
  sumWeekHours,
  validateCurrentWeek,
} from "../scripts/lib/validate.js";

const trialWeek: DayEntry[] = [
  {
    hours: 5,
    start: "09:00",
    end: "14:30",
    break: "00:30",
    note: "Some time taken off as child was in hospital",
  },
  {
    hours: 5,
    start: "09:00",
    end: "14:30",
    break: "00:30",
    note: "Some time taken off as child was in hospital",
  },
  { hours: 7.5, start: "09:00", end: "17:00", break: "00:30" },
  { hours: 7.5, start: "09:00", end: "17:00", break: "00:30" },
  {
    hours: 7.5,
    start: "09:00",
    end: "17:00",
    break: "00:30",
    note: "Thankyou, have a good weekend :)",
  },
  { hours: 0 },
  { hours: 0 },
];

describe("isMidnightEndTrap", () => {
  it("detects 09:00 start with 00:00 end as the 15-hour trap", () => {
    assert.equal(isMidnightEndTrap("09:00", "00:00"), true);
    assert.equal(isMidnightEndTrap("09:00", "0:00"), true);
  });

  it("allows valid partial and full days", () => {
    assert.equal(isMidnightEndTrap("09:00", "14:30"), false);
    assert.equal(isMidnightEndTrap("09:00", "17:00"), false);
    assert.equal(isMidnightEndTrap("00:00", "00:00"), false);
  });
});

describe("validateCurrentWeek", () => {
  it("accepts the configured trial week", () => {
    assert.doesNotThrow(() => validateCurrentWeek(trialWeek));
  });

  it("rejects wrong day count", () => {
    assert.throws(
      () => validateCurrentWeek(trialWeek.slice(0, 6)),
      /Expected 7 days/
    );
  });

  it("rejects work days missing times", () => {
    assert.throws(
      () => validateCurrentWeek([{ hours: 7.5 }, ...trialWeek.slice(1)]),
      /Mon: work days require start, end, and break/
    );
  });

  it("rejects the midnight end trap in config", () => {
    assert.throws(
      () =>
        validateCurrentWeek([
          { hours: 5, start: "09:00", end: "00:00", break: "00:30" },
          ...trialWeek.slice(1),
        ]),
      /will calculate as 15h/
    );
  });
});

describe("sumWeekHours", () => {
  it("totals trial week to 32.5 hours", () => {
    assert.equal(sumWeekHours(trialWeek), 32.5);
  });
});

describe("findPeriodOptionIndex", () => {
  it("matches period substring in ADF option labels", () => {
    const options = [
      "15/06/2026 21/06/2026 In Progress",
      "22/06/2026 28/06/2026 Not submitted",
    ];
    assert.equal(
      findPeriodOptionIndex(options, "15/06/2026 21/06/2026"),
      0
    );
    assert.equal(findPeriodOptionIndex(options, "99/99/2026"), -1);
  });
});

describe("expectedHourDisplayValues", () => {
  it("includes integer and one-decimal ADF formats", () => {
    assert.deepEqual(expectedHourDisplayValues(7.5), new Set(["7.5"]));
    assert.deepEqual(expectedHourDisplayValues(5), new Set(["5", "5.0"]));
  });
});

describe("isExpiredSession", () => {
  it("detects login page by URL or Login button", () => {
    assert.equal(
      isExpiredSession(
        "https://portal.entitysolutions.com.au/webcenter/portal/login",
        false
      ),
      true
    );
    assert.equal(
      isExpiredSession(
        "https://portal.entitysolutions.com.au/webcenter/portal/IPro/pages_home/mytimesheets/submittimesheet",
        true
      ),
      true
    );
    assert.equal(
      isExpiredSession(
        "https://portal.entitysolutions.com.au/webcenter/portal/IPro/pages_home/mytimesheets/submittimesheet",
        false
      ),
      false
    );
  });
});
