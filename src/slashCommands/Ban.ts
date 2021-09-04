import {CommandInteraction, Permissions, User} from 'discord.js';
import {BanService} from "../service/BanService";
import {Command} from "../types/Command";
import {checkPermissions, getCommandInitData, getCommandOption, OPTION_TYPES} from "../util/CommandUtils";

/**
 * Ban slash command
 */
export class BanCommand implements Command {
    COMMAND_DATA = {
        name: 'rban',
        description: 'Ban moderation command',
        options: [{
            type: OPTION_TYPES.USER,
            name: 'user',
            description: 'The user to ban',
            required: true,
        }, {
            type: OPTION_TYPES.STRING,
            name: 'time',
            description: 'The amount of time to ban a user for',
            required: true,
        }, {
            type: OPTION_TYPES.STRING,
            name: 'reason',
            description: 'The reason to ban the user for',
            required: true,
        }, {
            type: OPTION_TYPES.BOOLEAN,
            name: 'public',
            description: 'Show the message instead of just to yourself',
            required: false
        }]
    };
    REQUIRED_PERMISSION = Permissions.FLAGS.BAN_MEMBERS;

    /**
     * Run the command
     * @param interaction The command interaction
     */
    async run(interaction: CommandInteraction) {
        const initData = getCommandInitData(interaction);
        if (!initData) {
            await interaction.reply({ content: 'This command must be used in a text channel in a discord server.', ephemeral: true })
            return;
        }
        const { guild, user } = initData;
        const hasPermission = checkPermissions(guild, user, this.REQUIRED_PERMISSION);
        if (hasPermission) {
            const user = getCommandOption(interaction.options.get('user')) as User;
            const time = getCommandOption(interaction.options.get('time')) as string;
            const reason = getCommandOption(interaction.options.get('reason')) as string;
            const publicOption = interaction.options.get('public');
            let isPublic = false;
            if (isPublic) {
                isPublic = getCommandOption(publicOption) as boolean;
            }
            const sender = await guild.members.fetch(interaction.user.id);
            const targetUser = await guild.members.fetch(user);
            if (sender && targetUser) {
                const message = await BanService.getInstance().banUser(targetUser, sender, reason, time);
                await interaction.reply({ content: message, ephemeral: isPublic});
            }
        }
    }
}