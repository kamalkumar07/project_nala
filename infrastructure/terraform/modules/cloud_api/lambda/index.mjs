import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand
} from "@aws-sdk/lib-dynamodb";
import ngeohash from "ngeohash";

const s3 = new S3Client({
  region: process.env.AWS_REGION
});

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION
});

const dynamo = DynamoDBDocumentClient.from(dynamoClient);

const BUCKET_NAME = process.env.UPLOADS_BUCKET_NAME;
const REPORTS_TABLE_NAME = process.env.REPORTS_TABLE_NAME;
const SUBSCRIPTIONS_TABLE_NAME = process.env.SUBSCRIPTIONS_TABLE_NAME;

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

  if (routeKey === "POST /cloud/reports") {
    try {
      const body = JSON.parse(event.body || "{}");

      const photoKey = body.photoKey;
      const lat = body.lat;
      const lng = body.lng;
      const note = body.note;
      const clientTimestamp = body.clientTimestamp;

      if (
        !photoKey ||
        typeof lat !== "number" ||
        typeof lng !== "number"
      ) {
        return response(400, {
          error: "VALIDATION_ERROR",
          message: "photoKey, lat and lng are required"
        });
      }

      if (note !== undefined && typeof note !== "string") {
        return response(400, {
          error: "VALIDATION_ERROR",
          message: "note must be a string"
        });
      }

      if (note && note.length > 280) {
        return response(400, {
          error: "VALIDATION_ERROR",
          message: "note must be 280 characters or less"
        });
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return response(400, {
          error: "VALIDATION_ERROR",
          message: "Invalid latitude or longitude"
        });
      }

      const reportId = `rpt_${crypto.randomUUID()}`;
      const reportToken = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const geohash = ngeohash.encode(lat, lng, 7);

      const item = {
        reportId,
        reportToken,
        photoKey,
        lat,
        lng,
        geohash,
        note: note || null,
        clientTimestamp: clientTimestamp || null,
        createdAt,
        status: "analyzing",
        opsStatus: "open"
      };

      await dynamo.send(
        new PutCommand({
          TableName: REPORTS_TABLE_NAME,
          Item: item,
          ConditionExpression: "attribute_not_exists(reportId)"
        })
      );

      return response(201, {
        reportId,
        status: "analyzing",
        reportToken
      });
    } catch (error) {
      console.error("Create report error:", error);

      return response(500, {
        error: "REPORT_CREATE_ERROR",
        message: "Unable to create report"
      });
    }
  }

  if (routeKey === "GET /cloud/reports/{id}") {
    try {
      const reportId = event.pathParameters?.id;

      if (!reportId) {
        return response(400, {
          error: "VALIDATION_ERROR",
          message: "Report ID is required"
        });
      }

      const result = await dynamo.send(
        new GetCommand({
          TableName: REPORTS_TABLE_NAME,
          Key: {
            reportId
          }
        })
      );

      if (!result.Item) {
        return response(404, {
          error: "NOT_FOUND",
          message: "Report not found"
        });
      }

      return response(200, result.Item);
    } catch (error) {
      console.error("Get report error:", error);

      return response(500, {
        error: "REPORT_GET_ERROR",
        message: "Unable to retrieve report"
      });
    }
  }

  if (routeKey === "GET /cloud/reports") {
    try {
      const query = event.queryStringParameters || {};

      const geohash = query.geohash;
      const limit = Math.min(
        Math.max(Number.parseInt(query.limit || "20", 10), 1),
        50
      );

      if (!geohash) {
        return response(400, {
          error: "VALIDATION_ERROR",
          message: "geohash is required"
        });
      }

      const result = await dynamo.send(
        new QueryCommand({
          TableName: REPORTS_TABLE_NAME,
          IndexName: "geohash-createdAt-index",
          KeyConditionExpression: "geohash = :geohash",
          ExpressionAttributeValues: {
            ":geohash": geohash
          },
          ScanIndexForward: false,
          Limit: limit,
          ExclusiveStartKey: decodeCursor(query.cursor)
        })
      );

      return response(200, {
        items: result.Items || [],
        nextCursor: result.LastEvaluatedKey
          ? encodeCursor(result.LastEvaluatedKey)
          : null
      });
    } catch (error) {
      console.error("List reports error:", error);

      return response(500, {
        error: "REPORT_LIST_ERROR",
        message: "Unable to list reports"
      });
    }
  }

  if (routeKey === "PATCH /cloud/reports/{id}") {
    try {
      const reportId = event.pathParameters?.id;

      if (!reportId) {
        return response(400, {
          error: "VALIDATION_ERROR",
          message: "Report ID is required"
        });
      }

      const body = JSON.parse(event.body || "{}");

      const userConfirmed = body.userConfirmed;
      const userDepthClass = body.userDepthClass;
      const reportToken = body.reportToken;
      const opsStatus = body.opsStatus;

      const isCitizenUpdate =
        userConfirmed !== undefined ||
        userDepthClass !== undefined;

      const isOpsUpdate = opsStatus !== undefined;

      if (!isCitizenUpdate && !isOpsUpdate) {
        return response(400, {
          error: "VALIDATION_ERROR",
          message: "No supported fields provided"
        });
      }

      if (isCitizenUpdate) {
        if (typeof userConfirmed !== "boolean") {
          return response(400, {
            error: "VALIDATION_ERROR",
            message: "userConfirmed must be boolean"
          });
        }

        if (!reportToken || typeof reportToken !== "string") {
          return response(400, {
            error: "VALIDATION_ERROR",
            message: "reportToken is required"
          });
        }

        if (
          userDepthClass !== undefined &&
          !["ankle", "knee", "waist", "no_flood"].includes(userDepthClass)
        ) {
          return response(400, {
            error: "VALIDATION_ERROR",
            message: "Invalid userDepthClass"
          });
        }

        if (userConfirmed && !userDepthClass) {
          return response(400, {
            error: "VALIDATION_ERROR",
            message: "userDepthClass is required when userConfirmed is true"
          });
        }

        const result = await dynamo.send(
          new UpdateCommand({
            TableName: REPORTS_TABLE_NAME,
            Key: {
              reportId
            },
            UpdateExpression:
              "SET userConfirmed = :confirmed, userDepthClass = :depthClass",
            ConditionExpression:
              "attribute_exists(reportId) AND reportToken = :token",
            ExpressionAttributeValues: {
              ":confirmed": userConfirmed,
              ":depthClass": userDepthClass || null,
              ":token": reportToken
            },
            ReturnValues: "ALL_NEW"
          })
        );

        return response(200, result.Attributes);
      }

      if (isOpsUpdate) {
        if (!["open", "dispatched", "resolved"].includes(opsStatus)) {
          return response(400, {
            error: "VALIDATION_ERROR",
            message: "Invalid opsStatus"
          });
        }

        const result = await dynamo.send(
          new UpdateCommand({
            TableName: REPORTS_TABLE_NAME,
            Key: {
              reportId
            },
            UpdateExpression: "SET opsStatus = :opsStatus",
            ConditionExpression: "attribute_exists(reportId)",
            ExpressionAttributeValues: {
              ":opsStatus": opsStatus
            },
            ReturnValues: "ALL_NEW"
          })
        );

        return response(200, result.Attributes);
      }
    } catch (error) {
      console.error("Update report error:", error);

      if (error.name === "ConditionalCheckFailedException") {
        return response(403, {
          error: "FORBIDDEN",
          message: "Report token is invalid or report does not exist"
        });
      }

      return response(500, {
        error: "REPORT_UPDATE_ERROR",
        message: "Unable to update report"
      });
    }
  }

  if (routeKey === "POST /cloud/subscriptions") {
    try {
      const body = JSON.parse(event.body || "{}");

      const channel = body.channel;
      const email = body.email;
      const pushSubscription = body.pushSubscription;
      const lat = body.lat;
      const lng = body.lng;
      const radiusM = body.radiusM ?? 1000;
      const minBand = body.minBand ?? "high";

      if (!["email", "push"].includes(channel)) {
        return response(400, {
          error: "VALIDATION_ERROR",
          message: "channel must be email or push"
        });
      }

      if (channel === "email") {
        if (!email || typeof email !== "string" || !email.includes("@")) {
          return response(400, {
            error: "VALIDATION_ERROR",
            message: "Valid email is required for email subscriptions"
          });
        }
      }

      if (channel === "push") {
        if (
          !pushSubscription ||
          typeof pushSubscription !== "object"
        ) {
          return response(400, {
            error: "VALIDATION_ERROR",
            message: "pushSubscription is required for push subscriptions"
          });
        }
      }

      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return response(400, {
          error: "VALIDATION_ERROR",
          message: "Valid lat and lng are required"
        });
      }

      if (
        !Number.isFinite(radiusM) ||
        radiusM < 250 ||
        radiusM > 5000
      ) {
        return response(400, {
          error: "VALIDATION_ERROR",
          message: "radiusM must be between 250 and 5000"
        });
      }

      if (!["moderate", "high", "severe"].includes(minBand)) {
        return response(400, {
          error: "VALIDATION_ERROR",
          message: "minBand must be moderate, high, or severe"
        });
      }

      const subscriptionId = `sub_${crypto.randomUUID()}`;
      const createdAt = new Date().toISOString();

      const item = {
        subscriptionId,
        channel,
        email: channel === "email" ? email : null,
        pushSubscription:
          channel === "push" ? pushSubscription : null,
        lat,
        lng,
        radiusM,
        minBand,
        createdAt
      };

      await dynamo.send(
        new PutCommand({
          TableName: SUBSCRIPTIONS_TABLE_NAME,
          Item: item,
          ConditionExpression: "attribute_not_exists(subscriptionId)"
        })
      );

      return response(201, {
        subscriptionId,
        channel,
        radiusM,
        minBand
      });
    } catch (error) {
      console.error("Create subscription error:", error);

      return response(500, {
        error: "SUBSCRIPTION_CREATE_ERROR",
        message: "Unable to create subscription"
      });
    }
  }

  if (routeKey === "DELETE /cloud/subscriptions/{id}") {
    try {
      const subscriptionId = event.pathParameters?.id;

      if (!subscriptionId) {
        return response(400, {
          error: "VALIDATION_ERROR",
          message: "subscriptionId is required"
        });
      }

      await dynamo.send(
        new DeleteCommand({
          TableName: SUBSCRIPTIONS_TABLE_NAME,
          Key: {
            subscriptionId
          },
          ConditionExpression: "attribute_exists(subscriptionId)"
        })
      );

      return {
        statusCode: 204,
        headers: {
          "Content-Type": "application/json"
        },
        body: ""
      };
    } catch (error) {
      if (error.name === "ConditionalCheckFailedException") {
        return response(404, {
          error: "NOT_FOUND",
          message: "Subscription not found"
        });
      }

      console.error("Delete subscription error:", error);

      return response(500, {
        error: "SUBSCRIPTION_DELETE_ERROR",
        message: "Unable to delete subscription"
      });
    }
  }

  return response(404, {
    error: "NOT_FOUND",
    message: "Route not found"
  });
};

function encodeCursor(key) {
  return Buffer.from(JSON.stringify(key)).toString("base64url");
}

function decodeCursor(cursor) {
  if (!cursor) {
    return undefined;
  }

  try {
    return JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    );
  } catch {
    return undefined;
  }
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}
