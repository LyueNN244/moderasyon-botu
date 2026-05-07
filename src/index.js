import "dotenv/config";

import express from "express";

import {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder
} from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once("ready", () => {
  console.log(`${client.user.tag} aktif!`);
});

// SA-AS

client.on("messageCreate", async message => {

  if (message.author.bot) return;

  const msg = message.content.toLowerCase();

  if (msg === "sa") {
    return message.reply("Aleyküm selam hoş geldin ❤️");
  }

});

// PING

client.on("messageCreate", async message => {

  if (message.author.bot) return;

  if (message.content === "!ping") {

    return message.reply("Pong! 🏓");

  }

});

// CLEAR

client.on("messageCreate", async message => {

  if (message.author.bot) return;

  if (!message.content.startsWith("!clear")) return;

  if (
    !message.member.permissions.has(
      PermissionsBitField.Flags.ManageMessages
    )
  ) {

    return message.reply(
      "Bu komutu kullanamazsın."
    );

  }

  const args =
    message.content.split(" ").slice(1);

  const amount = parseInt(args[0]);

  if (!amount || amount < 1 || amount > 100) {

    return message.reply(
      "1 ile 100 arasında sayı gir."
    );

  }

  await message.channel.bulkDelete(amount, true);

  const msg = await message.channel.send(
    `${amount} mesaj silindi.`
  );

  setTimeout(() => {
    msg.delete().catch(() => {});
  }, 3000);

});

// BAN

client.on("messageCreate", async message => {

  if (message.author.bot) return;

  if (!message.content.startsWith("!ban")) return;

  if (
    !message.member.permissions.has(
      PermissionsBitField.Flags.BanMembers
    )
  ) {

    return message.reply(
      "Bu komutu kullanamazsın."
    );

  }

  const member =
    message.mentions.members.first();

  if (!member) {

    return message.reply(
      "Bir kullanıcı etiketle."
    );

  }

  const reason =
    message.content.split(" ").slice(2).join(" ")
    || "Sebep belirtilmedi.";

  await member.ban({ reason });

  const embed = new EmbedBuilder()
    .setTitle("Kullanıcı Yasaklandı")
    .setDescription(
      `${member.user.tag} sunucudan yasaklandı.`
    )
    .addFields({
      name: "Sebep",
      value: reason
    })
    .setColor("Red");

  message.channel.send({
    embeds: [embed]
  });

});

// KICK

client.on("messageCreate", async message => {

  if (message.author.bot) return;

  if (!message.content.startsWith("!kick")) return;

  if (
    !message.member.permissions.has(
      PermissionsBitField.Flags.KickMembers
    )
  ) {

    return message.reply(
      "Bu komutu kullanamazsın."
    );

  }

  const member =
    message.mentions.members.first();

  if (!member) {

    return message.reply(
      "Bir kullanıcı etiketle."
    );

  }

  const reason =
    message.content.split(" ").slice(2).join(" ")
    || "Sebep belirtilmedi.";

  await member.kick(reason);

  const embed = new EmbedBuilder()
    .setTitle("Kullanıcı Atıldı")
    .setDescription(
      `${member.user.tag} sunucudan atıldı.`
    )
    .addFields({
      name: "Sebep",
      value: reason
    })
    .setColor("Orange");

  message.channel.send({
    embeds: [embed]
  });

});

client.login(process.env.TOKEN);

// EXPRESS SERVER

const app = express();

app.get("/", (req, res) => {
  res.send("Moderasyon botu aktif!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `Web server ${PORT} portunda çalışıyor.`
  );
});