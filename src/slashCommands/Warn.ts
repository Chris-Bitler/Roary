import {ExtendedSlashCommand} from './ExtendedSlashCommand';
import {Client, Guild} from 'discord.js';
import {CommandContext, CommandOptionType, SlashCreator, User} from 'slash-create';
import {Setting} from "../models/Setting";
import {KickService} from "../service/KickService";
import {WarnService} from "../service/WarnService";

/**
 * Kick slash command
 */
export class WarnCommand extends ExtendedSlashCommand {
    client: Client

    /**
     * Create a new instance of the kick slash command
     * @param client The discord.js client
     * @param creator The slash creator instance
     */
    constructor(client: Client, creator: SlashCreator) {
        super(creator, {
            name: 'warn',
            description: 'Warn moderation command',
            requiredPermissions: ['KICK_MEMBERS'],
            options: [{
                type: CommandOptionType.USER,
                name: 'user',
                description: 'The user to warn',
                required: true,
            }, {
                type: CommandOptionType.STRING,
                name: 'reason',
                description: 'The reason to warn the user for',
                required: true,
            }]
        });
        this.client = client;
    }

    /**
     * Run the command
     * @param context The command context
     */
    async run(context: CommandContext) {
        const { guild, channel } = this.getGuildChannel(this.client, context);
        if (!guild || !channel) {
            context.send('This command must be used in a text channel in a discord server.', { ephemeral: true });
            return;
        }
        const hasPermission = this.hasPermission(context);
        if (hasPermission) {
            const user = context.options.user as string;
            const reason = context.options.reason as string;
            const sender = guild.member(context.user.id);
            const targetUser = guild.member(user);
            if (sender && targetUser) {
                const message = await WarnService.getInstance().warnUser(targetUser, sender, reason);
                context.send(message, { ephemeral: true })
            }
        }
    }
}