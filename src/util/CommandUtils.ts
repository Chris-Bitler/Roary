import {
    Channel,
    Collection,
    CommandInteraction,
    CommandInteractionOption,
    Guild,
    GuildMember,
    Role,
    User,
    ApplicationCommandOptionType
} from "discord.js";
import {CommandInitData} from "../types/Command";

/**
 * Gets a command option's value or throws an error if it isn't defined.
 * Note: This should only be used to pull values from REQUIRED values and errors should be handled
 * @param option the command interaction option
 */
const getCommandOption = (option: CommandInteractionOption | undefined): User | boolean | string | Channel | number | GuildMember | Role | Collection<String, CommandInteractionOption> => {
    if (!option)
        throw 'Undefined option passed';

    const type = option.type;

    switch(type) {
        case "USER":
            return option.user as User;
        case "BOOLEAN":
            return !!option.value as boolean;
        case "STRING":
            return option.value as string;
        case "CHANNEL":
            return option.channel as Channel;
        case "INTEGER":
            return option.value as number;
        case "MENTIONABLE":
            return option.member as GuildMember;
        case "ROLE":
            return option.role as Role;
        case "SUB_COMMAND":
        case "SUB_COMMAND_GROUP":
            return option.options ?? new Collection<string, CommandInteractionOption>();
    }
}

const checkPermissions = async (guild: Guild | null, user: User | null, permission: bigint) => {
    if (!user)
        return false;

    const sender = await guild?.members.fetch(user);
    return sender?.permissions.has(permission);
}

const getCommandInitData = (interaction: CommandInteraction): CommandInitData | false => {
    const guild = interaction?.guild;
    const channel = interaction?.channel;
    const user = interaction?.user;
    if (!guild || !channel || !user) {
        return false;
    }

    return {
        guild,
        channel,
        user
    };
}

// The enum for this isn't exported from discord.js so we create this object to make typescript happy
const OPTION_TYPES = {
    STRING: 'STRING' as ApplicationCommandOptionType,
    SUB_COMMAND: 'SUB_COMMAND' as ApplicationCommandOptionType,
    SUB_COMMAND_GROUP: 'SUB_COMMAND_GROUP' as ApplicationCommandOptionType,
    INTEGER: 'INTEGER' as ApplicationCommandOptionType,
    BOOLEAN: 'BOOLEAN' as ApplicationCommandOptionType,
    USER: 'USER' as ApplicationCommandOptionType,
    CHANNEL: 'CHANNEL' as ApplicationCommandOptionType,
    ROLE: 'ROLE' as ApplicationCommandOptionType,
    MENTIONABLE: 'MENTIONABLE' as ApplicationCommandOptionType
}

export { getCommandOption, checkPermissions, getCommandInitData, OPTION_TYPES }