import {LoggingService} from "./LoggingService";
import {GuildMember} from "discord.js";
import {BanTimer, MuteTimer} from "../types/Punishment";
import {Mute} from "../models/Mute";
import {Setting} from "../models/Setting";
import {client} from "../Bot";
import {getChronoCustom} from "../util/DateUtil";
import {Ban} from "../models/Ban";
import {Warn} from "../models/Warn";
import {getInformationalEmbed} from "../util/EmbedUtil";
import {Kick} from "../models/Kick";

/**
 * Service for managing user kicks
 */
export class KickService {
    static instance: KickService;
    logService: LoggingService;

    /**
     * Create a new instance of KickService
     */
    constructor() {
        this.logService = LoggingService.getInstance();
    }

    /**
     * Get an instance of the KickService
     */
    public static getInstance() {
        if (!this.instance) {
            this.instance = new KickService();
        }

        return this.instance;
    }

    /**
     * Kick a user
     * @param {GuildMember} kickee Member being kicked
     * @param {GuildMember} kicker Member doing the kicking
     * @param {string} reason The reason for kicking
     */
    public async kickUser(kickee: GuildMember, kicker: GuildMember, reason: string): Promise<string> {
        const memberText = this.logService.getMemberText(kickee);

        this.logService.logToGuildChannel(`Kicking user ${memberText}.`, kickee.guild);

        try {
            await kickee.send(
                getInformationalEmbed(
                    'You have been kicked',
                    `You have been kicked from the \`${kickee.guild.name}\` discord for _${reason.trim()}_ by **${
                        kicker.user.username
                    }**`
                )
            );
        } catch (e) {
            this.logService.logToGuildChannel(`Cannot message user ${memberText} with kick message`, kickee.guild);
        }

        try {
            await Kick.create({
                punisherId: kicker.id,
                punisherName: kicker.user.username,
                userId: kicker.id,
                userName: kicker.user.username,
                serverId: kicker.guild.id,
                reason,
            });
            await kickee.kick(reason);
            const message = `User ${memberText} kicked`;
            this.logService.logToGuildChannel(message, kickee.guild);

            return message;
        } catch (err) {
            const message = `Unable to kick ${memberText}.`;
            console.error(err);
            return message;
        }
    }
}