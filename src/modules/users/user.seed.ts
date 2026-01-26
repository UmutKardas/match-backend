import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { User, UserDocument } from "./user.schema";
import { Model } from "mongoose";
import { seedConfig } from "src/config/seed.config";

@Injectable()
export class UserSeed implements OnApplicationBootstrap {
    private readonly logger = new Logger(UserSeed.name);

    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

    async onApplicationBootstrap() {
        const currentCount = await this.userModel.countDocuments();

        if (currentCount >= seedConfig.targetUserCount) {
            this.logger.log(`Database already has ${currentCount} users. Skipping seed.`);
            return;
        }

        try {
            this.logger.log('Seeding Users...')
            await this.seedUsers(seedConfig.targetUserCount - currentCount)
            this.logger.log('Seed Completed')
        } catch (error) {
            this.logger.error('Error during seeding users:', error);
        }
    }

    private async seedUsers(count: number) {
        let users: Partial<User>[] = []

        for (let i = 0; i < count; i++) {
            users.push({
                rank: Math.ceil(Math.random() * seedConfig.maxRank),
                winCount: 0,
                loseCount: 0
            })

            if (users.length >= seedConfig.batchSize) {
                await this.userModel.insertMany(users);
                users = [];
            }

        }

        if (users.length > 0) {
            await this.userModel.insertMany(users);
        }
    }
}