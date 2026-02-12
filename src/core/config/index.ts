import dotenv from "dotenv";

// Load environment variables
const result = dotenv.config();

// Handle .env loading errors
if (result.error) {
  if (result.error.message.includes("ENOENT")) {
    if (process.env.NODE_ENV !== "production") {
      throw new Error(
        "⚠️  .env file not found. Please create one based on .env.example",
      );
    } else {
      console.warn(
        "⚠️  .env file not found. Using provided environment variables.",
      );
    }
  } else {
    throw new Error(`Failed to load .env file: ${result.error.message}`);
  }
}

// Validate and parse configuration
export const config = {
  server: {
    port: parseInt(process.env.PORT || "3030"),
    env: process.env.NODE_ENV,
    isProduction: process.env.NODE_ENV === "production",
    isDevelopment: process.env.NODE_ENV === "development",
    isTest: process.env.NODE_ENV === "test",
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "120000"),
  },
  database: {
    url: process.env.DATABASE_URL,
    logging: process.env.DB_LOGGING === "true",
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || "2"),
      max: parseInt(process.env.DB_POOL_MAX || "10"),
    },
  },
  security: {
    cors: {
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || ["*"],
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
      max: parseInt(process.env.RATE_LIMIT_MAX || "100"),
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      issuer: process.env.JWT_ISSUER || "ignitor-app",
    },
  },
  // Added Default Admin section from .env
  defaultAdmin: {
    email: process.env.DEFAULT_ADMIN_EMAIL,
    password: process.env.DEFAULT_ADMIN_PASSWORD,
  },
  aws: {
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
  email: {
    awsRegion: process.env.AWS_REGION, // Reusing AWS_REGION as per .env usage
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    defaultFromEmail: process.env.DEFAULT_FROM_EMAIL,
    defaultReplyToEmail: process.env.DEFAULT_REPLY_TO_EMAIL,
    templatePath: process.env.EMAIL_TEMPLATE_PATH,
    defaultFromName: process.env.DEFAULT_FROM_NAME,
  },
  logging: {
    level: process.env.LOG_LEVEL || "info",
    file: {
      enabled: process.env.LOG_TO_FILE === "true",
      path: process.env.LOG_FILE_PATH || "logs/app.log",
    },
  },
  // Optional: Kept these in case you add them to .env later, otherwise they return empty strings
  s3: {
    privateVideosBucket: process.env.AWS_S3_PRIVATE_VIDEOS_BUCKET_NAME || "",
    defaultBucket: process.env.AWS_S3_DEFAULT_BUCKET_NAME || "",
  },
  cloudFront: {
    cloudFrontDomain: process.env.AWS_CLOUDFRONT_DOMAIN || "",
    cloudFrontKeyPairId: process.env.AWS_CLOUDFRONT_KEY_PAIR_ID || "",
    cloudFrontPrivateKey:
      process.env.AWS_CLOUDFRONT_PRIVATE_KEY?.replace(/\\n/g, "\n") || "",
    cloudFrontPublicDomain: process.env.AWS_CLOUDFRONT_DOMAIN_PUBLIC || "",
  },
  tapPayment: {
    tap_secret_key: process.env.TAP_SECRET_KEY || "",
    tap_webhook_url: process.env.TAP_WEBHOOK_URL || "",
  },
  ticketmaster: {
    ticket_master_api_key: process.env.TICKETMASTER_API_KEY,
    ticket_master_venues_url: process.env.TICKET_MASTER_VENUES_URL,
    ticket_master_events_url: process.env.TICKET_MASTER_EVENTS_URL,
  },
};

export default config;
