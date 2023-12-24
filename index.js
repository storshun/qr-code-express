import "dotenv/config";
import express from "express";
import {
  verifyKey,
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
} from "discord-interactions";
import { getRandomEmoji } from "./utils.js";
import QRCode from "qrcode";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import * as fs from "fs";
import { unlink } from "fs/promises";

//CONSTANTS
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = path.join(__dirname, "public/images");

const PORT = process.env.PORT || 3000;
const CLIENT_PUBLIC_KEY = process.env.DISCORD_CLIENT_PUBLIC_KEY;
cron.schedule(" * * * */1 * *", async () => {
  await removeOldFiles(filePath);
});
//API ROUTES
app.post("/qrcode", async (req, res) => {
  let gtg = await AreWeGoodToGo(req, res);
  if (!gtg) return;
  const { type, id, data } = req.body;
  const { name } = req.body.data;
  const { value } = data.options[0];
  const { hostname } = req;
  /**
   * Handle verification requests
   */

  if (type === InteractionType.PING) {
    let response = { type: InteractionResponseType.PONG };
    return res.send(response);
  }

  if (name === "generate") {
    console.log("Post Data:\n", data.options[0].value);
    console.log(req.hostname);
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [
          {
            title: value,
            type: "image",
            description: `QR Code for ${value}`,
            image: {
              url: `${await generateQRCode(value, filePath, hostname)}`,
              height: "256",
              width: "256",
            },
          },
        ],
      },
    });
  }
});
// app.listen("/images/", (req, res) => {}); //TODO: Need to setup dyanmic route handling for the image files so they can be reached.

app.listen(PORT, () => {
  console.log("listening on ", PORT);
});

// START =============================Communication verification
export function VerifyDiscordRequest(rawBody, signature, timestamp, clientKey) {
  return verifyKey(rawBody, signature, timestamp, clientKey);
}

async function AreWeGoodToGo(req, res) {
  const { method, body } = req;
  if (method !== "POST") {
    res.status(405).send(`Method ${method} not allowed at this endpoint`);
    return;
  }

  if (!req.body.type) {
    res.status(401).send("Malformed request");
    return;
  }
  let isValidRequest = null;

  try {
    const signature = req.headers["x-signature-ed25519"];
    const timestamp = req.headers["x-signature-timestamp"];

    isValidRequest = VerifyDiscordRequest(
      JSON.stringify(req.body),
      signature,
      timestamp,
      CLIENT_PUBLIC_KEY,
    );

    if (!isValidRequest) {
      res.status(401).send("Bad request signature");
      return;
    }
    return true;
  } catch (err) {
    console.error("There was error\n", err);
  }
}
// END =============================Communication verification

async function generateQRCode(userMessage, filePath, hostname) {
  const fileName = `${crypto.randomUUID()}-qrcode.png`;
  const fqPath = path.join(filePath, fileName);
  console.log(`fqpath = ${fqPath}`);
  const imageURL = `https://${hostname}/images/${fileName}`;
  try {
    // const generatedCode = await QRCode.toString(userMessage);
    await QRCode.toFile(fqPath, userMessage);
    console.log(imageURL);
    return imageURL;
  } catch (err) {
    console.log("error generating code\n", err);
  }
}

async function removeOldFiles(dirPath) {
  fs.readdir(dirPath, async (err, files) => {
    if (err) {
      console.log("Error reading directory: ", err);
    }

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      try {
        const stats = fs.statSync(filePath);
        const fileAgeDays = (Date.now() - stats.mtime) / (1000 * 60 * 60 * 24);
        //(1000 * 60 * 60 * 24); = 1 day
        //(1000 * 30); = 30 seconds
        if (fileAgeDays > 21) {
          await unlink(filePath);
          console.log(`Deleted ${file}`);
        }
      } catch (err) {
        console.log(`An error occurred processing file ${file}:\n`, err);
      }
    }
  });
}
