import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { AdminModule } from './admin/admin.module';
import { TasksModule } from './tasks/tasks.module';
import { TimeLogsModule } from './time-logs/time-logs.module';
import { LinksModule } from './links/links.module';
import { CommentsModule } from './comments/comments.module';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import mailConfig from './config/mail.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [databaseConfig, jwtConfig, mailConfig],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    AdminModule,
    TasksModule,
    TimeLogsModule,
    LinksModule,
    CommentsModule,
  ],
})
export class AppModule {}
