import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { env } from './config/env';
import { HttpErrorFilter } from './common/http-error.filter';
import { appVersion } from '@jinsei/contracts';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      request.headers.origin !== env.WEB_ORIGIN
    ) {
      response.status(403).json({ statusCode: 403, message: 'Origem da requisição não permitida' });
      return;
    }
    next();
  });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpErrorFilter());
  app.enableShutdownHooks();
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Jinsei API')
      .setVersion(appVersion)
      .addCookieAuth('jinsei_session')
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: '/api/openapi.json' });
  await app.listen(env.PORT, env.HOST);
}
void bootstrap().catch(() => {
  console.error('A API não pôde iniciar. Confira o ambiente e o PostgreSQL.');
  process.exitCode = 1;
});
