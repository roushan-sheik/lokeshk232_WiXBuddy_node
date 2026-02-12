import { promises as fs } from 'fs';
import path from 'path';
import {
    SESClient,
    SendEmailCommand,
    SendRawEmailCommand,
    VerifyEmailIdentityCommand,
    GetSendStatisticsCommand,
    SendDataPoint,
    ListVerifiedEmailAddressesCommand,
    DeleteVerifiedEmailAddressCommand,
    SendEmailCommandInput,
    SendRawEmailCommandInput,
    SendEmailCommandOutput,
    SendRawEmailCommandOutput,
} from '@aws-sdk/client-ses';
import { AppLogger } from '@/core/logging/logger';

// Interfaces and Types
export interface SESConfig {
    region?: string;
    awsAccessKeyId?: string;
    awsSecretAccessKey?: string;
    defaultFromEmail?: string;
    defaultReplyToEmail?: string;
    templatePath?: string;
    maxRetries?: number;
    retryDelay?: number;
    enableTemplateCache?: boolean;
}

export interface EmailData {
    fromName?: string;
    to: string | string[];
    from?: string;
    subject: string;
    html?: string;
    text?: string;
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string | string[];
}

export interface TemplatedEmailData extends Omit<EmailData, 'html' | 'text'> {
    templateData?: Record<string, any>;
    layout?: string;
}

export interface EmailAttachment {
    filename: string;
    path: string;
    contentType?: string;
}

export interface EmailWithAttachments extends EmailData {
    attachments: EmailAttachment[];
}

export interface EmailResult {
    success: boolean;
    messageId?: string;
    to: string | string[];
    error?: string;
}

export interface BulkEmailResult extends EmailResult {
    to: string;
}

export interface VerificationResult {
    success: boolean;
    message: string;
}

export interface SendingStats {
    timestamp: Date;
    deliveryAttempts: number;
    bounces: number;
    complaints: number;
    rejects: number;
}

export interface CompiledTemplate {
    html: string;
    text?: string;
}

export class SESEmailService {
    private ses: SESClient;
    private defaultFrom: string;
    private defaultReplyTo?: string;
    private templatePath: string;
    private maxRetries: number;
    private retryDelay: number;
    private templateCache: Map<string, string>;
    private enableTemplateCache: boolean;
    private defaultFromName: string;

    constructor(config: SESConfig = {}) {
        // Configure AWS SES
        this.ses = new SESClient({
            region: config.region || process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: config.awsAccessKeyId || process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey:
                    config.awsSecretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || '',
            },
            maxAttempts: config.maxRetries || 3, // SDK v3 built-in retry
        });

        // Default configuration
        this.defaultFromName = process.env.DEFAULT_FROM_NAME || '';
        this.defaultFrom = config.defaultFromEmail || process.env.DEFAULT_FROM_EMAIL || '';
        this.defaultReplyTo = config.defaultReplyToEmail || process.env.DEFAULT_REPLY_TO_EMAIL;
        // Ensure the template path resolves correctly from project root
        this.templatePath = config.templatePath || path.resolve(process.cwd(), 'email-templates');
        this.maxRetries = config.maxRetries || 3;
        this.retryDelay = config.retryDelay || 1000; // 1 second

        // Email templates cache
        this.templateCache = new Map<string, string>();
        this.enableTemplateCache = config.enableTemplateCache !== false;

