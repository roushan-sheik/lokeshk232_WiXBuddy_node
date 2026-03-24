import { config } from "@/core/config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl as getCloudfrontSignedUrl } from "@aws-sdk/cloudfront-signer";

import { v4 as uuidv4 } from "uuid";

interface S3Config {
  region?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  defaultBucket?: string;
}

interface UploadOptions {
  bucket?: string;
  key?: string;
  contentType?: string;
  metadata?: Record<string, string>;
  expires?: number; // in seconds
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
}

interface MultipartUploadOptions extends UploadOptions {
  partSize?: number; // in bytes
  queueSize?: number;
}

interface PresignedUrlResponse {
  uploadUrl: string;
  key: string;
  bucket: string;
  expires: number;
  uploadId?: string;
}

interface MultipartUploadSession {
  uploadId: string;
  key: string;
  bucket: string;
  partSize: number;
  totalParts: number;
}

interface FileValidationResult {
  isValid: boolean;
  errors: string[];
}

export class S3StorageService {
  private s3: S3Client;
  private defaultBucket: string;
  private defaultRegion: string;

  constructor(s3Config: S3Config = {}) {
    this.defaultRegion =
      s3Config.region ||
      config.aws.region ||
      process.env.AWS_REGION ||
      "us-east-1";
    this.defaultBucket =
      s3Config.defaultBucket ||
      config.s3.defaultBucket ||
      process.env.S3_DEFAULT_BUCKET ||
      "";

    this.s3 = new S3Client({
      region: this.defaultRegion,
      credentials: {
        accessKeyId:
          s3Config.awsAccessKeyId ||
          config.aws.accessKeyId ||
          process.env.AWS_ACCESS_KEY_ID ||
          "",
        secretAccessKey:
          s3Config.awsSecretAccessKey ||
          config.aws.secretAccessKey ||
          process.env.AWS_SECRET_ACCESS_KEY ||
          "",
      },
    });
  }

  /**
   * Generate a unique S3 key for file uploads
   */
  public generateKey(
    prefix: string,
    filename: string,
    includeTimestamp: boolean = true,
  ): string {
    const timestamp = includeTimestamp ? Date.now() : "";
    const uuid = uuidv4();
    const extension = filename.split(".").pop();
    return `${prefix}/${timestamp}-${uuid}.${extension}`;
  }

  /**
   * Validate file before upload
   */
  validateFile(
    filename: string,
    fileSize: number,
    contentType: string,
    options: UploadOptions = {},
  ): FileValidationResult {
    const errors: string[] = [];

    // Check file size
    const maxSize = options.maxFileSize || 500 * 1024 * 1024; // 500MB default
    if (fileSize > maxSize) {
      errors.push(
        `File size ${this.formatBytes(
          fileSize,
        )} exceeds maximum allowed size of ${this.formatBytes(maxSize)}`,
      );
    }

    if (fileSize < 1024) {
      // 1KB minimum
      errors.push("File size too small");
    }

    // Check content type
    if (options.allowedTypes && options.allowedTypes.length > 0) {
      if (!options.allowedTypes.includes(contentType)) {
        errors.push(
          `File type ${contentType} is not allowed. Allowed types: ${options.allowedTypes.join(
            ", ",
          )}`,
        );
      }
    }

    // Check filename
    if (!filename || filename.length === 0) {
      errors.push("Filename is required");
    }

    const dangerousExtensions = [
      ".exe",
      ".bat",
      ".cmd",
      ".scr",
      ".pif",
      ".js",
      ".jar",
    ];
    const fileExtension = "." + filename.split(".").pop()?.toLowerCase();
    if (dangerousExtensions.includes(fileExtension)) {
      errors.push("File type is not allowed for security reasons");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create presigned URL for direct client upload
   */
  async createPresignedUploadUrl(
    filename: string,
    fileSize: number,
    contentType: string,
    options: UploadOptions = {},
  ): Promise<PresignedUrlResponse> {
    // Validate file first
    const validation = this.validateFile(
      filename,
      fileSize,
      contentType,
      options,
    );
    if (!validation.isValid) {
      throw new Error(
        `File validation failed: ${validation.errors.join(", ")}`,
      );
    }

    const bucket = options.bucket || this.defaultBucket;
    const key = options.key || this.generateKey("uploads", filename);
    const expires = options.expires || 3600; // 1 hour default

    if (!bucket) {
      throw new Error("Bucket name is required");
    }

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      Metadata: {
        "original-filename": filename,
        "upload-timestamp": Date.now().toString(),
        ...options.metadata,
      },
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: expires,
    });

    return {
      uploadUrl,
      key,
      bucket,
      expires,
    };
  }

