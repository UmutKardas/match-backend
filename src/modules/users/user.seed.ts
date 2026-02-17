import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { User } from "./user.schema";
import { seedConfig } from "src/config/seed.config";
import { UserService } from "./user.service";
import { PinoLogger, InjectPinoLogger } from "nestjs-pino";

@Injectable()
export class UserSeed implements OnApplicationBootstrap {

    constructor(
        private readonly userService: UserService,
        @InjectPinoLogger(UserSeed.name)
        private readonly logger: PinoLogger
    ) { }

    async onApplicationBootstrap() {
        const currentCount = await this.userService.fetchTotalUsers();

        if (currentCount >= seedConfig.targetUserCount) {
            this.logger.info(`Database already has ${currentCount} users. Skipping seed.`);
            return;
        }

        try {
            this.logger.info('Seeding Users...')
            await this.seedUsers(seedConfig.targetUserCount - currentCount)
            this.logger.info('Seed Completed')
        } catch (error) {
            this.logger.error('Error during seeding users:', error);
        }
    }

    private async seedUsers(count: number) {
        let users: Partial<User>[] = []

        for (let i = 0; i < count; i++) {
            users.push({
                rank: Math.ceil(Math.random() * seedConfig.maxRank),
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