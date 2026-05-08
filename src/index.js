import "dotenv/config";
import express from "express";

import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Partials,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember
  ]
});

const tempVoiceChannels = new Map();
const controlMessages = new Map();

async function getChannel(id) {
  if (!id) return null;

  const cachedChannel = client.channels.cache.get(id);

  if (cachedChannel) {
    return cachedChannel;
  }

  try {
    return await client.channels.fetch(id);
  } catch {
    return null;
  }
}

async function sendLog(channelId, embed) {
  const channel = await getChannel(channelId);

  if (!channel) return;

  await channel.send({
    embeds: [embed]
  }).catch(() => {});
}

client.once("ready", () => {
  console.log(`${client.user.tag} aktif!`);
});

// ODA OLUŞTURMA SİSTEMİ

client.on("voiceStateUpdate", async (oldState, newState) => {

  try {

    const createChannelId = process.env.CREATE_VOICE_CHANNEL_ID;
    const tempCategoryId = process.env.TEMP_VOICE_CATEGORY_ID;
    const controlChannelId = process.env.VOICE_CONTROL_CHANNEL_ID;

    if (newState.channelId === createChannelId) {

      const voiceChannel = await newState.guild.channels.create({
        name: `🔊 ${newState.member.user.username}`,
        type: ChannelType.GuildVoice,
        parent: tempCategoryId
      });

      tempVoiceChannels.set(voiceChannel.id, {
        ownerId: newState.member.id
      });

      await newState.member.voice.setChannel(voiceChannel);

      const controlEmbed = new EmbedBuilder()
        .setTitle("Oda Kontrol Paneli")
        .setDescription(`
🔒 Odayı kilitle  
🔓 Odayı aç  
👥 Limit ayarla  
🗑️ Odayı sil
        `)
        .setColor("Purple");

      const row = new ActionRowBuilder().addComponents(

        new ButtonBuilder()
          .setCustomId(`lock_${voiceChannel.id}`)
          .setLabel("Kilitle")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId(`unlock_${voiceChannel.id}`)
          .setLabel("Aç")
          .setEmoji("🔓")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`limit_${voiceChannel.id}`)
          .setLabel("Limit")
          .setEmoji("👥")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId(`delete_${voiceChannel.id}`)
          .setLabel("Sil")
          .setEmoji("🗑️")
          .setStyle(ButtonStyle.Secondary)

      );

      const controlChannel = await getChannel(controlChannelId);

      if (!controlChannel) {
        console.log("Oda kontrol kanalı bulunamadı:", controlChannelId);
        return;
      }

      const msg = await controlChannel.send({
        content: `${newState.member}`,
        embeds: [controlEmbed],
        components: [row]
      });

      controlMessages.set(voiceChannel.id, msg.id);
    }

    if (oldState.channelId && tempVoiceChannels.has(oldState.channelId)) {

      const oldChannel = oldState.guild.channels.cache.get(oldState.channelId);

      if (oldChannel && oldChannel.members.size === 0) {

        const controlChannel = await getChannel(process.env.VOICE_CONTROL_CHANNEL_ID);

        const msgId = controlMessages.get(oldChannel.id);

        if (msgId && controlChannel) {

          const msg = await controlChannel.messages.fetch(msgId).catch(() => null);

          if (msg) {
            await msg.delete().catch(() => {});
          }

        }

        controlMessages.delete(oldChannel.id);
        tempVoiceChannels.delete(oldChannel.id);

        await oldChannel.delete().catch(() => {});
      }
    }

  } catch (error) {

    console.error("Oda sistemi hatası:", error);

  }

});

// ÜYE GİRİŞ LOG

client.on("guildMemberAdd", async member => {

  const embed = new EmbedBuilder()
    .setTitle("Üye Katıldı")
    .setDescription(`${member.user} sunucuya katıldı.`)
    .setColor("Green")
    .setTimestamp();

  await sendLog(process.env.MEMBER_LOG_CHANNEL_ID, embed);

});

// ÜYE ÇIKIŞ LOG

client.on("guildMemberRemove", async member => {

  const embed = new EmbedBuilder()
    .setTitle("Üye Ayrıldı")
    .setDescription(`${member.user} sunucudan ayrıldı.`)
    .setColor("Red")
    .setTimestamp();

  await sendLog(process.env.MEMBER_LOG_CHANNEL_ID, embed);

});

// MESAJ SİLME LOG

