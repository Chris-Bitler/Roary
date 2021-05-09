import {LoggingService} from "./LoggingService";
import {GuildMember} from "discord.js";
import {BanTimer, MuteTimer} from "../types/Punishment";
import {Mute} from "../models/Mute";
import {Setting} from "../models/Setting";
import {client} from "../Bot";
import {getChronoCustom} from "../util/DateUtil";
import {Ban} from "../models/Ban";
import {getInformationalEmbed} from "../util/EmbedUtil";
import moment from "moment-timezone";

/**
 * Service for managing user bans
 */
export class BanService {
    static instance: BanService;
    logService: LoggingService;
    activeBanTimers: BanTimer[] = [];

    /**
     * Create a new instance of BanService
     */
    constructor() {
        this.logService = LoggingService.getInstance();
    }

    /**
     * Get an instance of the BanService
     */
    public static getInstance() {
        if (!this.instance) {
            this.instance = new BanService();
        }

        return this.instance;
    }

    /**
     * Unban a user
     * @param {string} memberId The member's user id
     * @param {string} guildId The guild id
     */
    public async unbanUser(memberId: string, guildId: string): Promise<string> {
        const guild = client.guilds.resolve(guildId);

        if (guild) {
            this.logService.logToGuildChannel(`Unbanning user ${memberId}.`, guildId);
            await guild.members.unban(memberId);
            await Ban.update({
                active: false,
            }, {
                where: {
                    userId: memberId,
                    serverId: guildId
                }
            });

            const banTimer = this.activeBanTimers.find((ban) => ban.memberId === memberId);
            if (banTimer) {
                clearTimeout(banTimer.timerId);
            }
            this.activeBanTimers = this.activeBanTimers.filter((ban) => ban.memberId === memberId);
            const message = `Unbanned user ${memberId}`;
            this.logService.logToGuildChannel(message, guildId);
            return message;
        }

        return `Unable to unban`;
    }

    /**
     * Ban a user
     * @param {GuildMember} banee Member being banned
     * @param {GuildMember} banner Member doing the banning
     * @param {string} reason The reason for banning
     * @param {string} expiration text containing parseable expiration time
     */
    public async banUser(banee: GuildMember, banner: GuildMember, reason: string, expiration: string): Promise<string> {
        const memberText = this.logService.getMemberText(banee);

        this.logService.logToGuildChannel(`Banning user ${memberText} for _${reason}_ for time ${expiration} by ${banner.nickname || banner.user.username}`, banee.guild);

        const chrono = getChronoCustom();
        const parsedDate = chrono.parseDate(expiration);

        if (!parsedDate) {
            const message = `Cannot parse passed in date, cannot ban ${memberText}`;
            this.logService.logToGuildChannel(message, banee.guild.id);
            return message;
        }

        await Ban.update({
            active: false,
        }, {
            where: {
                userId: banee.id,
                serverId: banee.guild.id
            }
        });

        const timeout = parsedDate.getTime() - Date.now();

        const expirationDateString = moment
            .tz(parsedDate.getTime(), 'America/New_York')
            .format('MMMM Do YYYY, h:mm:ss a');

        try {
            await Ban.create({
                active: true,
                punisherId: banner.id,
                punisherName: banner.user.username,
                userId: banee.id,
                userName: banee.user.username,
                clearTime: parsedDate.getTime(),
                serverId: banee.guild.id,
                reason,
            });
            await banee.send(
                getInformationalEmbed(
                    'You have been banned',
                    `You have been banned from the \`${banee.guild.name}\` discord for _${reason.trim()}_ by **${
                        banner.user.username
                    }** until ${expirationDateString}`
                )
            );
            await banee.ban({
                reason
            });
            const timeoutId = setTimeout(() => this.unbanUser(banee.id, banee.guild.id), timeout);
            this.activeBanTimers.push({
                timerId: timeoutId,
                memberId: banee.id,
                clearTime: parsedDate.getTime(),
                guildId: banee.guild.id,
            });
            const message = `User ${memberText} banned until ${expirationDateString}`;
            this.logService.logToGuildChannel(message, banee.guild);

            return message;
        } catch (err) {
            const message = `Unable to ban ${memberText}. Removing ban as a precaution`;
            console.error(err);
            this.logService.logToGuildChannel(
                message,
                banee.guild
            );
            banee.guild.members.unban(banee.id);

            return message;
        }
    }

    /**
     * Load bans on startup. Also handle bans that expired
     * while the bot was not on
     */
    public async loadBans() {
        const bans = await Ban.findAll();
        bans.forEach((ban) => {
            const now = Date.now();
            if (ban.clearTime > now && ban.active) {
                const unbanTimer = setTimeout(
                    () => this.unbanUser(ban.userId, ban.serverId),
                    ban.clearTime - now
                );
                this.activeBanTimers.push({
                    memberId: ban.userId,
                    timerId: unbanTimer,
                    clearTime: ban.clearTime,
                    guildId: ban.serverId
                });
            }
            // Deal with bans that went inactive while the bot was off
            if (now > ban.clearTime && ban.active) {
                const guild = client.guilds.resolve(ban.serverId);
                if (guild) {
                    this.logService.logToGuildChannel(
                        `${ban.userName} (${ban.userId})'s ban expired while bot was off, unbanning`,
                        ban.serverId
                    );
                    guild.members.unban(ban.userId);
                    Ban.update({
                        active: false,
                    }, {
                        where: {
                            serverId: ban.serverId,
                            userId: ban.userId
                        }
                    });
                }
            }
        });
    }
}