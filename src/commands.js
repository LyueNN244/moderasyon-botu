import { REST, Routes, SlashCommandBuilder } from "discord.js";
import "dotenv/config";

const commands = [

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Botun pingini gösterir."),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bir kullanıcıyı banlar.")
    .addUserOption(option =>
      option
        .setName("kullanici")
        .setDescription("Banlanacak kullanıcı")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Bir kullanıcıyı sunucudan atar.")
    .addUserOption(option =>
      option
        .setName("kullanici")
        .setDescription("Atılacak kullanıcı")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Mesaj siler.")
    .addIntegerOption(option =>
      option
        .setName("miktar")
        .setDescription("Silinecek mesaj miktarı")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Kullanıcıya timeout verir.")
    .addUserOption(option =>
      option
        .setName("kullanici")
        .setDescription("Timeout verilecek kullanıcı")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("dakika")
        .setDescription("Dakika")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Kullanıcı bilgilerini gösterir.")
    .addUserOption(option =>
      option
        .setName("kullanici")
        .setDescription("Kullanıcı")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Sunucu bilgilerini gösterir."),

  new SlashCommandBuilder()
    .setName("verify-kur")
    .setDescription("Verify panelini kurar.")

].map(command => command.toJSON());

const rest = new REST({ version: "10" })
  .setToken(process.env.TOKEN);

(async () => {

  try {

    console.log("Slash komutları yükleniyor...");

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("Slash komutları yüklendi.");

  } catch (error) {

    console.error(error);

  }

})();