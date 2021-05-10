export interface ActivePunishment {
    type: 'mute' | 'ban';
    memberId: string;
    clearTime: number;
    guildId: string;
}