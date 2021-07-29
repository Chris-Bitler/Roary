import {CommandInteraction, Permissions, User} from 'discord.js';
import {MuteService} from "../service/MuteService";
import {Command} from "../types/Command";
import {getCommandOption, OPTION_TYPES} from "../util/CommandUtils";

/**
 * Unmute slash command
 */
export class UnmuteCommand implements Command {
    REQUIRED_PERMISSION = Permissions.FLAGS.KICK_MEMBERS;
    COMMAND_DATA = {
        name: 'runmute',
        description: 'Unmute moderation command',
        options: [{
            type: OPTION_TYPES.USER,
            name: 'user',
            description: 'The user to unmute',
            required: true,
        }],
    };

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
            const targetUser = await guild.members.fetch(user);
            if (sender && targetUser) {
                const message = await MuteService.getInstance().unmuteUser(targetUser.id, guild.id);
                await interaction.reply({ content: message, ephemeral: true });
            }
        }
    }
}