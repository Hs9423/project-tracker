import { Module } from '@nestjs/common';
import { HierarchyService } from './hierarchy.service';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [HierarchyService, UsersService],
  controllers: [UsersController],
  exports: [HierarchyService, UsersService],
})
export class UsersModule {}
