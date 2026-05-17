import "dotenv/config";
import express from "express";
import mongoose from "mongoose";

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

import { GuildConfig } from "./models/GuildConfig.js";

// MongoDB Bağlantısı
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/moderasyon-bot")
  .then(() => console.log("MongoDB bağlantısı başarılı!"))
  .catch(err => console.error("MongoDB bağlantı hatası:", err));

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
  if (!channelId) return;
  const channel = await getChannel(channelId);

  if (!channel) return;

  await channel.send({
    embeds: [embed]
  }).catch(() => {});
}

client.once("ready", () => {
  client.user.setPresence({
    activities: [{
      name: "🛡️ Advanced server protection",
      type: 0
    }],
    status: "online"
  });

  console.log(`${client.user.tag} aktif!`);
});

// ODA OLUŞTURMA SİSTEMİ

client.on("voiceStateUpdate", async (oldState, newState) => {
  try {
    const guildId = newState.guild?.id || oldState.guild?.id;
    if (!guildId) return;

    const config = await GuildConfig.findOne({ guildId });
    if (!config) return;

    const createChannelId = config.createVoiceChannelId;
    const tempCategoryId = config.tempVoiceCategoryId;
    const controlChannelId = config.voiceControlChannelId;

    if (createChannelId && newState.channelId === createChannelId) {
      const voiceChannel = await newState.guild.channels.create({
        name: `🔊 ${newState.member.user.username}`,
        type: ChannelType.GuildVoice,
        parent: tempCategoryId || null
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

      if (controlChannelId) {
        const controlChannel = await getChannel(controlChannelId);

        if (controlChannel) {
          const msg = await controlChannel.send({
            content: `${newState.member}`,
            embeds: [controlEmbed],
            components: [row]
          });
          controlMessages.set(voiceChannel.id, msg.id);
        }
      }
    }

    if (oldState.channelId && tempVoiceChannels.has(oldState.channelId)) {
      const oldChannel = oldState.guild.channels.cache.get(oldState.channelId);

      if (oldChannel && oldChannel.members.size === 0) {
        if (controlChannelId) {
          const controlChannel = await getChannel(controlChannelId);
          const msgId = controlMessages.get(oldChannel.id);

          if (msgId && controlChannel) {
            const msg = await controlChannel.messages.fetch(msgId).catch(() => null);

            if (msg) {
              await msg.delete().catch(() => {});
            }
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

// ÜYE GİRİŞ LOG + DOĞRULANMADI ROLÜ

client.on("guildMemberAdd", async member => {
  const config = await GuildConfig.findOne({ guildId: member.guild.id });
  if (!config) return;

  const unverifiedRoleId = config.unverifiedRoleId;

  if (unverifiedRoleId) {
    const role = member.guild.roles.cache.get(unverifiedRoleId);

    if (role) {
      await member.roles.add(role).catch(() => {});
    }
  }

  if (config.memberLogChannelId) {
    const embed = new EmbedBuilder()
      .setTitle("Üye Katıldı")
      .setDescription(`${member.user} sunucuya katıldı.`)
      .setColor("Green")
      .setTimestamp();

    await sendLog(config.memberLogChannelId, embed);
  }
});

// ÜYE ÇIKIŞ LOG

client.on("guildMemberRemove", async member => {
  const config = await GuildConfig.findOne({ guildId: member.guild.id });
  if (!config || !config.memberLogChannelId) return;

  const embed = new EmbedBuilder()
    .setTitle("Üye Ayrıldı")
    .setDescription(`${member.user} sunucudan ayrıldı.`)
    .setColor("Red")
    .setTimestamp();

  await sendLog(config.memberLogChannelId, embed);
});

// MESAJ SİLME LOG

client.on("messageDelete", async message => {
  if (message.author?.bot || !message.guild) return;

  const config = await GuildConfig.findOne({ guildId: message.guild.id });
  if (!config || !config.messageLogChannelId) return;

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

  await sendLog(config.messageLogChannelId, embed);
});

// MESAJ DÜZENLEME LOG

client.on("messageUpdate", async (oldMessage, newMessage) => {
  if (oldMessage.author?.bot || !oldMessage.guild) return;
  if (oldMessage.content === newMessage.content) return;

  const config = await GuildConfig.findOne({ guildId: oldMessage.guild.id });
  if (!config || !config.messageLogChannelId) return;

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

  await sendLog(config.messageLogChannelId, embed);
});

// INTERACTION SİSTEMİ

client.on("interactionCreate", async interaction => {
  if (!interaction.guild) return;

  try {
    // VERIFY BUTONU

    if (interaction.isButton()) {
      if (interaction.customId === "verify_button") {
        const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
        if (!config || !config.verifyRoleId) {
          return interaction.reply({
            content: "Sunucu doğrulama ayarları yapılmamış.",
            ephemeral: true
          });
        }

        const roleId = config.verifyRoleId;
        const unverifiedRoleId = config.unverifiedRoleId;

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

        if (unverifiedRoleId && member.roles.cache.has(unverifiedRoleId)) {
          await member.roles.remove(unverifiedRoleId).catch(() => {});
        }

        if (config.memberLogChannelId) {
          const embed = new EmbedBuilder()
            .setTitle("Üye Doğrulandı")
            .setDescription(`${interaction.user} doğrulandı.`)
            .setColor("Green")
            .setTimestamp();

          await sendLog(config.memberLogChannelId, embed);
        }

        return interaction.reply({
          content: "Başarıyla doğrulandın.",
          ephemeral: true
        });
      }

      // ODA BUTONLARI

      if (interaction.customId.startsWith("lock_") || 
          interaction.customId.startsWith("unlock_") || 
          interaction.customId.startsWith("limit_") || 
          interaction.customId.startsWith("delete_")) {
        
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
          const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
          if (config && config.voiceControlChannelId) {
            const controlChannel = await getChannel(config.voiceControlChannelId);
            const msgId = controlMessages.get(channelId);

            if (msgId && controlChannel) {
              const msg = await controlChannel.messages.fetch(msgId).catch(() => null);

              if (msg) {
                await msg.delete().catch(() => {});
              }
            }
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
    }

    // LIMIT MODAL

    if (interaction.isModalSubmit()) {
      const [modalType, channelId] = interaction.customId.split("_");

      if (modalType === "limitmodal") {
        const limit = Number(
          interaction.fields.getTextInputValue("limitinput")
        );

        if (Number.isNaN(limit) || limit < 0 || limit > 99) {
          return interaction.reply({
            content: "Lütfen 0 ile 99 arasında geçerli bir sayı gir.",
            ephemeral: true
          });
        }

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

    // KURULUM

    if (interaction.commandName === "kurulum") {
      const updateData = {};
      
      const createVoice = interaction.options.getChannel("create_voice_channel");
      if (createVoice) updateData.createVoiceChannelId = createVoice.id;

      const tempCategory = interaction.options.getChannel("temp_voice_category");
      if (tempCategory) updateData.tempVoiceCategoryId = tempCategory.id;

      const controlChannel = interaction.options.getChannel("voice_control_channel");
      if (controlChannel) updateData.voiceControlChannelId = controlChannel.id;

      const unverifiedRole = interaction.options.getRole("unverified_role");
      if (unverifiedRole) updateData.unverifiedRoleId = unverifiedRole.id;

      const verifyRole = interaction.options.getRole("verify_role");
      if (verifyRole) updateData.verifyRoleId = verifyRole.id;

      const memberLog = interaction.options.getChannel("member_log_channel");
      if (memberLog) updateData.memberLogChannelId = memberLog.id;

      const messageLog = interaction.options.getChannel("message_log_channel");
      if (messageLog) updateData.messageLogChannelId = messageLog.id;

      const modLog = interaction.options.getChannel("mod_log_channel");
      if (modLog) updateData.modLogChannelId = modLog.id;

      if (Object.keys(updateData).length === 0) {
        return interaction.reply({
          content: "Hiçbir ayar seçmediniz.",
          ephemeral: true
        });
      }

      await GuildConfig.findOneAndUpdate(
        { guildId: interaction.guild.id },
        updateData,
        { upsert: true, new: true }
      );

      return interaction.reply({
        content: "✅ Sunucu ayarları başarıyla kaydedildi.",
        ephemeral: true
      });
    }

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

    // MODERASYON İŞLEMLERİ İÇİN CONFIG

    const config = await GuildConfig.findOne({ guildId: interaction.guild.id });

    // BAN

    if (interaction.commandName === "ban") {
      const user = interaction.options.getUser("kullanici");
      const member = await interaction.guild.members.fetch(user.id);

      await member.ban();

      const embed = new EmbedBuilder()
        .setTitle("Ban")
        .setDescription(`${user.tag} banlandı.`)
        .setColor("Red");

      if (config?.modLogChannelId) {
        await sendLog(config.modLogChannelId, embed);
      }

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

      if (config?.modLogChannelId) {
        await sendLog(config.modLogChannelId, embed);
      }

      return interaction.reply(`${user.tag} atıldı.`);
    }

    // CLEAR

    if (interaction.commandName === "clear") {
      const amount = interaction.options.getInteger("miktar");

      if (amount < 1 || amount > 100) {
        return interaction.reply({
          content: "1 ile 100 arasında sayı gir.",
          ephemeral: true
        });
      }

      await interaction.channel.bulkDelete(amount, true);

      const embed = new EmbedBuilder()
        .setTitle("Mesaj Temizlendi")
        .setDescription(`${amount} mesaj silindi.`)
        .setColor("Blue");

      if (config?.modLogChannelId) {
        await sendLog(config.modLogChannelId, embed);
      }

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

      if (config?.modLogChannelId) {
        await sendLog(config.modLogChannelId, embed);
      }

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
  res.send("Moderasyon botu global olarak aktif!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Web server ${PORT} portunda çalışıyor.`);
});