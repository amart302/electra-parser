import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '@/generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });

    super({ adapter });
  }

  async onModuleInit() {
    try {
      this.logger.log('Database connection started');

      await this.$connect();
      await this.$queryRaw`SELECT 1`;

      this.logger.log('Database connection completed successfully');
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Database connection failed', error.stack);
      }

      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      this.logger.log('Database disconnection started');

      await this.$disconnect();

      this.logger.log('Database disconnection completed successfully');
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Database disconnection failed', error.stack);
      }

      throw error;
    }
  }
}
