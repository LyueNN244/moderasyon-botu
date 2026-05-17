import mongoose from "mongoose";

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  createVoiceChannelId: { type: String, default: null },
  tempVoiceCategoryId: { type: String, default: null },
  voiceControlChannelId: { type: String, default: null },
  unverifiedRoleId: { type: String, default: null },
  verifyRoleId: { type: String, default: null },
  memberLogChannelId: { type: String, default: null },
  messageLogChannelId: { type: String, default: null },
  modLogChannelId: { type: String, default: null }
});

export const GuildConfig = mongoose.model("GuildConfig", guildConfigSchema);
