import {CommandInteraction, Permissions, User} from 'discord.js';
import {Command} from "../types/Command";
import {KickService} from "../service/KickService";
import {getCommandOption, OPTION_TYPES} from "../util/CommandUtils";

/**
 * Kick slash command
 */
export class KickCommand implements Command {
    REQUIRED_PERMISSION = Permissions.FLAGS.KICK_MEMBERS
    COMMAND_DATA = {
        name: 'rkick',
        description: 'Kick moderation command',
        options: [{
            type: OPTION_TYPES.USER,
            name: 'user',
            description: 'The user to kick',
            required: true,
        }, {
            type: OPTION_TYPES.STRING,
            name: 'reason',
            description: 'The reason to kick the user for',
            required: true,
        }, {
            type: OPTION_TYPES.BOOLEAN,
            name: 'public',
            description: 'Show the message instead of just to yourself',
            required: false
        }]
    }

    /**
     * Run the command
     * @param interaction The command interaction
     */
    async run(interaction: CommandInteraction) {
        const guild = interaction?.guild;
        const channel = interaction?.channel;
        const senderUser = interaction?.user;
        if (!guild || !channel || !senderUser) {
            await interaction.reply({ content: 'This command must be used in a text channel in a discord server.', ephemeral: true })
            return;
        }
        const sender = await guild.members.fetch(senderUser);
        const hasPermission = sender?.permissions.has(this.REQUIRED_PERMISSION);
        if (hasPermission) {
            const user = getCommandOption(interaction.options.get('user')) as User;
            const reason = getCommandOption(interaction.options.get('reason')) as string;
            const publicOption = interaction.options.get('public');
            let isPublic = false;
            if (isPublic) {
                isPublic = getCommandOption(publicOption) as boolean;
            }
            const targetUser = await guild.members.fetch(user);
            if (sender && targetUser) {
                const message = await KickService.getInstance().kickUser(targetUser, sender, reason);
                await interaction.reply({ content: message, ephemeral: isPublic });
            }
        }
    }
}