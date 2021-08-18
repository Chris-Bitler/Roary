import {
    ClientUser,
    Guild,
    Message,
    MessageAttachment,
    MessageEmbed,
    PartialMessage,
    Snowflake,
    TextChannel
} from "discord.js";
import {Setting} from "../models/Setting";

export class ModerationService {
    async getDeletedMessageDeletor(message: Message | PartialMessage) {
        if (!message.guild)
            return null;
        const auditLog = await message.guild.fetchAuditLogs({type: 72, limit: 1});
        const first = auditLog.entries.first();
        if (first?.targetType === 'MESSAGE') {
            const target = first.target as ClientUser;
            console.log(target.id);
            // @ts-ignore
            if (target.id === message.author?.id && first?.extra?.channel.id === message.channel.id) {
                return first.executor || null;
            }
        }

        return null;
    }
    async handleMessageDelete(message: Message | PartialMessage) {
        if (!message.guild)
            return;
        const embed = new MessageEmbed();
        const deletor = await this.getDeletedMessageDeletor(message);
        const author = message.author;
        const authorString = author ? `${author.username}#${author.discriminator}` : 'Unknown';
        const channel = message.channel;
        const showDeletor = deletor && deletor !== author;
        embed.setAuthor(authorString, author?.avatarURL() || '');
        embed.addField('Message deleted:', `Message ${message.id} deleted from <#${channel.id}> ${showDeletor ? `by ${deletor?.username}#${deletor?.discriminator}` : ''}`, true);
        if(message.content) {
            embed.addField('*Content:*', message.content);
        }
        if (message.attachments) {
            let counter = 1;
            message.attachments.forEach((attachment: MessageAttachment) => {
                embed.addField(`Attachment ${counter}:`, `[View](${attachment.url})`);
                counter++;
            });
        }

        embed.setTimestamp(new Date());

        const channelId = await this.getDeletedChannel(message.guild.id);
        if (!channelId)
            return;
        const channelToSendTo = await message.guild.channels.fetch(channelId);
        const isTextChannel = channelToSendTo?.isText();
        if (!channelToSendTo && isTextChannel)
            return;

        await (channelToSendTo as TextChannel).send({
            embeds: [embed]
        });
    }

    async handleMessageEdit(oldDiscordMessage: Message | PartialMessage, newDiscordMessage: Message | PartialMessage) {
        let oldMessage = oldDiscordMessage;
        if (oldMessage.partial) {
            oldMessage = await oldDiscordMessage.fetch();
        }
        let newMessage = newDiscordMessage;
        if (newMessage.partial) {
            newMessage = await newDiscordMessage.fetch();
        }

        if (!oldMessage.guild || !newMessage.guild)
            return;
        const embed = new MessageEmbed();
        const author = oldMessage.author;
        const authorString = author ? `${author.username}#${author.discriminator}` : 'Unknown';
        const channel = oldMessage.channel;
        embed.setAuthor(authorString, author?.avatarURL() || '');
        embed.addField('Message edited:', `Message ${oldMessage.id} edited in <#${channel.id}>`, true);

        if(oldMessage.content) {
            embed.addField('*Old Content:*', oldMessage.content);
        }
        if (oldMessage.attachments) {
            let counter = 1;
            oldMessage.attachments.forEach((attachment: MessageAttachment) => {
                embed.addField(`Old Attachment ${counter}:`, `[View](${attachment.url})`);
                counter++;
            });
        }

        if(newMessage.content) {
            embed.addField('*New Content:*', newMessage.content);
        }
        if (newMessage.attachments) {
            let counter = 1;
            newMessage.attachments.forEach((attachment: MessageAttachment) => {
                embed.addField(`New Attachment ${counter}:`, `[View](${attachment.url})`);
                counter++;
            });
        }

        embed.setTimestamp(new Date());

        const channelId = await this.getEditedChannel(oldMessage.guild.id);
        if (!channelId)
            return;
        const channelToSendTo = await oldMessage.guild.channels.fetch(channelId);
        const isTextChannel = channelToSendTo?.isText();
        if (!channelToSendTo && isTextChannel)
            return;

        await (channelToSendTo as TextChannel).send({
            embeds: [embed]
        });
    }

    private async getDeletedChannel(guildId: string) {
        const deletedMessageChannelId = await Setting.getSetting('deletedMessageChannel', guildId);
        return deletedMessageChannelId ? deletedMessageChannelId.value as Snowflake : null;
    }

    private async getEditedChannel(guildId: string) {
        const editedMessageChannelId = await Setting.getSetting('editedMessageChannel', guildId);
        return editedMessageChannelId ? editedMessageChannelId.value as Snowflake : null;
    }
}