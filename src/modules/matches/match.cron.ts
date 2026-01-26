import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { env } from "src/config/env";
import { MatchmakingService } from "./services/matchmaking.service";
import { MatchSimulationService } from "./services/match-simulation.service";

@Injectable()
export class MatchCron {
    private readonly logger = new Logger(MatchCron.name)

    constructor(
        private readonly matchmakingService: MatchmakingService,
        private readonly matchSimulationService: MatchSimulationService
    ) { }

    @Cron(CronExpression.EVERY_HOUR)
    async runMatchmaking() {
        try {
            this.logger.log('Starting matchmaking cron job');
            await this.matchmakingService.runMatchmaking();
            this.logger.log('Finished matchmaking cron job');
        } catch (error) {
            this.logger.error('Error during matchmaking cron job:', error);
        }
    }

    @Cron('0 8 * * *', { timeZone: env.TZ })
    async playMatches() {
        try {
            this.logger.log('Starting match simulation cron job');
            await this.matchSimulationService.runMatchSimulation();
            this.logger.log('Finished match simulation cron job');
        } catch (error) {
            this.logger.error('Error during match simulation cron job:', error);
        }
    }
}