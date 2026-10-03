import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION
});

const BUCKET_NAME = process.env.UPLOADS_BUCKET_NAME;

export const handler = async (event) => {
  const routeKey = event.routeKey;

  if (routeKey === "GET /cloud/health") {
    return response(200, {
      service: "nala-cloud-api",
      status: "ok",
      environment: process.env.ENVIRONMENT
    });
  }

  if (routeKey === "POST /cloud/uploads/presign") {
    try {
      const body = JSON.parse(event.body || "{}");

      const fileName = body.file_name;
      const contentType = body.content_type;

      if (!fileName || !contentType) {
        return response(400, {
          error: "VALIDATION_ERROR",
          message: "file_name and content_type are required"
        });
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
      ];

      if (!allowedTypes.includes(contentType)) {
        return response(400, {
          error: "VALIDATION_ERROR",
          message: "Unsupported image type"
        });
      }

      const extension = fileName.split(".").pop()?.toLowerCase() || "jpg";

      const objectKey = `reports/${crypto.randomUUID()}.${extension}`;

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: objectKey,
        ContentType: contentType
      });

      const uploadUrl = await getSignedUrl(s3, command, {
        expiresIn: 300
      });

      return response(200, {
        upload_url: uploadUrl,
        object_key: objectKey,
        expires_in: 300
      });
    } catch (error) {
      console.error("Presign error:", error);

      return response(500, {
        error: "PRESIGN_ERROR",
        message: "Unable to generate upload URL"
      });
    }
  }

  return response(404, {
    error: "NOT_FOUND",
    message: "Route not found"
  });
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}
