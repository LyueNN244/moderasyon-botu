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
  PermissionFlagsBits
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

function getChannel(id) {
  return client.channels.cache.get(id);
}

async function sendLog(channelId, embed) {
  const channel = getChannel(channelId);
  if (!channel) return;

  await channel.send({ embeds: [embed] }).catch(() => {});
}

client.once("ready", () => {
  console.log(`${client.user.tag} aktif!`);
  console.log("Oda oluşturma hedef kanal ID:", process.env.CREATE_VOICE_CHANNEL_ID);
  console.log("Oda oluşturma kategori ID:", process.env.TEMP_VOICE_CATEGORY_ID);
});

// OTOMATİK ODA OLUŞTURMA

client.on("voiceStateUpdate", async (oldState, newState) => {
  console.log("Ses olayı algılandı:", {
    eskiKanal: oldState.channelId,
    yeniKanal: newState.channelId,
    hedefKanal: process.env.CREATE_VOICE_CHANNEL_ID
  });

  try {
    const createChannelId = process.env.CREATE_VOICE_CHANNEL_ID;
    const tempCategoryId = process.env.TEMP_VOICE_CATEGORY_ID;

    if (newState.channelId === createChannelId) {
      const channel = await newState.guild.channels.create({
        name: `🔊 ${newState.member.user.username}`,
        type: ChannelType.GuildVoice,
        parent: tempCategoryId,
        permissionOverwrites: [
          {
            id: newState.guild.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.Connect
            ]
          },
          {
            id: newState.member.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.MoveMembers
            ]
          }
        ]
      });

      tempVoiceChannels.set(channel.id, newState.member.id);

      await newState.member.voice.setChannel(channel);

      console.log("Geçici oda oluşturuldu:", channel.name);
    }

    if (oldState.channelId && tempVoiceChannels.has(oldState.channelId)) {
      const oldChannel = oldState.guild.channels.cache.get(oldState.channelId);

      if (oldChannel && oldChannel.members.size === 0) {
        tempVoiceChannels.delete(oldChannel.id);
        await oldChannel.delete().catch(() => {});
        console.log("Boş geçici oda silindi:", oldChannel.name);
      }
    }
  } catch (error) {
    console.error("Oda oluşturma hatası:", error);
  }
});

// ÜYE GİRİŞ LOG

