import {CommandInteraction, MessageEmbed, Permissions, User} from "discord.js";
import {ActionService} from "../service/ActionService";
import {Command} from "../types/Command";
import {getCommandOption, OPTION_TYPES} from "../util/CommandUtils";

/**
 * Actions slash command
 */
export class ActionsCommand implements Command {
    COMMAND_DATA = {
        name: 'ractions',
        description: 'Actions moderation command',
        requiredPermissions: ['KICK_MEMBERS'],
        options: [{
            type: OPTION_TYPES.USER,
            name: 'user',
            description: 'The user to retrieve punishments for',
            required: true,
        }, {
            type: OPTION_TYPES.STRING,
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
    }
    REQUIRED_PERMISSION = Permissions.FLAGS.KICK_MEMBERS;

    /**
     * Run the command
     * @param interaction The command interaction
     */
    async run(interaction: CommandInteraction) {
        const actionService = ActionService.getInstance();
        const guild = interaction?.guild;
        const channel = interaction?.channel;
        if (!guild || !channel) {
            await interaction.reply({ content: 'This command must be used in a text channel in a discord server.', ephemeral: true })
            return;
        }

        const senderUser = interaction.user;
        const sender = await interaction.guild?.members?.fetch(senderUser);
        const hasPermission = sender?.permissions.has(this.REQUIRED_PERMISSION);

        if (!hasPermission) {
            return;
        }

        const user = getCommandOption(interaction.options.get('user')) as User;
        const type = getCommandOption(interaction.options.get('type')) as string;
        const actions = await actionService.fetchActionsForUser(user, type, 0);
        if (actions) {
            const embed = await actionService.getEmbed(user, type, 0, guild, actions);
            if (embed instanceof MessageEmbed) {
                await interaction.reply({ embeds: [embed] })
            } else {
                await interaction.reply({ content: embed })
            }
            const contextMessage = await interaction.fetchReply();
            const message = await channel.messages.fetch(contextMessage.id);
            await message.react('◀️');
            await message.react('▶️');
        } else {
            await interaction.reply({ content: `No actions of ${type} for user` });
        }
    }
}