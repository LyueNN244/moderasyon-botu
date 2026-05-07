import "dotenv/config";

import {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} from "discord.js";

import { Player } from "discord-player";

import {
  DefaultExtractors
} from "@discord-player/extractor";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const player = new Player(client);

client.once("ready", async () => {

  await player.extractors.loadMulti(
    DefaultExtractors
  );

  console.log("Müzik sistemi yüklendi.");
  console.log(`${client.user.tag} aktif!`);

});

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand()) return;

  try {

    // PING

    if (interaction.commandName === "ping") {

      return interaction.reply("Pong!");

    }

    // BAN

    if (interaction.commandName === "ban") {

      const user =
        interaction.options.getUser("kullanici");

      const member =
        await interaction.guild.members.fetch(user.id);

      await member.ban();

      return interaction.reply(
        `${user.tag} banlandı.`
      );

    }

    // KICK

    if (interaction.commandName === "kick") {

      const user =
        interaction.options.getUser("kullanici");

      const member =
        await interaction.guild.members.fetch(user.id);

      await member.kick();

      return interaction.reply(
        `${user.tag} atıldı.`
      );

    }

    // CLEAR

    if (interaction.commandName === "clear") {

      const amount =
        interaction.options.getInteger("miktar");

      if (amount < 1 || amount > 100) {

        return interaction.reply({
          content: "1 ile 100 arasında sayı gir.",
          ephemeral: true
        });

      }

      await interaction.channel.bulkDelete(
        amount,
        true
      );

      return interaction.reply({
        content: `${amount} mesaj silindi.`,
        ephemeral: true
      });

    }

    // TIMEOUT

    if (interaction.commandName === "timeout") {

      const user =
        interaction.options.getUser("kullanici");

      const minutes =
        interaction.options.getInteger("dakika");

      const member =
        await interaction.guild.members.fetch(user.id);

      await member.timeout(
        minutes * 60 * 1000
      );

      return interaction.reply(
        `${user.tag} ${minutes} dakika timeout aldı.`
      );

    }

    // USERINFO

    if (interaction.commandName === "userinfo") {

      const user =
        interaction.options.getUser("kullanici")
        || interaction.user;

      const member =
        await interaction.guild.members.fetch(user.id);

      const embed = new EmbedBuilder()
        .setTitle(`${user.username} Bilgileri`)
        .setThumbnail(
          user.displayAvatarURL()
        )
        .addFields(
          {
            name: "ID",
            value: user.id
          },
          {
            name: "Katılım",
            value:
              `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
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
        .setThumbnail(
          guild.iconURL()
        )
        .addFields(
          {
            name: "Üye Sayısı",
            value: `${guild.memberCount}`
          },
          {
            name: "Sunucu ID",
            value: guild.id
          }
        )
        .setColor("Green");

      return interaction.reply({
        embeds: [embed]
      });

    }

    // PLAY

    if (interaction.commandName === "play") {

      const query =
        interaction.options.getString("sarki");

      const channel =
        interaction.member.voice.channel;

      if (!channel) {

        return interaction.reply({
          content: "Önce ses kanalına gir.",
          ephemeral: true
        });

      }

      await interaction.deferReply({
        ephemeral: false
      });

      const result =
        await player.search(query, {
          requestedBy: interaction.user
        });

      if (!result.hasTracks()) {

        return interaction.editReply(
          "Şarkı bulunamadı."
        );

      }

      const queue =
        player.nodes.create(
          interaction.guild,
          {
            metadata: interaction.channel
          }
        );

      if (!queue.connection) {

        await queue.connect(channel);

      }

      queue.addTrack(result.tracks[0]);

      if (!queue.isPlaying()) {

        await queue.node.play();

      }

      return interaction.editReply(
        `Çalınıyor: ${result.tracks[0].title}`
      );

    }

    // SKIP

    if (interaction.commandName === "skip") {

      const queue =
        player.nodes.get(interaction.guild);

      if (
        !queue ||
        !queue.isPlaying()
      ) {

        return interaction.reply({
          content:
            "Şu anda müzik çalmıyor.",
          ephemeral: true
        });

      }

      queue.node.skip();

      return interaction.reply(
        "Şarkı geçildi."
      );

    }

    // STOP

    if (interaction.commandName === "stop") {

      const queue =
        player.nodes.get(interaction.guild);

      if (!queue) {

        return interaction.reply({
          content:
            "Aktif kuyruk yok.",
          ephemeral: true
        });

      }

      queue.delete();

      return interaction.reply(
        "Müzik durduruldu."
      );

    }

    // QUEUE

    if (interaction.commandName === "queue") {

      const queue =
        player.nodes.get(interaction.guild);

      if (
        !queue ||
        !queue.tracks.size
      ) {

        return interaction.reply({
          content: "Kuyruk boş.",
          ephemeral: true
        });

      }

      const tracks = queue.tracks
        .toArray()
        .slice(0, 10)
        .map(
          (track, index) =>
            `${index + 1}. ${track.title}`
        )
        .join("\n");

      return interaction.reply(
        `Kuyruk:\n${tracks}`
      );

    }

  } catch (error) {

    console.error(error);

    if (
      interaction.deferred ||
      interaction.replied
    ) {

      return interaction.editReply(
        "Bir hata oluştu."
      );

    }

    return interaction.reply({
      content: "Bir hata oluştu.",
      ephemeral: true
    });

  }

});

client.login(process.env.TOKEN);