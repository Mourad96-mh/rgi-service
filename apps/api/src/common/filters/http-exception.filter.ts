import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiError } from '@rgi/types';

/**
 * One error shape for the whole API (API_SPEC.md §Cross-cutting):
 * `{ statusCode, message (fr), error }`. Unknown errors never leak a stack trace.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const body: ApiError =
        typeof payload === 'string'
          ? { statusCode: status, message: payload, error: exception.name }
          : {
              statusCode: status,
              message:
                (payload as { message?: string | string[] }).message ?? exception.message,
              error: (payload as { error?: string }).error ?? exception.name,
            };
      res.status(status).json(body);
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    const body: ApiError = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Une erreur interne est survenue.',
      error: 'InternalServerError',
    };
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
