import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { copyDirRecursive } from './copy'
import { exec } from "node:child_process"
import { createServer } from "node:http"
import { generateBlockStates } from "./generate"
import type { BlockState } from "./generate"
import { hash } from "./hash"

const serverPath = resolve(process.cwd(), "server")
const dumpPath = resolve(process.cwd(), "dump")
const templatePath = resolve(__dirname, "../template")
const addonPath = resolve(__dirname, "../addon")

interface DumpRequest {
  states: { identifier: string, values: (string | number | boolean)[] }[]
  types: { identifier: string, states: string[], loggable: boolean }[]
}

// Check if server folder exists
if (!existsSync(serverPath)) {
  // Create server folder
  mkdirSync(serverPath)
}

// Check if dump folder exists
if (!existsSync(dumpPath)) {
  // Create dump folder
  mkdirSync(dumpPath)
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
  console.log("Bedrock server executable not found, please place the latest version of the bedrock server executable in the server folder!")
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
  // Declare a chunk buffer
 const chunks: Buffer[] = []

  req.on("data", (chunk: Buffer) => {
    chunks.push(chunk)
  })

  req.on("end", () => {
    // Combine the chunks
    const chunk = Buffer.concat(chunks)

    // Parse the incoming data
    const json = JSON.parse(chunk.toString()) as DumpRequest

    // Write the states to the dump folder
    writeFileSync(resolve(dumpPath, "block_states.json"), JSON.stringify(json.states, null, 2))

    // Write the types to the dump folder
    writeFileSync(resolve(dumpPath, "block_types.json"), JSON.stringify(json.types, null, 2))

    // Prepare the permutations array
    const permutations: { identifier: string, state: BlockState, loggable: boolean }[] = []

    // Iterate through each type
    for (const type of json.types) {
      // Get the values of each state
      const values = type.states.map(state => json.states.find(s => s.identifier === state)!.values)

      // Generate the block states
      const perms = generateBlockStates(type.states, values).map((permutation) => {
        return {
          identifier: type.identifier,
          hash: hash(type.identifier, permutation),
          loggable: type.loggable,
          state: permutation
        }
      })

      // Push the permutations to the array
      permutations.push(...perms)
    }

    // Write the permutations to the dump folder
    writeFileSync(resolve(dumpPath, "block_permutations.json"), JSON.stringify(permutations, null, 2))

    console.log("Dumped the states, types, and permutations to the dump folder!")

    // Close the bedrock server executable
    bedrock.kill()
    server.close()
  })
})

server.listen(8080, "localhost")