client.on("messageDelete", async message => {

  if (message.author?.bot) return;

  const embed = new EmbedBuilder()
    .setTitle("Mesaj Silindi")
    .addFields(
      {
        name: "Kullanıcı",
        value: message.author?.tag || "Bilinmiyor"
      },
      {
        name: "Mesaj",
        value: message.content || "Mesaj yok"
      }
    )
    .setColor("Orange")
    .setTimestamp();

  await sendLog(process.env.MESSAGE_LOG_CHANNEL_ID, embed);

});

// MESAJ DÜZENLEME LOG

client.on("messageUpdate", async (oldMessage, newMessage) => {

  if (oldMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;

  const embed = new EmbedBuilder()
    .setTitle("Mesaj Düzenlendi")
    .addFields(
      {
        name: "Kullanıcı",
        value: oldMessage.author?.tag || "Bilinmiyor"
      },
      {
        name: "Eski",
        value: oldMessage.content || "Yok"
      },
      {
        name: "Yeni",
        value: newMessage.content || "Yok"
      }
    )
    .setColor("Yellow")
    .setTimestamp();

  await sendLog(process.env.MESSAGE_LOG_CHANNEL_ID, embed);

});

// INTERACTION SİSTEMİ

client.on("interactionCreate", async interaction => {

  try {

    // VERIFY BUTONU

    if (interaction.isButton()) {

      if (interaction.customId === "verify_button") {

        const roleId = process.env.VERIFY_ROLE_ID;
        const role = interaction.guild.roles.cache.get(roleId);

        if (!role) {

          return interaction.reply({
            content: "Verify rolü bulunamadı.",
            ephemeral: true
          });

        }

        const member = await interaction.guild.members.fetch(interaction.user.id);

        if (member.roles.cache.has(roleId)) {

          return interaction.reply({
            content: "Zaten doğrulanmışsın.",
            ephemeral: true
          });

        }

        await member.roles.add(role);

        const embed = new EmbedBuilder()
          .setTitle("Üye Doğrulandı")
          .setDescription(`${interaction.user} doğrulandı.`)
          .setColor("Green")
          .setTimestamp();

        await sendLog(process.env.MEMBER_LOG_CHANNEL_ID, embed);

        return interaction.reply({
          content: "Başarıyla doğrulandın.",
          ephemeral: true
        });

      }

      // ODA BUTONLARI

      const [action, channelId] = interaction.customId.split("_");

      const data = tempVoiceChannels.get(channelId);

      if (!data) return;

      if (interaction.user.id !== data.ownerId) {

        return interaction.reply({
          content: "Bu oda sana ait değil.",
          ephemeral: true
        });

      }

      const channel = interaction.guild.channels.cache.get(channelId);

      if (!channel) return;

      if (action === "lock") {

        await channel.permissionOverwrites.edit(interaction.guild.id, {
          Connect: false
        });

        return interaction.reply({
          content: "Oda kilitlendi.",
          ephemeral: true
        });

      }

      if (action === "unlock") {

        await channel.permissionOverwrites.edit(interaction.guild.id, {
          Connect: true
        });

        return interaction.reply({
          content: "Oda açıldı.",
          ephemeral: true
        });

      }

      if (action === "delete") {

        const controlChannel = await getChannel(process.env.VOICE_CONTROL_CHANNEL_ID);
        const msgId = controlMessages.get(channelId);

        if (msgId && controlChannel) {
          const msg = await controlChannel.messages.fetch(msgId).catch(() => null);
          if (msg) await msg.delete().catch(() => {});
        }

        controlMessages.delete(channelId);
        tempVoiceChannels.delete(channelId);

        await channel.delete().catch(() => {});

        return interaction.reply({
          content: "Oda silindi.",
          ephemeral: true
        }).catch(() => {});

      }

      if (action === "limit") {

        const modal = new ModalBuilder()
          .setCustomId(`limitmodal_${channelId}`)
          .setTitle("Oda Limiti");

        const input = new TextInputBuilder()
          .setCustomId("limitinput")
          .setLabel("Kişi limiti")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const row = new ActionRowBuilder().addComponents(input);

        modal.addComponents(row);

        return interaction.showModal(modal);

      }

    }

    // LIMIT MODAL

    if (interaction.isModalSubmit()) {

      const [modalType, channelId] = interaction.customId.split("_");

      if (modalType === "limitmodal") {

        const limit = Number(
          interaction.fields.getTextInputValue("limitinput")
        );

        const channel = interaction.guild.channels.cache.get(channelId);

        if (!channel) {

          return interaction.reply({
            content: "Kanal bulunamadı.",
            ephemeral: true
          });

        }

        await channel.setUserLimit(limit);

        return interaction.reply({
          content: `Oda limiti ${limit} olarak ayarlandı.`,
          ephemeral: true
        });

      }

    }

    if (!interaction.isChatInputCommand()) return;

    // PING

    if (interaction.commandName === "ping") {
      return interaction.reply("Pong!");
    }

    // VERIFY PANEL

    if (interaction.commandName === "verify-kur") {

      const embed = new EmbedBuilder()
        .setTitle("NTE Türkiye Doğrulama")
        .setDescription("Doğrulamak için aşağıdaki butona bas.")
        .setColor("Purple");

      const button = new ButtonBuilder()
        .setCustomId("verify_button")
        .setLabel("Doğrula")
        .setEmoji("✅")
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(button);

      return interaction.reply({
        embeds: [embed],
        components: [row]
      });

    }

    // BAN

    if (interaction.commandName === "ban") {

      const user = interaction.options.getUser("kullanici");
      const member = await interaction.guild.members.fetch(user.id);

      await member.ban();

      const embed = new EmbedBuilder()
        .setTitle("Ban")
        .setDescription(`${user.tag} banlandı.`)
        .setColor("Red");

      await sendLog(process.env.MOD_LOG_CHANNEL_ID, embed);

      return interaction.reply(`${user.tag} banlandı.`);

    }

    // KICK

    if (interaction.commandName === "kick") {

      const user = interaction.options.getUser("kullanici");
      const member = await interaction.guild.members.fetch(user.id);

      await member.kick();

      const embed = new EmbedBuilder()
        .setTitle("Kick")
        .setDescription(`${user.tag} atıldı.`)
        .setColor("Orange");

      await sendLog(process.env.MOD_LOG_CHANNEL_ID, embed);

      return interaction.reply(`${user.tag} atıldı.`);

    }

    // CLEAR

    if (interaction.commandName === "clear") {

      const amount = interaction.options.getInteger("miktar");

      await interaction.channel.bulkDelete(amount, true);

      const embed = new EmbedBuilder()
        .setTitle("Mesaj Temizlendi")
        .setDescription(`${amount} mesaj silindi.`)
        .setColor("Blue");

      await sendLog(process.env.MOD_LOG_CHANNEL_ID, embed);

      return interaction.reply({
        content: `${amount} mesaj silindi.`,
        ephemeral: true
      });

    }

    // TIMEOUT

    if (interaction.commandName === "timeout") {

      const user = interaction.options.getUser("kullanici");
      const minutes = interaction.options.getInteger("dakika");

      const member = await interaction.guild.members.fetch(user.id);

      await member.timeout(minutes * 60 * 1000);

      const embed = new EmbedBuilder()
        .setTitle("Timeout")
        .setDescription(`${user.tag} timeout aldı.`)
        .setColor("Purple");

      await sendLog(process.env.MOD_LOG_CHANNEL_ID, embed);

      return interaction.reply(`${user.tag} timeout aldı.`);

    }

    // USERINFO

    if (interaction.commandName === "userinfo") {

      const user = interaction.options.getUser("kullanici") || interaction.user;

      const embed = new EmbedBuilder()
        .setTitle(`${user.username}`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          {
            name: "ID",
            value: user.id
          }
        )
        .setColor("Blue");

      return interaction.reply({
        embeds: [embed]
      });

    }

    // SERVERINFO

    if (interaction.commandName === "serverinfo") {

      const guild = interaction.guild;

      const embed = new EmbedBuilder()
        .setTitle(guild.name)
        .addFields(
          {
            name: "Üye Sayısı",
            value: `${guild.memberCount}`
          }
        )
        .setColor("Green");

      return interaction.reply({
        embeds: [embed]
      });

    }

  } catch (error) {

    console.error(error);

    if (interaction.replied || interaction.deferred) {

      return interaction.editReply("Bir hata oluştu.");

    }

    return interaction.reply({
      content: "Bir hata oluştu.",
      ephemeral: true
    });

  }

});

client.login(process.env.TOKEN);

const app = express();

app.get("/", (req, res) => {
  res.send("Moderasyon botu aktif!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Web server ${PORT} portunda çalışıyor.`);
});