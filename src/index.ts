// import { createServer } from "node:http"

// const server = createServer((req, res) => {
//   req.on("data", (chunk) => {
//     console.log(chunk.toString())
//   })
// })

// server.listen(8080, "localhost")

import { readdirSync, existsSync, mkdirSync, copyFileSync, writeFileSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { copyDirRecursive } from './copy'
import { exec, spawnSync } from "node:child_process"
import { createServer } from "node:http"

const serverPath = resolve(process.cwd(), "server")
const templatePath = resolve(__dirname, "../template")
const addonPath = resolve(__dirname, "../addon")

// Check if server folder exists
if (!existsSync(serverPath)) {
  // Create server folder
  mkdirSync(serverPath)
}

// Check if the worlds folder exists in the server folder
if (!existsSync(resolve(serverPath, "worlds"))) {
  // Create worlds folder
  mkdirSync(resolve(serverPath, "worlds"))
}

// Check if the palette-dumper folder exists in the world folder
if (!existsSync(resolve(serverPath, "worlds/palette-dumper"))) {
  // Create palette-dumper folder
  mkdirSync(resolve(serverPath, "worlds/palette-dumper"))
}

// Copy the contents of the template folder to the palette-dumper folder
copyDirRecursive(templatePath, resolve(serverPath, "worlds/palette-dumper"))

// Check if the development behavior pack folder exists in the server folder
if (!existsSync(resolve(serverPath, "development_behavior_packs"))) {
  // Create development behavior pack folder
  mkdirSync(resolve(serverPath, "development_behavior_packs"))
}

// Check if the palette-dumper folder exists in the development behavior pack folder
if (!existsSync(resolve(serverPath, "development_behavior_packs/palette-dumper"))) {
  // Create palette-dumper folder
  mkdirSync(resolve(serverPath, "development_behavior_packs/palette-dumper"))
}

// Copy the contents of the addon folder to the development behavior pack folder
copyDirRecursive(addonPath, resolve(serverPath, "development_behavior_packs/palette-dumper"))

// Check for the bedrock server executable
if (!existsSync(resolve(serverPath, "bedrock_server.exe"))) {
  // Throw an error if the bedrock server executable is not found
  throw new Error("Bedrock server executable not found, please place the latest version of the bedrock server executable in the server folder!")
}

// Check for the server.properties file
// If it exists, we will update the level-name property to the palette-dumper folder
if (existsSync(resolve(serverPath, "server.properties"))) {
  // Read the server.properties file
  let properties = readFileSync(resolve(serverPath, "server.properties"), "utf-8")

  // Update the level-name property to the palette-dumper
  properties = properties.replace(/level-name=(.*)/g, "level-name=palette-dumper")

  // Write the updated server.properties file
  writeFileSync(resolve(serverPath, "server.properties"), properties)
}

// Update the configuration of the bedrock server executable
const config = readFileSync(resolve(serverPath, "config/default/permissions.json"), "utf-8")
const json = JSON.parse(config) as { allowed_modules: string[] }
if (!json.allowed_modules.includes("@minecraft/server-net")) json.allowed_modules.push("@minecraft/server-net")
writeFileSync(resolve(serverPath, "config/default/permissions.json"), JSON.stringify(json, null, 2))

// Start the bedrock server executable
console.log("Starting the bedrock server executable...")
const bedrock = exec(resolve(serverPath, "bedrock_server.exe"))

// Start the http server
console.log("Starting the http server...")
const server = createServer((req) => {
  req.on("data", (chunk) => {
    console.log(chunk.toString())

    // Kill the bedrock server and close the http server
    server.close()
    bedrock.kill()
  })
})

server.listen(8080, "localhost")