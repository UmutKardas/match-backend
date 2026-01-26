import { Module } from '@nestjs/common';
import { MongoModule } from './infra/mongo/mongo.module';
import { UserModule } from './modules/users/user.module';
import { MatchModule } from './modules/matches/match.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { RedisModule } from './infra/redis/redis.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [MongoModule, RedisModule, UserModule, MatchModule, LeaderboardModule, ScheduleModule.forRoot()],
  controllers: [],
  providers: [],
})
export class AppModule { }
