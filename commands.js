import "dotenv/config";
import { capitalize, InstallGlobalCommands } from "./utils.js";

// Simple test command
const TEST_COMMAND = {
  name: "test",
  description: "Basic command",
  type: 1,
};

const QR_CODE_COMMAND = {
  name: "generate",
  description: "Pass a value to me and I'll make a QR code from it.",
  type: 1,
  options: [
    {
      type: 3,
      name: "qrcode",
      description: "Text to convert into a QR Code",
      required: true,
    },
  ],
};
const ALL_COMMANDS = [TEST_COMMAND, QR_CODE_COMMAND];

InstallGlobalCommands(process.env.DISCORD_APPLICATION_ID, ALL_COMMANDS);
