import "dotenv/config";
import express from "express";

import {
  Client,
  GatewayIntentBits,
  EmbedBuilder
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
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === "ping") {
      return interaction.reply("Pong!");
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