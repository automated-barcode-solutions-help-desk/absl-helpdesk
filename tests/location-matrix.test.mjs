/**
 * Location × Company Coverage Matrix tests
 * Verifies grouping, client sorting, overdue/pending status detection,
 * multi-client hub identification, and filtering.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const h = require("../helpers.js");

const mockSites = [
  { id: "s1", client: "Seylan Bank", name: "Ampara Branch", place: "Ampara", phone: "0632222123", active: true },
  { id: "s2", client: "National Youth Corps", name: "Ampara Center", place: "Ampara", phone: "0632223456", active: true },
  { id: "s3", client: "SLT-Mobitel", name: "Ampara Teleshop", place: "Ampara", phone: "0632224567", active: true },
  { id: "s4", client: "Central Environmental Authority", name: "Ampara District Office", place: "Ampara", active: true },
  { id: "s5", client: "Seylan Bank", name: "Akuressa Branch", place: "Akuressa", phone: "0412283123", active: true },
  { id: "s6", client: "National Youth Corps", name: "Akuressa Training Center", place: "Akuressa", active: true },
  { id: "s7", client: "Seylan Bank", name: "Akkaraipattu Branch", place: "Akkaraipattu", phone: "0672277123", active: true },
  { id: "s8", client: "ABSL", name: "ABSL Head Office", place: "Colombo", is_base: true, active: true },
  { id: "s9", client: "Seylan Bank", name: "Closed Branch", place: "Colombo", active: false }
];

const mockPlans = [
  // Ampara Seylan Bank is overdue
  { id: "p1", site_id: "s1", status: "pending", due_by: "2026-08-31", contract_year: "2026/27" },
  // Ampara NYC is done
  { id: "p2", site_id: "s2", status: "done", done_at: "2026-09-10", service_call_number: "SC-1011", contract_year: "2026/27" },
  // Akuressa Seylan is pending in future
  { id: "p3", site_id: "s5", status: "pending", due_by: "2027-05-31", contract_year: "2026/27" }
];

test("buildLocationMatrix: filters base and inactive sites and groups alphabetically", () => {
  const res = h.buildLocationMatrix(mockSites, mockPlans, { asOfDate: "2026-11-11" });

  assert.equal(res.stats.totalSites, 7, "ignores is_base and active:false");
  assert.equal(res.stats.totalTowns, 3, "Akkaraipattu, Akuressa, Ampara");

  // Sorted towns
  assert.equal(res.rows[0].town, "Akkaraipattu");
  assert.equal(res.rows[1].town, "Akuressa");
  assert.equal(res.rows[2].town, "Ampara");
});

test("buildLocationMatrix: orders client columns in standard priority", () => {
  const res = h.buildLocationMatrix(mockSites, mockPlans, { asOfDate: "2026-11-11" });
  assert.deepEqual(res.clientColumns, [
    "Seylan Bank",
    "National Youth Corps",
    "SLT-Mobitel",
    "Central Environmental Authority"
  ]);
});

test("buildLocationMatrix: identifies multi-client hubs and four-client mega hubs", () => {
  const res = h.buildLocationMatrix(mockSites, mockPlans, { asOfDate: "2026-11-11" });

  const ampara = res.rows.find((r) => r.town === "Ampara");
  assert.equal(ampara.clientCount, 4);
  assert.equal(ampara.hasPending, true);
  assert.equal(ampara.hasOverdue, true);

  const akuressa = res.rows.find((r) => r.town === "Akuressa");
  assert.equal(akuressa.clientCount, 2);
  assert.equal(akuressa.hasPending, true);
  assert.equal(akuressa.hasOverdue, false);

  const akkaraipattu = res.rows.find((r) => r.town === "Akkaraipattu");
  assert.equal(akkaraipattu.clientCount, 1);
  assert.equal(akkaraipattu.hasPending, false);

  assert.equal(res.stats.multiClientTowns, 2); // Akuressa (2), Ampara (4)
  assert.equal(res.stats.fourClientHubs, 1);   // Ampara (4)
  assert.equal(res.stats.townsWithPending, 2);
  assert.equal(res.stats.townsWithOverdue, 1);
});

test("buildLocationMatrix: accurately sets site status (overdue, pending, done, active)", () => {
  const res = h.buildLocationMatrix(mockSites, mockPlans, { asOfDate: "2026-11-11" });
  const ampara = res.rows.find((r) => r.town === "Ampara");

  // Seylan is overdue
  const seylanItem = ampara.clients["Seylan Bank"][0];
  assert.equal(seylanItem.status, "overdue");
  assert.equal(seylanItem.isOverdue, true);

  // NYC is done
  const nycItem = ampara.clients["National Youth Corps"][0];
  assert.equal(nycItem.status, "done");
  assert.equal(nycItem.lastDone.service_call_number, "SC-1011");

  // SLT has no plan -> active
  const sltItem = ampara.clients["SLT-Mobitel"][0];
  assert.equal(sltItem.status, "active");
});

test("filterLocationMatrix: filters by query across town, client, branch, and phone", () => {
  const matrix = h.buildLocationMatrix(mockSites, mockPlans, { asOfDate: "2026-11-11" });

  const byTown = h.filterLocationMatrix(matrix, { search: "aku" });
  assert.equal(byTown.rows.length, 1);
  assert.equal(byTown.rows[0].town, "Akuressa");

  const byPhone = h.filterLocationMatrix(matrix, { search: "0672277123" });
  assert.equal(byPhone.rows.length, 1);
  assert.equal(byPhone.rows[0].town, "Akkaraipattu");

  const bySc = h.filterLocationMatrix(matrix, { search: "SC-1011" });
  assert.equal(bySc.rows.length, 1);
  assert.equal(bySc.rows[0].town, "Ampara");
});

test("filterLocationMatrix: filters by status and hub levels", () => {
  const matrix = h.buildLocationMatrix(mockSites, mockPlans, { asOfDate: "2026-11-11" });

  const pending = h.filterLocationMatrix(matrix, { filter: "pending" });
  assert.equal(pending.rows.length, 2); // Ampara, Akuressa

  const overdue = h.filterLocationMatrix(matrix, { filter: "overdue" });
  assert.equal(overdue.rows.length, 1); // Ampara

  const multi = h.filterLocationMatrix(matrix, { filter: "multi" });
  assert.equal(multi.rows.length, 2); // Akuressa, Ampara

  const four = h.filterLocationMatrix(matrix, { filter: "four" });
  assert.equal(four.rows.length, 1); // Ampara
});
