import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { assessRiskV1 } from "../v1-engine.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(
  here,
  "../fixtures/golden_cases.json"
);

const goldenCases = JSON.parse(
  await readFile(fixturePath, "utf8")
);

function assertClose(actual, expected, tolerance, label) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected} ± ${tolerance}, received ${actual}`
  );
}

function compareExpected(actual, expected, label = "output") {
  if (typeof expected === "number") {
    const tolerance = label.endsWith(".score") ? 0.0051 : 0.00011;
    assertClose(actual, expected, tolerance, label);
    return;
  }

  if (expected === null || typeof expected !== "object") {
    assert.equal(actual, expected, label);
    return;
  }

  for (const key of Object.keys(expected)) {
    assert.ok(
      actual !== null &&
        actual !== undefined &&
        Object.hasOwn(actual, key),
      `${label}.${key}: missing actual value`
    );

    compareExpected(actual[key], expected[key], `${label}.${key}`);
  }
}

test("golden fixture contains 12 uniquely named cases", () => {
  assert.equal(goldenCases.length, 12);

  const ids = goldenCases.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
});

for (const scenario of goldenCases) {
  test(`golden case: ${scenario.id}`, () => {
    const actual = assessRiskV1({
      ...scenario.input,
      district: scenario.expected_output.location.district,
    });

    compareExpected(actual, scenario.expected_output, scenario.id);
  });
}

test("rejects invalid latitude", () => {
  assert.throws(
    () => assessRiskV1({ latitude: 91, longitude: 77 }),
    /Valid latitude and longitude are required/
  );
});

test("rejects invalid longitude", () => {
  assert.throws(
    () => assessRiskV1({ latitude: 31, longitude: 181 }),
    /Valid latitude and longitude are required/
  );
});

test("rejects missing coordinates", () => {
  assert.throws(
    () => assessRiskV1({}),
    /Valid latitude and longitude are required/
  );
});

test("all missing environmental inputs produce an insufficient-data status", () => {
  const result = assessRiskV1({
    latitude: 31.1048,
    longitude: 77.1734,
    district: "Shimla"
  });

  assert.equal(result.flood.confidence, 0);
  assert.equal(result.landslide.confidence, 0);
  assert.equal(result.modelVersion, "V1");
  assert.equal(result.assessmentStatus, "INSUFFICIENT_DATA");

  // Missing measurements must not imply no water or a safe route.
  assert.equal(result.flood.water_depth, "UNKNOWN");
  assert.equal(result.flood.passability, "undetermined");
});
