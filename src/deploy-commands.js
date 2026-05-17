import "dotenv/config";

import { REST, Routes } from "discord.js";

import { commands } from "./commands.js";

const rest = new REST({ version: "10" })
  .setToken(process.env.TOKEN);

try {

  console.log("Komutlar yükleniyor...");

  await rest.put(
    Routes.applicationCommands(
      process.env.CLIENT_ID
    ),
    { body: commands }
  );

  console.log("Komutlar yüklendi.");

} catch (error) {
  console.error(error);
}