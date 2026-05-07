import {
  SlashCommandBuilder,
  PermissionFlagsBits
} from "discord.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Bot pingini gösterir."),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Kullanıcı banlar.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option =>
      option.setName("kullanici")
        .setDescription("Banlanacak kişi")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kullanıcı atar.")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(option =>
      option.setName("kullanici")
        .setDescription("Atılacak kişi")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Mesaj siler.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(option =>
      option.setName("miktar")
        .setDescription("Silinecek mesaj sayısı")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Kullanıcıya timeout verir.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option.setName("kullanici")
        .setDescription("Timeout verilecek kişi")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName("dakika")
        .setDescription("Kaç dakika?")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Kullanıcı bilgisi gösterir.")
    .addUserOption(option =>
      option.setName("kullanici")
        .setDescription("Kullanıcı seç")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Sunucu bilgisi gösterir."),

  new SlashCommandBuilder()
    .setName("ticket-kur")
    .setDescription("Ticket paneli kurar.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(command => command.toJSON());