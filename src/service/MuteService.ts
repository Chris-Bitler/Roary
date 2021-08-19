import {LoggingService} from "./LoggingService";
import {GuildMember, Snowflake} from "discord.js";
import {ActivePunishment} from "../types/Punishment";
import {Mute} from "../models/Mute";
import {Setting} from "../models/Setting";
import {client} from "../Bot";
import {getChronoCustom} from "../util/DateUtil";
import moment from "moment-timezone";
import {getInformationalEmbed} from "../util/EmbedUtil";
import {QueueService} from "./QueueService";

/**
 * Service for managing user mutes
 */
export class MuteService {
    static instance: MuteService;
    logService: LoggingService;
    activeMutes: ActivePunishment[] = [];

    /**
     * Create a new instance of MuteService
     */
    constructor() {
        this.logService = LoggingService.getInstance();
    }

    /**
     * Get an instance of the MuteService
     */
    public static getInstance() {
        if (!this.instance) {
            this.instance = new MuteService();
        }

        return this.instance;
    }

    /**
     * Unmute a user
     * @param {string} memberId The member's user id
     * @param {string} guildId The guild id
     */
    public async unmuteUser(memberId: string, guildId: string): Promise<string> {
        const mutedRole = await this.getMutedRole(guildId);
        const guild = client.guilds.resolve(guildId as Snowflake);
        const member = guild?.members.resolve(memberId as Snowflake);

        if (member) {
            const memberText = this.logService.getMemberText(member);
            this.logService.logToGuildChannel(`Unmuting user ${memberText}.`, guildId);
            if (mutedRole) {
                this.logService.logToGuildChannel(`Removing muted role for ${memberText}`, guildId);
                await member.roles.remove(mutedRole?.value as Snowflake);
            }
            await Mute.update({
                active: false,
            }, {
                where: {
                    userId: memberId,
                    serverId: guildId
                }
            });

            const message = `Unmuted user ${memberText}`;
            this.activeMutes = this.activeMutes.filter((mute) => mute.memberId !== memberId);
            this.logService.logToGuildChannel(message, guildId);
            return message;
        }

        return `Unable to unmute ${memberId}`;
    }

    /**
     * Mute a user
     * @param {GuildMember} mutee Member being muted
     * @param {GuildMember} muter Member doing the muting
     * @param {string} reason The reason for muting
     * @param {string} expiration text containing parseable expiration time
     */
    public async muteUser(mutee: GuildMember, muter: GuildMember, reason: string, expiration: string): Promise<string> {
        const mutedRole = await this.getMutedRole(mutee.guild.id);
        const memberText = this.logService.getMemberText(mutee);
        if (!mutedRole) {
            const message = `Cannot mute ${memberText}, no mute role set`;
            this.logService.logToGuildChannel(message, mutee.guild);
            return message;
        }

        this.logService.logToGuildChannel(`Muting user ${memberText} for _${reason}_ for time ${expiration} by ${muter.nickname || muter.user.username}`, mutee.guild);
        const currentlyMuted = this.activeMutes.find((mute) => mute.memberId === mutee.id);

        const chrono = getChronoCustom();
        const parsedDate = chrono.parseDate(expiration);

        if (!parsedDate) {
            const message = `Cannot parse passed in date, cannot mute ${memberText}`;
            this.logService.logToGuildChannel(message, mutee.guild.id);
            return message;
        }

        if (currentlyMuted) {
            this.logService.logToGuildChannel(`${memberText} is currently muted - overriding mute`, mutee.guild);
            this.activeMutes = this.activeMutes.filter((mute) => mute.memberId === mutee.id);

            await Mute.update({
                active: false,
            }, {
                where: {
                    userId: mutee.user.id,
                    serverId: mutee.guild.id
                }
            });
            this.logService.logToGuildChannel(
                `Updated mute in DB to be inactive and canceled mute timer for ${memberText}`,
                mutee.guild
            );
        }

        const expirationDateString = moment
            .tz(parsedDate.getTime(), 'America/New_York')
            .format('MMMM Do YYYY, h:mm:ss a');
        await mutee.send({
            embeds: [
                getInformationalEmbed(
                    'You have been muted',
                    `You have been muted for _${reason}_ until ${expirationDateString} EST by **${
                        muter.displayName || muter.user.username
                    }**`
                )
            ]
        });
        try {
            await Mute.create({
                active: true,
                punisherId: muter.id,
                punisherName: muter.user.username,
                userId: mutee.id,
                userName: mutee.user.username,
                clearTime: parsedDate.getTime(),
                serverId: mutee.guild.id,
                reason,
            });
            const hasMutedRole = mutee.roles.cache.some(role => role.id === mutedRole.value);
            if (!hasMutedRole) {
                await mutee.roles.add(mutedRole.value as Snowflake);
            }
            this.activeMutes.push({
                type: 'mute',
                memberId: mutee.id,
                clearTime: parsedDate.getTime(),
                guildId: mutee.guild.id
            });
            const message = `User ${memberText} muted until ${expirationDateString}`;
            this.logService.logToGuildChannel(message, mutee.guild);

            return message;
        } catch (err) {
            const message = `Unable to mute ${memberText}. Removing muted role as a precaution`;
            console.error(err);
            this.logService.logToGuildChannel(
                message,
                mutee.guild
            );
            mutee.roles.remove(mutedRole.value as Snowflake);

            return message;
        }
    }

    public async handleUserRejoin(member: GuildMember) {
        const memberText = this.logService.getMemberText(member);
        const mutedRole = await this.getMutedRole(member.guild.id);
        if (mutedRole) {
            const hasMute = this.activeMutes.filter((mute) => {
                return mute.memberId === member.id && mute.guildId === member.guild.id
            });
            if (hasMute.length > 0) {
                this.logService.logToGuildChannel(`${memberText} has rejoined with a current mute, re-muting`, member.guild);
                await member.roles.add(mutedRole.value as Snowflake);
            }
        }
    }

    public async loadMutes() {
        const mutes = await Mute.findAll();
        for (const mute of mutes) {
            const now = Date.now();
            if (mute.clearTime > now && mute.active) {
                this.activeMutes.push({
                    guildId: mute.serverId,
                    memberId: mute.userId,
                    clearTime: mute.clearTime,
                    type: 'mute',
                });
            }

            const mutedRole = await this.getMutedRole(mute.serverId);
            // Handle mutes while the bot was down
            if (mutedRole) {
                if (now > mute.clearTime && mute.active) {
                    const guild = client.guilds.resolve(mute.serverId as Snowflake);
                    if (guild) {
                        this.logService.logToGuildChannel(
                            `${mute.userName} (${mute.userId})'s mute expired while bot was off, unmuting`,
                            mute.serverId
                        );
                        const member = guild.members.resolve(mute.userId as Snowflake);
                        if (member) {
                            await this.unmuteUser(mute.userId, mute.serverId);
                        }
                    }
                }
            }
        }
    }

    /**
     * Tick the mutes and add them to the undo queue if they are done
     */
    public async tickMutes() {
        const now = Date.now();
        const expiredMutes = this.activeMutes.filter((mute) => now > mute.clearTime);
        const nonExpiredMutes = this.activeMutes.filter((mute) => now < mute.clearTime);
        expiredMutes.forEach((mute) => {
            if (now > mute.clearTime) {
                QueueService.getInstance().addToPunishmentUndoQueue(mute);
            }
        });

        this.activeMutes = nonExpiredMutes;
    }

    private async getMutedRole(guildId: string) {
        return Setting.getSetting('mutedRole', guildId);
    }
}