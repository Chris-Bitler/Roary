import {Guild, GuildMember, TextChannel} from "discord.js";
import {Setting} from "../models/Setting";
import {client} from "../Bot";

export class LoggingService {
    static instance: LoggingService;

    public static getInstance() {
        if (!this.instance) {
            this.instance = new LoggingService();
        }

        return this.instance;
    }

    public async logToGuildChannel(message: string, guild: Guild | string) {
        const guildToUse = typeof guild === 'string' ? client.guilds.resolve(guild) : guild as Guild;
        if (guildToUse) {
            const logChannelId = (await Setting.getSetting('logChannel', guildToUse.id))?.value;
            const logChannel = logChannelId ? guildToUse.channels.resolve(logChannelId) : null;
            if (logChannel instanceof TextChannel) {
                await logChannel.send(message);
            } else {
                console.error('Attempted to log to guild log channel but none exists');
            }
        }
    }

    public getMemberText(member: GuildMember) {
        return `${member.nickname || member.user.username} (${member.id})`;
    }

}