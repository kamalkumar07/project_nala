import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";

const s3 = new S3Client({
  region: process.env.AWS_REGION
});

const BUCKET_NAME = process.env.UPLOADS_BUCKET_NAME;
const WARDS_KEY = "reference-data/delhi-mcd-2022.geojson";

let wardsCache = null;

async function loadWards() {
  if (wardsCache) {
    return wardsCache;
  }

  const result = await s3.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: WARDS_KEY
    })
  );

  const body = await result.Body.transformToString();
  const geojson = JSON.parse(body);

  if (
    geojson.type !== "FeatureCollection" ||
    !Array.isArray(geojson.features) ||
    geojson.features.length !== 250
  ) {
    throw new Error("Invalid Delhi ward dataset");
  }

  wardsCache = geojson.features;

  return wardsCache;
}

export async function findWard(lat, lng) {
  const wards = await loadWards();

  const location = point([lng, lat]);

  for (const ward of wards) {
    if (
      ward.geometry?.type === "Polygon" &&
      booleanPointInPolygon(location, ward)
    ) {
      return {
        wardNo: ward.properties.ward_no,
        wardName: ward.properties.ward_name
      };
    }
  }

  return null;
}
