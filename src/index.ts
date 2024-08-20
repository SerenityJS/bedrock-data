import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs"
import { resolve } from "node:path"

import { copyDirRecursive } from './copy'
import { exec } from "node:child_process"
import { createServer } from "node:http"
import { generateBlockStates } from "./generate"
import type { BlockState } from "./generate"
import { hash } from "./hash"
import { downloadLatestBedrockServer } from "./download-server"

const serverPath = resolve(process.cwd(), "server")
const dumpPath = resolve(process.cwd(), "dump")
const templatePath = resolve(__dirname, "../template")
const addonPath = resolve(__dirname, "../addon")

interface MojangBlocks {
  block_properties: Array<{ name: string, type: string, values: Array<{ value: (string | number | boolean) }> }>,
  data_items: Array<{ name: string, properties: Array<{ name: string }> }>
}

interface DumpRequest {
  blockStates: { identifier: string, values: (string | number | boolean)[] }[]
  blockTypes: { identifier: string, states: string[], loggable: boolean }[]
  itemTypes: { identifier: string }[]
  entityTypes: { identifier: string, components: string[] }[]
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

writeFileSync(resolve(serverPath, "test_config.json"), JSON.stringify({ "generate_documention": true }))

// Check for the bedrock server executable
if (!existsSync(resolve(serverPath, "bedrock_server.exe"))) {
  // Throw an error if the bedrock server executable is not found
  console.log("Bedrock server executable not found. Attempting to download latest bedrock server zip...");

  await downloadLatestBedrockServer(serverPath);
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
console.log("Dumping the block palette...")
const bedrock = exec(resolve(serverPath, "bedrock_server.exe"))

let blockStates = [] as { identifier: string, type: string, values: (string | number | boolean)[] }[]
let blockTypes = [] as { identifier: string, states: string[] }[]
let blockPermutations = [] as { identifier: string, hash: number, state: BlockState }[]

// Wait for the bedrock server executable to exit
bedrock.on("exit", () => {
  // Remove the test_config.json file
  rmSync(resolve(serverPath, "test_config.json"));

  // Read the generated block palette
  const paletteRaw = readFileSync(resolve(serverPath, "docs/vanilladata_modules/mojang-blocks.json"), "utf8")
  const palette = JSON.parse(paletteRaw) as MojangBlocks

  // Format the block states
  blockStates = palette.block_properties.map((property) => {
    return {
      identifier: property.name,
      type: property.type,
      values: property.values.map((entry) => entry.value)
    }
  })

  // Format the block types
  blockTypes = palette.data_items.map((type) => {
    return {
      identifier: type.name,
      states: type.properties.map((property) => property.name),
    }
  })

  // Format the block permutations
  blockPermutations = blockTypes.map((type) => {
    // Map the values of each state
    const values = type.states.map((state) => blockStates.find(s => s.identifier === state)!.values)

    // Generate the block permutations with the stateful values
    return generateBlockStates(type.states, values).map((permutation) => {
      return {
        identifier: type.identifier,
        hash: hash(type.identifier, permutation),
        state: permutation
      }
    })
  }).flatMap((permutations) => permutations)
})

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

    setTimeout(() => {
      // Merge the existing block types with the incoming block types
      blockTypes = blockTypes.map((type) => {
        const incoming = json.blockTypes.find((incoming) => incoming.identifier === type.identifier)

        if (incoming) {
          return {
            ...incoming,
            ...type,
          }
        }

        return type
      })
      
      // Write the states to the dump folder
      writeFileSync(resolve(dumpPath, "block_states.json"), JSON.stringify(blockStates, null, 2))
      
      // Write the types to the dump folder
      writeFileSync(resolve(dumpPath, "block_types.json"), JSON.stringify(blockTypes, null, 2))
      
      // Write the items to the dump folder
      writeFileSync(resolve(dumpPath, "item_types.json"), JSON.stringify(json.itemTypes, null, 2))
      
      // Write the entities to the dump folder
      writeFileSync(resolve(dumpPath, "entity_types.json"), JSON.stringify(json.entityTypes, null, 2))
      
      // Write the permutations to the dump folder
      writeFileSync(resolve(dumpPath, "block_permutations.json"), JSON.stringify(blockPermutations, null, 2))
      
      console.log("Dumped the states, types, and permutations to the dump folder!")
    }, 3000)

    // Close the bedrock server executable
    bedrock.kill()
    server.close()
  })
})

server.listen(8080, "localhost")
