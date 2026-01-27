import { Module } from '@nestjs/common';
import { MongoModule } from './infra/mongo/mongo.module';
import { UserModule } from './modules/users/user.module';
import { MatchModule } from './modules/matches/match.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { RedisModule } from './infra/redis/redis.module';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ResponseInterceptor } from './common/interceptor/response.interceptor';
import { ApiExceptionFilter } from './common/filter/api.exception.filter';

@Module({
  imports: [MongoModule, RedisModule, UserModule, MatchModule, LeaderboardModule, ScheduleModule.forRoot()],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor
    },
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter
    }
  ],
})
export class AppModule { }
