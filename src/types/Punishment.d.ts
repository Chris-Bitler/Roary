export interface MuteTimer {
    memberId: string;
    clearTime: number;
    guildId: string;
    timerId: NodeJS.Timeout;
}

export type BanTimer = MuteTimer;