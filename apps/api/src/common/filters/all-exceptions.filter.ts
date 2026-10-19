import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ZodError } from 'zod';
import { getEnv } from '../../config/env.config';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Lỗi máy chủ nội bộ';
    let errors: unknown = undefined;

    if (exception instanceof ZodError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Dữ liệu không hợp lệ';
      errors = exception.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj.message as string) || exception.message || 'Lỗi yêu cầu';
        if (resObj.errors) {
          errors = resObj.errors;
        } else if (Array.isArray(resObj.message)) {
          message = 'Dữ liệu không hợp lệ';
          errors = resObj.message;
        }
      }
    } else if (exception instanceof Error) {
      // Check if it's a ZodError wrapped inside another error (e.g. nestjs-zod)
      if (
        'issues' in exception &&
        Array.isArray((exception as unknown as { issues: unknown[] }).issues)
      ) {
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Dữ liệu không hợp lệ';
        errors = (
          exception as unknown as { issues: Array<{ path: string[]; message: string }> }
        ).issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
      } else {
        this.logger.error(exception.message, exception.stack);
        message =
          getEnv().NODE_ENV === 'production'
            ? 'Lỗi máy chủ nội bộ'
            : exception.message || 'Lỗi máy chủ nội bộ';
      }
    } else if (getEnv().NODE_ENV !== 'production') {
      message = String(exception);
    }

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR && getEnv().NODE_ENV === 'production') {
      message = 'Lỗi máy chủ nội bộ';
      errors = undefined;
    }

    response.status(statusCode).json({
      statusCode,
      message,
      ...(errors ? { errors } : {}),
    });
  }
}
