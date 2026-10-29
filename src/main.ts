import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import process from 'process';

import { AppModule } from './app.module';
import { ParserService } from './parser/parser.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const configService = app.get(ConfigService);

  app.enableShutdownHooks();

  try {
    const result = await app
      .get(ParserService)
      .parse(configService.getOrThrow<string>('TARGET_URL'));

    console.log(result);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');

  if (error instanceof Error) {
    logger.error('Application bootstrap failed', error.stack);
  } else {
    logger.error(`Application bootstrap failed (${String(error)})`);
  }

  process.exitCode = 1;
});
