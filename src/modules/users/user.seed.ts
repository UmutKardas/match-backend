import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { User } from "./user.schema";
import { seedConfig } from "src/config/seed.config";
import { UserService } from "./user.service";

@Injectable()
export class UserSeed implements OnApplicationBootstrap {
    private readonly logger = new Logger(UserSeed.name);

    constructor(private readonly userService: UserService) { }

    async onApplicationBootstrap() {
        const currentCount = await this.userService.fetchTotalUsers();

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
                await this.userService.insertUsersCollection(users)
                users = [];
            }
        }

        if (users.length > 0) {
            await this.userService.insertUsersCollection(users)
        }
    }
}