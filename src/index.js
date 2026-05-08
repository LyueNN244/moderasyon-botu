import "dotenv/config";
import express from "express";

import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

client.once("ready", () => {
  console.log(`${client.user.tag} aktif!`);
});

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