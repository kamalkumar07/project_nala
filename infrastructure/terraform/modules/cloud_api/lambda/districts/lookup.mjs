import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";

const s3 = new S3Client({
  region: process.env.AWS_REGION
});

const BUCKET_NAME = process.env.UPLOADS_BUCKET_NAME;
const DISTRICTS_KEY = "reference-data/himachal/districts.geojson";

let districtsCache = null;

async function loadDistricts() {
  if (districtsCache) {
    return districtsCache;
  }

  const result = await s3.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: DISTRICTS_KEY
    })
  );

  const body = await result.Body.transformToString();
  const geojson = JSON.parse(body);

  if (
    geojson.type !== "FeatureCollection" ||
    !Array.isArray(geojson.features) ||
    geojson.features.length !== 12
  ) {
    throw new Error("Invalid Himachal Pradesh district dataset");
  }

  districtsCache = geojson.features;
  return districtsCache;
}

export function findDistrictInGeoJSON(districts, lat, lng) {
  if (!Array.isArray(districts)) {
    throw new TypeError("District features must be an array");
  }

  if (
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90 ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180
  ) {
    throw new TypeError("Valid latitude and longitude are required");
  }

  const location = point([lng, lat]);

  for (const district of districts) {
    const geometryType = district.geometry?.type;

    if (
      (geometryType === "Polygon" ||
        geometryType === "MultiPolygon") &&
      booleanPointInPolygon(location, district)
    ) {
      return {
        district: district.properties.district,
        districtCode: district.properties.district_code,
        districtLgd: district.properties.district_lgd
      };
    }
  }

  return null;
}

export async function findDistrict(lat, lng) {
  const districts = await loadDistricts();
  return findDistrictInGeoJSON(districts, lat, lng);
}
