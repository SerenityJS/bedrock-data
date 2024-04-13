import { type ExecOptions, exec as cpExec } from "child_process";
import { rm } from "fs/promises";
import { writeFile } from "fs/promises";
import { resolve } from "path";

const BDS_SITE_LINK = "https://www.minecraft.net/en-us/download/server/bedrock";
const BDS_LINK_REGEX =
  /<a href="(.+)" aria-label="Download Minecraft Dedicated Server software for Windows"/;

async function unzipFile(
  zipPath: string,
  file: string,
  destination: string
): Promise<void> {
  const exec = (cmd: string, options: ExecOptions) =>
    new Promise<void>((res, rej) =>
      cpExec(cmd, options, (err) => (err ? rej(err) : res()))
    );

  return exec(
    `${
      process.platform === "linux" ? "unzip -o" : "tar -xf"
    } ${zipPath} ${file}`,
    { cwd: destination }
  );
}

async function downloadLatestBedrockServer(serverPath: string): Promise<void> {
  const downloadLink = await fetch(BDS_SITE_LINK)
    .then((res) => res.text())
    .then((html) => html.match(BDS_LINK_REGEX)![1]);

  const bdsZip = await fetch(downloadLink).then((res) => res.arrayBuffer());
  const bdsZipPath = resolve(serverPath, "bedrock_server.zip");

  // Extract the .exe from the zip file
  await writeFile(bdsZipPath, Buffer.from(bdsZip));

  await unzipFile(bdsZipPath, "", serverPath);

  // Delete the zip after we've downloaded it
  await rm(bdsZipPath);
}

export { downloadLatestBedrockServer };
