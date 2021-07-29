import {LoggingService} from "./LoggingService";
import {GuildMember} from "discord.js";
import {Warn} from "../models/Warn";
import {getInformationalEmbed} from "../util/EmbedUtil";

/**
 * Service for managing user warns
 */
export class WarnService {
    static instance: WarnService;
    logService: LoggingService;

    /**
     * Create a new instance of WarnService
     */
    constructor() {
        this.logService = LoggingService.getInstance();
    }

    /**
     * Get an instance of the MuteService
     */
    public static getInstance() {
        if (!this.instance) {
            this.instance = new WarnService();
        }

        return this.instance;
    }

    /**
     * Warn a user
     * @param {GuildMember} warnee Member being warned
     * @param {GuildMember} warner Member doing the warning
     * @param {string} reason The reason for warning
     */
    public async warnUser(warnee: GuildMember, warner: GuildMember, reason: string): Promise<string> {
        const memberText = this.logService.getMemberText(warnee);

        this.logService.logToGuildChannel(`Warning user ${memberText} for ${reason} by ${warner.nickname || warner.user.username}`, warnee.guild);

        try {
            await warnee.send({
                embeds: [
                    getInformationalEmbed(
                        'You have been warned',
                        `You have been warned by **${
                            warner.user.username
                        }** in the \`${warnee.guild.name}\` discord for _${reason.trim()}_.`
                    )
                ]
            });
        } catch (err) {
            const message = `Cannot message ${memberText} with warn`;
            this.logService.logToGuildChannel(message, warnee.guild.id);
        }

        try {
            await Warn.create({
                punisherId: warner.id,
                punisherName: warner.user.username,
                userId: warner.id,
                userName: warner.user.username,
                serverId: warner.guild.id,
                reason,
            });
            const message = `User ${memberText} warned`;
            this.logService.logToGuildChannel(message, warnee.guild);

            return message;
        } catch (err) {
            const message = `Unable to warn ${memberText}.`;
            console.error(err);
            return message;
        }
    }
}