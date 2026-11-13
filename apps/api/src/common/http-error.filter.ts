import { ArgumentsHost, Catch, HttpException, Logger, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const details =
      error instanceof HttpException
        ? error.getResponse()
        : { message: 'Não foi possível concluir a operação' };
    if (status === 500)
      this.logger.error(`Erro interno: ${error instanceof Error ? error.name : 'UnknownError'}`);
    response
      .status(status)
      .json({
        statusCode: status,
        ...(typeof details === 'string' ? { message: details } : details),
      });
  }
}
