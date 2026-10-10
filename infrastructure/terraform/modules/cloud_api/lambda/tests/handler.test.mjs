import test from "node:test";
import assert from "node:assert/strict";
import { S3Client } from "@aws-sdk/client-s3";

process.env.AWS_REGION ??= "ap-south-1";
process.env.UPLOADS_BUCKET_NAME ??= "nala-upload-dev-689324611366";

const { handler } = await import("../index.mjs");

test("GET /cloud/health returns HTTP 200", async () => {
  const result = await handler({
    routeKey: "GET /cloud/health"
  });

  assert.equal(result.statusCode, 200);

  const body = JSON.parse(result.body);

  assert.equal(body.service, "nala-cloud-api");
  assert.equal(body.status, "ok");
});

test("V1 risk endpoint rejects an invalid latitude", async () => {
  const result = await handler({
    routeKey: "GET /cloud/risk",
    queryStringParameters: {
      lat: "91",
      lng: "77.1734",
      modelVersion: "V1"
    }
  });

  assert.equal(result.statusCode, 400);

  const body = JSON.parse(result.body);

  assert.equal(body.error, "VALIDATION_ERROR");
});

test("V1 risk endpoint rejects an invalid longitude", async () => {
  const result = await handler({
    routeKey: "GET /cloud/risk",
    queryStringParameters: {
      lat: "31.1048",
      lng: "181",
      modelVersion: "V1"
    }
  });

  assert.equal(result.statusCode, 400);

  const body = JSON.parse(result.body);

  assert.equal(body.error, "VALIDATION_ERROR");
});

test("V1 rejects negative one-day rainfall", async () => {
  const result = await handler({
    routeKey: "GET /cloud/risk",
    queryStringParameters: {
      lat: "31.1048",
      lng: "77.1734",
      modelVersion: "V1",
      rainfall_1d_mm: "-5"
    }
  });

  assert.equal(result.statusCode, 400);

  const body = JSON.parse(result.body);
  assert.equal(body.error, "VALIDATION_ERROR");
  assert.match(body.message, /non-negative/);
});

test("V1 rejects slope greater than 90 degrees", async () => {
  const result = await handler({
    routeKey: "GET /cloud/risk",
    queryStringParameters: {
      lat: "31.1048",
      lng: "77.1734",
      modelVersion: "V1",
      slope_deg: "91"
    }
  });

  assert.equal(result.statusCode, 400);

  const body = JSON.parse(result.body);
  assert.equal(body.error, "VALIDATION_ERROR");
  assert.match(body.message, /between 0 and 90/);
});

test("V1 rejects an invalid water-depth category", async () => {
  const result = await handler({
    routeKey: "GET /cloud/risk",
    queryStringParameters: {
      lat: "31.1048",
      lng: "77.1734",
      modelVersion: "V1",
      reported_water_depth: "BUILDING"
    }
  });

  assert.equal(result.statusCode, 400);

  const body = JSON.parse(result.body);
  assert.equal(body.error, "VALIDATION_ERROR");
  assert.match(body.message, /recognized depth category/);
});

test("legacy risk endpoint remains available without V1 opt-in", async () => {
  const result = await handler({
    routeKey: "GET /cloud/risk",
    queryStringParameters: {
      lat: "31.1048",
      lng: "77.1734",
      rainfall: "20",
      elevation: "2200",
      recentReports: "2"
    }
  });

  assert.equal(result.statusCode, 200);

  const body = JSON.parse(result.body);

  assert.equal(typeof body.riskScore, "number");
  assert.ok(["LOW", "MEDIUM", "HIGH"].includes(body.riskBand));
  assert.equal(body.modelVersion, undefined);
});

test("V1 API returns assessment status when environmental inputs are missing", async () => {
  const originalSend = S3Client.prototype.send;

  const polygon = {
    type: "Polygon",
    coordinates: [[
      [77.0, 31.0],
      [78.0, 31.0],
      [78.0, 32.0],
      [77.0, 32.0],
      [77.0, 31.0]
    ]]
  };

  const features = Array.from({ length: 12 }, (_, index) => ({
    type: "Feature",
    properties: {
      district: index === 0 ? "Shimla" : `District${index}`,
      district_code: String(index + 1),
      district_lgd: String(index + 1)
    },
    geometry: polygon
  }));

  S3Client.prototype.send = async () => ({
    Body: {
      transformToString: async () =>
        JSON.stringify({
          type: "FeatureCollection",
          features
        })
    }
  });

  try {
    const result = await handler({
      routeKey: "GET /cloud/risk",
      queryStringParameters: {
        lat: "31.1048",
        lng: "77.1734",
        modelVersion: "V1"
      }
    });

    assert.equal(result.statusCode, 200);

    const body = JSON.parse(result.body);

    assert.equal(body.modelVersion, "V1");
    assert.equal(body.assessmentStatus, "INSUFFICIENT_DATA");
    assert.equal(body.modelStatus, "PROVISIONAL");
    assert.equal(body.location.district, "Shimla");
    assert.equal(body.flood.score, null);
    assert.equal(body.flood.band, null);
    assert.equal(body.flood.water_depth, "UNKNOWN");
    assert.equal(body.flood.passability, "undetermined");
    assert.equal(body.landslide.score, null);
    assert.equal(body.landslide.band, null);
    assert.ok(body.evidenceNote);
  } finally {
    S3Client.prototype.send = originalSend;
  }
});
