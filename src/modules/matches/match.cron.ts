import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { env } from "src/config/env";
import { MatchmakingService } from "./services/matchmaking.service";
import { MatchSimulationService } from "./services/match-simulation.service";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

@Injectable()
export class MatchCron {

    constructor(
        private readonly matchmakingService: MatchmakingService,
        private readonly matchSimulationService: MatchSimulationService,
        @InjectPinoLogger(MatchCron.name)
        private readonly logger: PinoLogger
    ) { }

    @Cron(CronExpression.EVERY_HOUR)
    async runMatchmaking() {
        try {
            this.logger.info('Starting matchmaking cron job');
            await this.matchmakingService.runMatchmaking();
            this.logger.info('Finished matchmaking cron job');
        } catch (error) {
            this.logger.error('Error during matchmaking cron job:', error);
        }
    }

    @Cron('0 8 * * *', { timeZone: env.TZ })
    async playMatches() {
        try {
            this.logger.info('Starting match simulation cron job');
            await this.matchSimulationService.runMatchSimulation();
            this.logger.info('Finished match simulation cron job');
        } catch (error) {
            this.logger.error('Error during match simulation cron job:', error);
        }
    }
}