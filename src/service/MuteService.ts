import {LoggingService} from "./LoggingService";
import {GuildMember} from "discord.js";
import {MuteTimer} from "../types/Punishment";
import {Mute} from "../models/Mute";
import {Setting} from "../models/Setting";
import {client} from "../Bot";
import {getChronoCustom} from "../util/DateUtil";
import moment from "moment-timezone";
import {getInformationalEmbed} from "../util/EmbedUtil";

/**
 * Service for managing user mutes
 */
export class MuteService {
    static instance: MuteService;
    logService: LoggingService;
    activeMuteTimers: MuteTimer[] = [];

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
        const guild = client.guilds.resolve(guildId);
        const member = guild?.member(memberId);

        if (member) {
            const memberText = this.logService.getMemberText(member);
            this.logService.logToGuildChannel(`Unmuting user ${memberText}.`, guildId);
            if (mutedRole) {
                this.logService.logToGuildChannel(`Removing muted role for ${memberText}`, guildId);
                await member.roles.remove(mutedRole?.value);
            }
            await Mute.update({
                active: false,
            }, {
                where: {
                    userId: memberId,
                    serverId: guildId
                }
            });

            const muteTimer = this.activeMuteTimers.find((mute) => mute.memberId === memberId);
            if (muteTimer) {
                clearTimeout(muteTimer.timerId);
            }
            const message = `Unmuted user ${memberText}`;
            this.activeMuteTimers = this.activeMuteTimers.filter((mute) => mute.memberId === memberId);
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

        this.logService.logToGuildChannel(`Muting user ${memberText}.`, mutee.guild);
        const currentlyMuted = this.activeMuteTimers.find((mute) => mute.memberId === mutee.id);

        const chrono = getChronoCustom();
        const parsedDate = chrono.parseDate(expiration);

        if (!parsedDate) {
            const message = `Cannot parse passed in date, cannot mute ${memberText}`;
            this.logService.logToGuildChannel(message, mutee.guild.id);
            return message;
        }

        if (currentlyMuted) {
            this.logService.logToGuildChannel(`${memberText} is currently muted - overriding mute`, mutee.guild);
            // Clear timeout and remove from active timers
            clearTimeout(currentlyMuted.timerId);
            this.activeMuteTimers = this.activeMuteTimers.filter((mute) => mute.memberId === mutee.id);

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

        const timeout = parsedDate.getTime() - Date.now();
        const expirationDateString = moment
            .tz(parsedDate.getTime(), 'America/New_York')
            .format('MMMM Do YYYY, h:mm:ss a');
        await mutee.send(
            getInformationalEmbed(
                'You have been muted',
                `You have been muted for _${reason}_ until ${expirationDateString} EST by **${
                    muter.displayName || muter.user.username
                }**`
            )
        );
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
                await mutee.roles.add(mutedRole.value);
            }
            const timeoutId = setTimeout(() => this.unmuteUser(mutee.id, mutee.guild.id), timeout);
            this.activeMuteTimers.push({
                timerId: timeoutId,
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
            mutee.roles.remove(mutedRole.value);

            return message;
        }
    }

    public async handleUserRejoin(member: GuildMember) {
        const memberText = this.logService.getMemberText(member);
        const mutedRole = await this.getMutedRole(member.guild.id);
        if (mutedRole) {
            const hasMute = this.activeMuteTimers.filter((mute) => {
                return mute.memberId === member.id && mute.guildId === member.guild.id
            });
            if (hasMute) {
                this.logService.logToGuildChannel(`${memberText} has rejoined with a current mute, re-muting`, member.guild);
                await member.roles.add(mutedRole.value);
            }
        }
    }

    public async loadMutes() {
        const mutes = await Mute.findAll();
        for (const mute of mutes) {
            const now = Date.now();
            if (mute.clearTime > now && mute.active) {
                const muteTimer = setTimeout(
                    () => this.unmuteUser(mute.userId, mute.serverId),
                    mute.clearTime - now
                );
                this.activeMuteTimers.push({
                    guildId: mute.serverId,
                    memberId: mute.userId,
                    clearTime: mute.clearTime,
                    timerId: muteTimer
                });
            }

            const mutedRole = await this.getMutedRole(mute.serverId);
            // Handle mutes while the bot was down
            if (mutedRole) {
                if (now > mute.clearTime && mute.active) {
                    const guild = client.guilds.resolve(mute.serverId);
                    if (guild) {
                        this.logService.logToGuildChannel(
                            `${mute.userName} (${mute.userId})'s mute expired while bot was off, unbanning`,
                            mute.serverId
                        );
                        const member = guild.member(mute.userId);
                        if (member) {
                            await member.roles.remove(mutedRole.value);
                        }
                    }
                }
            }
        }
    }

    private async getMutedRole(guildId: string) {
        return Setting.getSetting('mutedRole', guildId);
    }
}