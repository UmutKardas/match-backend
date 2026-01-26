export const MatchStatus = {
    SCHEDULED: 'scheduled',
    PLAYED: 'played',
} as const;

export type MatchStatusType = (typeof MatchStatus)[keyof typeof MatchStatus];