        if (!this.defaultFrom) {
            // Use a fallback for development if env not set, to avoid crash
            console.warn(
                '⚠️ DEFAULT_FROM_EMAIL not set. Email sending will fail unless explicit "from" is provided.'
            );
        }
    }

    /**
     * Send a simple text/HTML email
     */
    async sendEmail(emailData: EmailData): Promise<EmailResult> {
        try {
            const params = this.buildEmailParams(emailData);
            const result = await this.sendWithRetry(params);

            AppLogger.info(
                `Email sent successfully. MessageId: ${result.MessageId} To: ${emailData.to}`
            );
            return {
                success: true,
                messageId: result.MessageId,
                to: emailData.to,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error sending email:', error);
            // throw new Error(`Failed to send email: ${errorMessage}`);
            // Don't throw entire app crash error, just log and return false status or similar if possible
            // For now keeping throw as per original service behavior but logging clearly.
            throw error;
        }
    }

    /**
     * Send bulk emails to multiple recipients
     */
    async sendBulkEmails(
        recipients: string[],
        emailTemplate: Omit<EmailData, 'to'>
    ): Promise<BulkEmailResult[]> {
        const results: BulkEmailResult[] = [];
        const batchSize = 50; // SES limit per batch

        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);
            const batchPromises = batch.map(async (recipient: string): Promise<BulkEmailResult> => {
                try {
                    const emailData: EmailData = {
                        ...emailTemplate,
                        to: recipient,
                    };
                    const result = await this.sendEmail(emailData);
                    return {
                        ...result,
                        to: recipient,
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    return {
                        success: false,
                        error: errorMessage,
                        to: recipient,
                    };
                }
            });

            const batchResults = await Promise.allSettled(batchPromises);
            const processedResults = batchResults.map((result, index) => {
                if (result.status === 'fulfilled') {
                    return result.value;
                } else {
                    return {
                        success: false,
                        error: result.reason?.message || 'Promise rejected',
                        to: batch[index],
                    };
                }
            });

            results.push(...processedResults);
        }

        return results;
    }

    /**
     * Send templated email using HTML template file
     */
    async sendTemplatedEmail(
        templateName: string,
        emailData: TemplatedEmailData
    ): Promise<EmailResult> {
        try {
            const template = await this.loadTemplate(templateName);
            const compiledTemplate = this.compileTemplate(template, emailData.templateData || {});

            const emailParams: EmailData = {
                ...emailData,
                html: compiledTemplate.html,
                text: compiledTemplate.text || this.htmlToText(compiledTemplate.html),
            };

            return await this.sendEmail(emailParams);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error sending templated email:', error);
            throw new Error(`Failed to send templated email: ${errorMessage}`);
        }
    }

    /**
     * Send email with attachments
     */
    async sendEmailWithAttachments(emailData: EmailWithAttachments): Promise<EmailResult> {
        try {
            const rawEmail = await this.buildRawEmail(emailData);

            const params: SendRawEmailCommandInput = {
                RawMessage: {
                    Data: new TextEncoder().encode(rawEmail),
                },
                Destinations: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
            };

            const result = await this.sendWithRetry(params, 'sendRawEmail');

            console.log(`Email with attachments sent successfully. MessageId: ${result.MessageId}`);
            return {
                success: true,
                messageId: result.MessageId,
                to: emailData.to,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error sending email with attachments:', error);
            throw new Error(`Failed to send email with attachments: ${errorMessage}`);
        }
    }

    /**
     * Verify email address with SES
     */
    async verifyEmail(email: string): Promise<VerificationResult> {
        try {
            await this.ses.send(new VerifyEmailIdentityCommand({ EmailAddress: email }));

            return {
                success: true,
                message: `Verification email sent to ${email}`,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error verifying email:', error);
            throw new Error(`Failed to verify email: ${errorMessage}`);
        }
    }

    /**
     * Get sending statistics
     */
    async getSendingStats(): Promise<SendDataPoint[]> {
        try {
            const stats = await this.ses.send(new GetSendStatisticsCommand({}));
            return stats.SendDataPoints || [];
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error getting sending stats:', error);
            throw new Error(`Failed to get sending stats: ${errorMessage}`);
        }
    }

    /**
     * Get verified email addresses
     */
    async getVerifiedEmails(): Promise<string[]> {
        try {
            const result = await this.ses.send(new ListVerifiedEmailAddressesCommand({}));
            return result.VerifiedEmailAddresses || [];
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error getting verified emails:', error);
            throw new Error(`Failed to get verified emails: ${errorMessage}`);
        }
    }

    /**
     * Delete verified email address
     */
    async deleteVerifiedEmail(email: string): Promise<boolean> {
        try {
            await this.ses.send(new DeleteVerifiedEmailAddressCommand({ EmailAddress: email }));
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error deleting verified email:', error);
            throw new Error(`Failed to delete verified email: ${errorMessage}`);
        }
    }

    /**
     * Clear template cache
     */
    clearTemplateCache(): void {
        this.templateCache.clear();
    }

    // Private methods

    private buildEmailParams(emailData: EmailData): AWS.SES.SendEmailRequest {
        const fromAddress = emailData.from || this.defaultFrom;
        const displayName = emailData.fromName || this.defaultFromName;
        const fromHeader = displayName ? `"${displayName}" <${fromAddress}>` : fromAddress;

        const params: AWS.SES.SendEmailRequest = {
            Source: fromHeader,
            Destination: {
                ToAddresses: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
            },
            Message: {
                Subject: { Data: emailData.subject },
                Body: {},
            },
        };

        if (emailData.cc) {
            params.Destination!.CcAddresses = Array.isArray(emailData.cc)
                ? emailData.cc
                : [emailData.cc];
        }

        if (emailData.bcc) {
            params.Destination!.BccAddresses = Array.isArray(emailData.bcc)
                ? emailData.bcc
                : [emailData.bcc];
        }

        if (emailData.replyTo) {
            params.ReplyToAddresses = Array.isArray(emailData.replyTo)
                ? emailData.replyTo
                : [emailData.replyTo];
        } else if (this.defaultReplyTo) {
            params.ReplyToAddresses = [this.defaultReplyTo];
        }

        if (emailData.html) {
            params.Message.Body.Html = { Data: emailData.html };
        }

        if (emailData.text) {
            params.Message.Body.Text = { Data: emailData.text };
        }

        return params;
    }

    private async sendWithRetry(
        params: SendEmailCommandInput | SendRawEmailCommandInput,
        method: 'sendEmail' | 'sendRawEmail' = 'sendEmail'
    ): Promise<SendEmailCommandOutput | SendRawEmailCommandOutput> {
        let lastError: Error | undefined;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                if (method === 'sendEmail') {
                    return await this.ses.send(
                        new SendEmailCommand(params as SendEmailCommandInput)
                    );
                } else {
                    return await this.ses.send(
                        new SendRawEmailCommand(params as SendRawEmailCommandInput)
                    );
                }
            } catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');

                if (attempt === this.maxRetries) {
                    throw lastError;
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
            }
        }

        throw lastError;
    }

    private async loadTemplate(templateName: string): Promise<string> {
        const cacheKey = templateName;

        if (this.enableTemplateCache && this.templateCache.has(cacheKey)) {
            return this.templateCache.get(cacheKey)!;
        }

        try {
            const templatePath = path.join(this.templatePath, `${templateName}.html`);
            const template = await fs.readFile(templatePath, 'utf8');

            if (this.enableTemplateCache) {
                this.templateCache.set(cacheKey, template);
            }

            return template;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(
                `Template '${templateName}' not found at ${this.templatePath}: ${errorMessage}`
            );
        }
    }

    private compileTemplate(template: string, data: Record<string, any>): CompiledTemplate {
        // Simple template compilation - replace {{variable}} with data values
        let compiled = template;

        Object.keys(data).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            compiled = compiled.replace(regex, String(data[key] || ''));
        });

        return { html: compiled };
    }

    private htmlToText(html: string): string {
        // Basic HTML to text conversion
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();
    }

    private async buildRawEmail(emailData: EmailWithAttachments): Promise<string> {
        const fromAddress = emailData.from || this.defaultFrom;
        const displayName = emailData.fromName || this.defaultFromName;
        const fromHeader = displayName ? `"${displayName}" <${fromAddress}>` : fromAddress;

        const boundary = `----=_NextPart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const rawEmail: string[] = [
            `From: ${fromHeader}`,
            `To: ${Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to}`,
            `Subject: ${emailData.subject}`,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/mixed; boundary="${boundary}"`,
            '',
            `--${boundary}`,
            `Content-Type: text/html; charset=UTF-8`,
            `Content-Transfer-Encoding: 7bit`,
            '',
            emailData.html || emailData.text || '',
            '',
        ];

        // Attachments...
        if (emailData.attachments && emailData.attachments.length > 0) {
            for (const attachment of emailData.attachments) {
                const fileData = await fs.readFile(attachment.path);
                const base64Data = fileData.toString('base64');

                rawEmail.push(
                    `--${boundary}`,
                    `Content-Type: ${attachment.contentType || 'application/octet-stream'}`,
                    `Content-Disposition: attachment; filename="${attachment.filename}"`,
                    `Content-Transfer-Encoding: base64`,
                    '',
                    base64Data,
                    ''
                );
            }
        }

        rawEmail.push(`--${boundary}--`);
        return rawEmail.join('\r\n');
    }
}

export default SESEmailService;