  /**
   * Direct upload file using buffer/stream
   */
  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    contentType: string,
    options: UploadOptions = {},
  ): Promise<{ key: string; location: string; etag: string }> {
    // Validate file
    const validation = this.validateFile(
      filename,
      fileBuffer.length,
      contentType,
      options,
    );
    if (!validation.isValid) {
      throw new Error(
        `File validation failed: ${validation.errors.join(", ")}`,
      );
    }

    const bucket = options.bucket || this.defaultBucket;
    const key = options.key || this.generateKey("uploads", filename);

    if (!bucket) {
      throw new Error("Bucket name is required");
    }

    // Use AWS SDK v3 Upload class for better handling
    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: {
          "original-filename": filename,
          "upload-timestamp": Date.now().toString(),
          ...options.metadata,
        },
      },
      queueSize: 4,
      partSize: 1024 * 1024 * 10, // 10MB parts
      leavePartsOnError: false,
    });

    const result = await upload.done();

    return {
      key,
      location: result.Location!,
      etag: result.ETag!,
    };
  }

  /**
   * Initiate multipart upload for large files
   */
  async initiateMultipartUpload(
    filename: string,
    fileSize: number,
    contentType: string,
    options: MultipartUploadOptions = {},
  ): Promise<MultipartUploadSession> {
    // Validate file
    const validation = this.validateFile(
      filename,
      fileSize,
      contentType,
      options,
    );
    if (!validation.isValid) {
      throw new Error(
        `File validation failed: ${validation.errors.join(", ")}`,
      );
    }

    const bucket = options.bucket || this.defaultBucket;
    const key = options.key || this.generateKey("uploads", filename);
    const partSize = options.partSize || 10 * 1024 * 1024; // 10MB default

    if (!bucket) {
      throw new Error("Bucket name is required");
    }

    const command = new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      Metadata: {
        "original-filename": filename,
        "upload-timestamp": Date.now().toString(),
        "file-size": fileSize.toString(),
        ...options.metadata,
      },
    });

    const result = await this.s3.send(command);

    if (!result.UploadId) {
      throw new Error("Failed to initiate multipart upload");
    }

    const totalParts = Math.ceil(fileSize / partSize);

    return {
      uploadId: result.UploadId,
      key,
      bucket,
      partSize,
      totalParts,
    };
  }

  /**
   * Generate presigned URL for uploading a specific part
   */
  async createPresignedPartUploadUrl(
    bucket: string,
    key: string,
    uploadId: string,
    partNumber: number,
    expires: number = 3600,
  ): Promise<string> {
    const command = new UploadPartCommand({
      Bucket: bucket,
      Key: key,
      PartNumber: partNumber,
      UploadId: uploadId,
    });

    return await getSignedUrl(this.s3, command, { expiresIn: expires });
  }

  /**
   * Generate signed CloudFront URL for video streaming
   */
  async generateCloudFrontSignedUrl({
    url,
    privateKey,
    keyPairId,
    expiresIn = 3600, // 1 hour
  }: {
    url: string;
    privateKey: string;
    keyPairId: string;
    expiresIn?: number;
  }): Promise<string> {
    return getCloudfrontSignedUrl({
      url,
      keyPairId,
      privateKey,
      dateLessThan: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });
  }

  /**
   * Complete multipart upload
   */
  async completeMultipartUpload(
    bucket: string,
    key: string,
    uploadId: string,
    parts: Array<{ PartNumber: number; ETag: string }>,
  ): Promise<{ location: string; etag: string }> {
    const command = new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
      },
    });

    const result = await this.s3.send(command);

    if (!result.Location || !result.ETag) {
      throw new Error("Failed to complete multipart upload");
    }

    return {
      location: result.Location,
      etag: result.ETag,
    };
  }

  /**
   * Abort multipart upload (cleanup)
   */
  async abortMultipartUpload(
    bucket: string,
    key: string,
    uploadId: string,
  ): Promise<void> {
    const command = new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
    });

    await this.s3.send(command);
  }

  /**
   * List uploaded parts of a multipart upload
   */
  async listUploadedParts(
    bucket: string,
    key: string,
    uploadId: string,
  ): Promise<Array<{ PartNumber: number; ETag: string; Size: number }>> {
    const command = new ListPartsCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
    });

    const result = await this.s3.send(command);

    return (result.Parts || []).map((part) => ({
      PartNumber: part.PartNumber!,
      ETag: part.ETag!,
      Size: part.Size!,
    }));
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(key: string, bucket?: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucket || this.defaultBucket,
        Key: key,
      });

      await this.s3.send(command);
      return true;
    } catch (error: any) {
      if (
        error.name === "NotFound" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(
    key: string,
    bucket?: string,
  ): Promise<{
    size: number;
    lastModified: Date;
    contentType: string;
    etag: string;
    metadata: Record<string, string>;
  }> {
    const command = new HeadObjectCommand({
      Bucket: bucket || this.defaultBucket,
      Key: key,
    });

    const result = await this.s3.send(command);

    return {
      size: result.ContentLength || 0,
      lastModified: result.LastModified!,
      contentType: result.ContentType || "",
      etag: result.ETag || "",
      metadata: result.Metadata || {},
    };
  }

  /**
   * Generate presigned URL for file download/viewing
   */
  async createPresignedDownloadUrl(
    key: string,
    bucket?: string,
    expires: number = 3600,
    responseContentDisposition?: string,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucket || this.defaultBucket,
      Key: key,
      ResponseContentDisposition: responseContentDisposition,
    });

    return await getSignedUrl(this.s3, command, { expiresIn: expires });
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string, bucket?: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucket || this.defaultBucket,
      Key: key,
    });

    await this.s3.send(command);
  }

  /**
   * Copy file within S3
   */
  // async copyFile(
  //     sourceKey: string,
  //     destinationKey: string,
  //     sourceBucket?: string,
  //     destinationBucket?: string
  // ): Promise<void> {
  //     const command = new PutObjectCommand({
  //         Bucket: destinationBucket || this.defaultBucket,
  //         Key: destinationKey,
  //         CopySource: `${sourceBucket || this.defaultBucket}/${sourceKey}`,
  //     });

  //     await this.s3.send(command);
  // }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Get S3 client instance (for advanced operations)
   */
  getClient(): S3Client {
    return this.s3;
  }

  /**
   * Get default bucket name
   */
  getDefaultBucket(): string {
    return this.defaultBucket;
  }

  /**
   * Set default bucket
   */
  setDefaultBucket(bucket: string): void {
    this.defaultBucket = bucket;
  }
}

export default S3StorageService;
