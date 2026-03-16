import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const r = response as Record<string, unknown>;
        message = (r.message as string | string[]) || (r.error as string) || message;
      }
    }

    this.logger.error(
      `${status} ${Array.isArray(message) ? message.join(', ') : message}`,
    );

    reply.status(status).send({
      statusCode: status,
      message: Array.isArray(message) ? message : [message],
      error:
        exception instanceof HttpException
          ? exception.name.replace('Exception', '').replace(/([a-z])([A-Z])/g, '$1 $2')
          : 'Internal Server Error',
    });
  }
}
