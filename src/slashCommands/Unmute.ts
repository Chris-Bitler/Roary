import {ExtendedSlashCommand} from './ExtendedSlashCommand';
import {Client} from 'discord.js';
import {CommandContext, CommandOptionType, SlashCreator} from 'slash-create';
import {BanService} from "../service/BanService";
import {MuteService} from "../service/MuteService";

/**
 * Unmute slash command
 */
export class UnmuteCommand extends ExtendedSlashCommand {
    client: Client

    /**
     * Create a new instance of the Mute slash command
     * @param client The discord.js client
     * @param creator The slash creator instance
     */
    constructor(client: Client, creator: SlashCreator) {
        super(creator, {
            name: 'unmute',
            description: 'Unmute moderation command',
            requiredPermissions: ['KICK_MEMBERS'],
            options: [{
                type: CommandOptionType.USER,
                name: 'user',
                description: 'The user to unmute',
                required: true,
            }],
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
            const sender = guild.member(context.user.id);
            const targetUser = guild.member(user);
            if (sender && targetUser) {
                const message = await MuteService.getInstance().unmuteUser(user, guild.id);
                context.send(message, { ephemeral: true })
            }
        }
    }
}