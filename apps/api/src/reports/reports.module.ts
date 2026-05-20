import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ExportProcessor } from '../jobs/export.processor';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    BullModule.registerQueue({ name: 'export' }),
  ],
  providers: [ReportsService, ExportProcessor],
  controllers: [ReportsController],
})
export class ReportsModule {}
