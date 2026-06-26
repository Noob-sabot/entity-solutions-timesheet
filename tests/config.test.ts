import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getTimesheetUrl,
  parseArgs,
  loadConfig,
} from "../scripts/lib/config.js";

describe("parseArgs", () => {
  it("parses headed and period flags", () => {
    const args = parseArgs([
      "--headed",
      "--period",
      "15/06/2026 21/06/2026",
    ]);
    assert.equal(args.headed, true);
    assert.equal(args.period, "15/06/2026 21/06/2026");
  });

  it("defaults headed to false when omitted", () => {
    const args = parseArgs([]);
    assert.equal(args.headed, false);
    assert.equal(args.period, undefined);
  });
});

describe("getTimesheetUrl", () => {
  it("builds submit URL from portal origin and path", () => {
    const url = getTimesheetUrl({
      portalUrl: "https://portal.entitysolutions.com.au/webcenter/portal/login",
      timesheetPath:
        "/webcenter/portal/IPro/pages_home/mytimesheets/submittimesheet",
    } as Parameters<typeof getTimesheetUrl>[0]);

    assert.equal(
      url,
      "https://portal.entitysolutions.com.au/webcenter/portal/IPro/pages_home/mytimesheets/submittimesheet"
    );
  });
});

describe("loadConfig", () => {
  it("loads currentWeek with seven days for trial week", () => {
    const config = loadConfig();
    assert.equal(config.contractAssignment, "CRREW_LOGAN_464459");
    assert.equal(config.currentWeek.periodMatch, "22/06/2026 28/06/2026");
    assert.equal(config.currentWeek.days.length, 7);
    assert.equal(config.currentWeek.days[0].hours, 7.5);
    assert.equal(config.currentWeek.days[3].note, "Finished early for work drinks");
  });
});
