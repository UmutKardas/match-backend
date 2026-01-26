import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { env } from "src/config/env";

@Module({
    imports: [MongooseModule.forRootAsync({
        useFactory: async () => ({
            uri: env.MONGO_URI,
            autoIndex: false,
            retryAttempts: 5,
            retryDelay: 3000,
        })
    })],
    providers: [],
})

export class MongoModule {

}