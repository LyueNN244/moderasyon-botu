import { REST, Routes, SlashCommandBuilder } from "discord.js";
import "dotenv/config";

import { ChannelType } from "discord.js";

export const commands = [

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
    .setDescription("Verify panelini kurar."),

  new SlashCommandBuilder()
    .setName("kurulum")
    .setDescription("Sunucu ayarlarını yapılandırır (Sadece Yöneticiler).")
    .setDefaultMemberPermissions(8) // Administrator
    .addChannelOption(option => option.setName("create_voice_channel").setDescription("Ses kanalı oluşturma kanalı").addChannelTypes(ChannelType.GuildVoice).setRequired(false))
    .addChannelOption(option => option.setName("temp_voice_category").setDescription("Geçici ses kanallarının açılacağı kategori").addChannelTypes(ChannelType.GuildCategory).setRequired(false))
    .addChannelOption(option => option.setName("voice_control_channel").setDescription("Oda kontrol paneli kanalı").addChannelTypes(ChannelType.GuildText).setRequired(false))
    .addRoleOption(option => option.setName("unverified_role").setDescription("Doğrulanmamış (Kayıtsız) rolü").setRequired(false))
    .addRoleOption(option => option.setName("verify_role").setDescription("Doğrulanmış (Kayıtlı) rolü").setRequired(false))
    .addChannelOption(option => option.setName("member_log_channel").setDescription("Üye giriş/çıkış log kanalı").addChannelTypes(ChannelType.GuildText).setRequired(false))
    .addChannelOption(option => option.setName("message_log_channel").setDescription("Mesaj log kanalı").addChannelTypes(ChannelType.GuildText).setRequired(false))
    .addChannelOption(option => option.setName("mod_log_channel").setDescription("Moderasyon (ban, kick vb) log kanalı").addChannelTypes(ChannelType.GuildText).setRequired(false))

].map(command => command.toJSON());