client.on("guildMemberAdd", async member => {
  const embed = new EmbedBuilder()
    .setTitle("Üye Katıldı")
    .setDescription(`${member.user} sunucuya katıldı.`)
    .addFields(
      { name: "Kullanıcı", value: member.user.tag },
      { name: "ID", value: member.id },
      {
        name: "Hesap Oluşturulma",
        value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`
      }
    )
    .setColor("Green")
    .setTimestamp();

  await sendLog(process.env.MEMBER_LOG_CHANNEL_ID, embed);
});

// ÜYE ÇIKIŞ LOG

client.on("guildMemberRemove", async member => {
  const embed = new EmbedBuilder()
    .setTitle("Üye Ayrıldı")
    .setDescription(`${member.user} sunucudan ayrıldı.`)
    .addFields(
      { name: "Kullanıcı", value: member.user.tag },
      { name: "ID", value: member.id }
    )
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
        value: message.author ? `${message.author.tag}` : "Bilinmiyor"
      },
      {
        name: "Kanal",
        value: message.channel ? `${message.channel}` : "Bilinmiyor"
      },
      {
        name: "Mesaj",
        value: message.content || "Mesaj içeriği alınamadı."
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
        value: oldMessage.author ? `${oldMessage.author.tag}` : "Bilinmiyor"
      },
      {
        name: "Kanal",
        value: oldMessage.channel ? `${oldMessage.channel}` : "Bilinmiyor"
      },
      {
        name: "Eski Mesaj",
        value: oldMessage.content || "Eski içerik alınamadı."
      },
      {
        name: "Yeni Mesaj",
        value: newMessage.content || "Yeni içerik alınamadı."
      }
    )
    .setColor("Yellow")
    .setTimestamp();

  await sendLog(process.env.MESSAGE_LOG_CHANNEL_ID, embed);
});

// SLASH KOMUTLAR VE VERIFY

client.on("interactionCreate", async interaction => {
  try {
    if (interaction.isButton()) {
      if (interaction.customId === "verify_button") {
        const roleId = process.env.VERIFY_ROLE_ID;
        const role = interaction.guild.roles.cache.get(roleId);

        if (!role) {
          return interaction.reply({
            content: "Verify rolü bulunamadı. VERIFY_ROLE_ID kontrol et.",
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
          .addFields(
            { name: "Kullanıcı", value: interaction.user.tag },
            { name: "Verilen Rol", value: `${role}` }
          )
          .setColor("Green")
          .setTimestamp();

        await sendLog(process.env.MEMBER_LOG_CHANNEL_ID, embed);

        return interaction.reply({
          content: "Başarıyla doğrulandın. Sunucuya hoş geldin!",
          ephemeral: true
        });
      }
    }

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "ping") {
      return interaction.reply("Pong!");
    }

    if (interaction.commandName === "verify-kur") {
      const embed = new EmbedBuilder()
        .setTitle("NTE Türkiye Doğrulama")
        .setDescription("Sunucuya erişmek için aşağıdaki **Doğrula** butonuna bas.")
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

    if (interaction.commandName === "ban") {
      const user = interaction.options.getUser("kullanici");
      const member = await interaction.guild.members.fetch(user.id);

      if (!member.bannable) {
        return interaction.reply({
          content: "Bu kullanıcıyı banlayamıyorum. Bot rolü yetersiz olabilir.",
          ephemeral: true
        });
      }

      await member.ban();

      const embed = new EmbedBuilder()
        .setTitle("Kullanıcı Banlandı")
        .setDescription(`${user} sunucudan banlandı.`)
        .addFields(
          { name: "Yetkili", value: `${interaction.user}` },
          { name: "Kullanıcı", value: user.tag },
          { name: "ID", value: user.id }
        )
        .setColor("Red")
        .setTimestamp();

      await sendLog(process.env.MOD_LOG_CHANNEL_ID, embed);

      return interaction.reply(`${user.tag} banlandı.`);
    }

    if (interaction.commandName === "kick") {
      const user = interaction.options.getUser("kullanici");
      const member = await interaction.guild.members.fetch(user.id);

      if (!member.kickable) {
        return interaction.reply({
          content: "Bu kullanıcıyı atamıyorum. Bot rolü yetersiz olabilir.",
          ephemeral: true
        });
      }

      await member.kick();

      const embed = new EmbedBuilder()
        .setTitle("Kullanıcı Atıldı")
        .setDescription(`${user} sunucudan atıldı.`)
        .addFields(
          { name: "Yetkili", value: `${interaction.user}` },
          { name: "Kullanıcı", value: user.tag },
          { name: "ID", value: user.id }
        )
        .setColor("Orange")
        .setTimestamp();

      await sendLog(process.env.MOD_LOG_CHANNEL_ID, embed);

      return interaction.reply(`${user.tag} atıldı.`);
    }

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
        .addFields(
          { name: "Yetkili", value: `${interaction.user}` },
          { name: "Kanal", value: `${interaction.channel}` },
          { name: "Miktar", value: `${amount}` }
        )
        .setColor("Blue")
        .setTimestamp();

      await sendLog(process.env.MOD_LOG_CHANNEL_ID, embed);

      return interaction.reply({
        content: `${amount} mesaj silindi.`,
        ephemeral: true
      });
    }

    if (interaction.commandName === "timeout") {
      const user = interaction.options.getUser("kullanici");
      const minutes = interaction.options.getInteger("dakika");
      const member = await interaction.guild.members.fetch(user.id);

      if (!member.moderatable) {
        return interaction.reply({
          content: "Bu kullanıcıya timeout veremiyorum. Bot rolü yetersiz olabilir.",
          ephemeral: true
        });
      }

      await member.timeout(minutes * 60 * 1000);

      const embed = new EmbedBuilder()
        .setTitle("Timeout Verildi")
        .setDescription(`${user} timeout aldı.`)
        .addFields(
          { name: "Yetkili", value: `${interaction.user}` },
          { name: "Kullanıcı", value: user.tag },
          { name: "Süre", value: `${minutes} dakika` }
        )
        .setColor("Purple")
        .setTimestamp();

      await sendLog(process.env.MOD_LOG_CHANNEL_ID, embed);

      return interaction.reply(`${user.tag} ${minutes} dakika timeout aldı.`);
    }

    if (interaction.commandName === "userinfo") {
      const user = interaction.options.getUser("kullanici") || interaction.user;
      const member = await interaction.guild.members.fetch(user.id);

      const embed = new EmbedBuilder()
        .setTitle(`${user.username} Bilgileri`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "ID", value: user.id },
          {
            name: "Hesap Oluşturulma",
            value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`
          },
          {
            name: "Sunucuya Katılım",
            value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
          }
        )
        .setColor("Blue");

      return interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === "serverinfo") {
      const guild = interaction.guild;

      const embed = new EmbedBuilder()
        .setTitle(`${guild.name} Bilgileri`)
        .setThumbnail(guild.iconURL())
        .addFields(
          { name: "Sunucu ID", value: guild.id },
          { name: "Üye Sayısı", value: `${guild.memberCount}` },
          {
            name: "Oluşturulma",
            value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`
          }
        )
        .setColor("Green");

      return interaction.reply({ embeds: [embed] });
    }
  } catch (error) {
    console.error("Komut hatası:", error);

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