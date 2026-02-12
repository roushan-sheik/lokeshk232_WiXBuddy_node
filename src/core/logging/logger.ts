// logging/logger.ts
import { createLogger, format, transports, Logger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import chalk from 'chalk';
import { format as dateFnsFormat } from 'date-fns';
import { config } from '../config';

const { combine, timestamp, printf, errors, json } = format;

const LOG_DIR = 'logs';

// Console format with colors/emojis
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    const styles: Record<string, { emoji: string; color: (msg: string) => string }> = {
        error: { emoji: '✖', color: chalk.red.bold },
        warn: { emoji: '⚠', color: chalk.yellow.bold },
        info: { emoji: 'ℹ', color: chalk.cyan.bold },
        http: { emoji: '⇄', color: chalk.magenta.bold },
        verbose: { emoji: '›', color: chalk.blue },
        debug: { emoji: '⚙', color: chalk.green },
        silly: { emoji: '∼', color: chalk.gray },
    };
    const style = styles[level] || { emoji: '📝', color: chalk.white };

    const time = chalk.dim(timestamp);
    const lvl = style.color(level.toUpperCase().padEnd(2));
    const emoji = style.emoji;

    const metaString =
        meta && Object.keys(meta).length ? '\n' + chalk.gray(JSON.stringify(meta, null, 2)) : '';

    return `${emoji} ${time} ${lvl}  ${stack || message} ${metaString}`;
});

export class AppLogger {
    private static instance: Logger;

    private static init(): Logger {
        if (!this.instance) {
            this.instance = createLogger({
                exitOnError: false,
                format: combine(
                    errors({ stack: true }),
                    timestamp({
                        format: () => dateFnsFormat(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS'),
                    })
                ),
                transports: [
                    new transports.Console({
                        format: combine(consoleFormat),
                    }),
                    new DailyRotateFile({
                        dirname: LOG_DIR,
                        filename: 'app-%DATE%.log',
                        datePattern: 'YYYY-MM-DD',
                        maxFiles: '14d',
                        maxSize: '5m',
                        format: combine(json({ space: 2 })),
                    }),
                ],
                exceptionHandlers: [
                    new DailyRotateFile({
                        dirname: LOG_DIR,
                        filename: 'exceptions-%DATE%.log',
                        datePattern: 'YYYY-MM-DD',
                        format: combine(json({ space: 2 })),
                    }),
                ],
                rejectionHandlers: [
                    new DailyRotateFile({
                        dirname: LOG_DIR,
                        filename: 'rejections-%DATE%.log',
                        datePattern: 'YYYY-MM-DD',
                        format: combine(json({ space: 2 })),
                    }),
                ],
            });
        }
        return this.instance;
    }

    static get logger(): Logger {
        return this.init();
    }

    static info(msg: string, meta?: any) {
        this.logger.info(msg, meta);
    }
    static warn(msg: string, meta?: any) {
        this.logger.warn(msg, meta);
    }
    static debug(msg: string, meta?: any) {
        this.logger.debug(msg, meta);
    }
    static error(msg: string | Error, meta?: any) {
        if (msg instanceof Error) {
            this.logger.error(msg.message, { ...meta, stack: msg.stack });
        } else {
            this.logger.error(msg, meta);
        }
    }
    static verbose(msg: string, meta?: any) {
        this.logger.verbose(msg, meta);
    }
    static silly(msg: string, meta?: any) {
        this.logger.silly(msg, meta);
    }
}
