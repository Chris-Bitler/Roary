import {ExtendedSlashCommand} from "./ExtendedSlashCommand";
import {Client} from "discord.js";
import {CommandContext, CommandOptionType, SlashCreator} from "slash-create";
import {ActionService} from "../service/ActionService";

/**
 * Actions slash command
 */
export class ActionsCommand extends ExtendedSlashCommand {
    client: Client

    /**
     * Create a new instance of the actions slash command
     * @param client The discord.js client
     * @param creator The slash creator instance
     */
    constructor(client: Client, creator: SlashCreator) {
        super(creator, {
            name: 'ractions',
            description: 'Actions moderation command',
            requiredPermissions: ['KICK_MEMBERS'],
            options: [{
                type: CommandOptionType.USER,
                name: 'user',
                description: 'The user to retrieve punishments for',
                required: true,
            }, {
                type: CommandOptionType.STRING,
                name: 'type',
                description: 'The type to choose',
                required: true,
                choices: [{
                    name: 'Mute',
                    value: 'mute'
                }, {
                    name: 'Ban',
                    value: 'ban'
                }, {
                    name: 'Warn',
                    value: 'warn'
                }, {
                    name: 'Kick',
                    value: 'kick'
                }]
            }]
        });
        this.client = client;
    }

    /**
     * Run the command
     * @param context The command context
     */
    async run(context: CommandContext) {
        console.log('run');
        const actionService = ActionService.getInstance();
        const user = context.options.user as string;
        const type = context.options.type as string;
        const { guild, channel } = this.getGuildChannel(this.client, context);
        if (!guild || !channel) {
            context.send('This command must be used in a text channel in a discord server.', { ephemeral: true });
            return;
        }

        const actions = await actionService.fetchActionsForUser(user, type, 0);
        if (actions) {
            const embed = await actionService.getEmbed(user, type, 0, guild, actions);
            const sent = await context.send({
                embeds: [embed]
            });
            const contextMessage = await context.fetch();
            const message = await channel.messages.fetch(contextMessage.id);
            await message.react('◀️');
            await message.react('▶️');
        } else {
            await context.send(`No actions of ${type} for user`);
        }
    }
}