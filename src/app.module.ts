import { Module } from '@nestjs/common';
import { MongoModule } from './infra/mongo/mongo.module';

@Module({
  imports: [MongoModule],
  controllers: [],
  providers: [],
})
export class AppModule { }
