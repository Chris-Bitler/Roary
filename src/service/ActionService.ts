import {Kick} from "../models/Kick";
import {Ban} from "../models/Ban";
import {Warn} from "../models/Warn";
import {Mute} from "../models/Mute";
import {Guild, Message, MessageEmbed, MessageReaction} from "discord.js";;
import moment from "moment-timezone";

export class ActionService {
    static instance: ActionService;
    footerRegex = /Actions \| ([0-9]+) \| ([0-9]+) \| (mute|ban|warn|kick)/g;

    public static getInstance() {
        if (!this.instance) {
            this.instance = new ActionService();
        }

        return this.instance;
    }

    async fetchActionsForUser(user: string, type: string, start = 0): Promise<(Mute | Ban | Warn | Kick)[] | null> {
        let model = null;
        switch (type) {
            case 'mute':
                model = Mute;
                break;
            case 'ban':
                model = Ban;
                break;
            case 'warn':
                model = Warn;
                break;
            case 'kick':
                model = Kick;
                break;
            default:
                break;
        }

        if (!model) {
            return null;
        }

        return model.findAll({
            where: {
                userId: user
            },
            offset: start,
            limit: 5
        });
    };

    async getEmbed(user: string, type: string, page: number, guild: Guild, actions: (Mute | Ban | Kick | Warn)[]): Promise<MessageEmbed | string> {
        if (actions.length === 0) {
            return 'No actions found against user';
        }
        const userObj = await guild.members.fetch(user);
        if (userObj) {
            const embed = new MessageEmbed();
            actions.forEach((action) => {
                const value = ActionService.getEmbedValue(action);
                embed.setTitle(`${userObj.user.username}'s ${type}s`);
                embed.addField('Punishment', value);
            });
            embed.setFooter(`Actions | ${userObj.user.id} | ${page} | ${type}`);

            return embed;
        } else {
            return 'Cannot find user in discord server.';
        }
    }

    private static getEmbedValue(action: (Mute | Ban | Kick | Warn)) {
        let value = `Name: ${action.userName}\n` +
            `Reason: ${action.reason}\n` +
            `By: ${action.punisherName}\n`;
        if (action instanceof Mute || action instanceof Ban) {
            const expirationDateString = moment
                .tz(action.clearTime, 'America/New_York')
                .format('MMMM Do YYYY, h:mm:ss a');
            value += (
                `Expiration: ${expirationDateString}\n` +
                `Active: ${action.active}`
            );
        }

        return value;
    }

    async handleEmbedPage(message: Message, reaction: MessageReaction, embed: MessageEmbed) {
        // Verify this is actually our embed
        const footer = embed.footer;
        if (!footer)
            return false;
        const footerText = footer.text;
        if (!footerText)
            return false;

        const footerMatches = Array.from(footerText.matchAll(this.footerRegex))?.[0];
        if (!footerMatches)
            return false;

        if (!footerText.toLowerCase().startsWith("actions"))
            return false;

        if (!reaction.message.guild)
            return false;

        const directionToIncrement = reaction.emoji.name === '▶️' ? 1 : -1;

        const user = footerMatches[1];
        const page = parseInt(footerMatches[2]);
        const type = footerMatches[3];
        const newPage = page + directionToIncrement;

        if (page + directionToIncrement < 0)
            return;

        const actions = await this.fetchActionsForUser(user, type, (newPage)*5);

        if (actions) {
            const newEmbed = await this.getEmbed(user, type, newPage, reaction.message.guild, actions);
            if (typeof newEmbed !== 'string') {
                await message.edit(newEmbed);
            }

            return true;
        }

        return true;
    }
}