import test from "node:test";
import assert from "node:assert/strict";

import { findDistrictInGeoJSON } from "./lookup.mjs";

const shimlaPolygon = {
  type: "Feature",
  properties: {
    district: "TestDistrict",
    district_code: "TD01",
    district_lgd: "999"
  },
  geometry: {
    type: "Polygon",
    coordinates: [[
      [77, 31],
      [78, 31],
      [78, 32],
      [77, 32],
      [77, 31]
    ]]
  }
};

test("returns the matching district for a point inside a polygon", () => {
  const result = findDistrictInGeoJSON([shimlaPolygon], 31.5, 77.5);

  assert.deepEqual(result, {
    district: "TestDistrict",
    districtCode: "TD01",
    districtLgd: "999"
  });
});

test("returns null when a point is outside every district", () => {
  const result = findDistrictInGeoJSON([shimlaPolygon], 35, 80);

  assert.equal(result, null);
});

test("supports MultiPolygon geometry", () => {
  const multiPolygon = {
    ...shimlaPolygon,
    geometry: {
      type: "MultiPolygon",
      coordinates: [
        [[
          [77, 31],
          [78, 31],
          [78, 32],
          [77, 32],
          [77, 31]
        ]]
      ]
    }
  };

  const result = findDistrictInGeoJSON([multiPolygon], 31.5, 77.5);

  assert.equal(result?.district, "TestDistrict");
});

test("rejects invalid coordinates", () => {
  assert.throws(
    () => findDistrictInGeoJSON([shimlaPolygon], 91, 77.5),
    /Valid latitude and longitude are required/
  );

  assert.throws(
    () => findDistrictInGeoJSON([shimlaPolygon], 31.5, 181),
    /Valid latitude and longitude are required/
  );
});

test("rejects a non-array district dataset", () => {
  assert.throws(
    () => findDistrictInGeoJSON(null, 31.5, 77.5),
    /District features must be an array/
  );
});
