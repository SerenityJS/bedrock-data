import { BlockPermutation, BlockStates, BlockTypes, ItemTypes, EntityTypes, world, system, BlockComponentTypes, ItemStack } from "@minecraft/server"
import { HttpRequest, HttpRequestMethod, http } from "@minecraft/server-net"

// These states are invalid when it comes to the protocol side.
// These states is left attached to the block type will cause ghost blocks.
const blockedStates = [
  "color",
  "stone_type",
  "wood_type",
  "old_log_type",
  "old_leaf_type",
  "dirt_type",
  "stripped_bit",
  "stone_brick_type",
]

const blockedStatesPerBlock = [
  {
    identifier: "minecraft:chest",
    states: [ "facing_direction" ]
  },
  {
    identifier: "minecraft:furnace",
    states: [ "facing_direction" ]
  },
  {
    identifier: "minecraft:lit_furnace",
    states: [ "facing_direction" ]
  },
  {
    identifier: "minecraft:smoker",
    states: [ "facing_direction" ]
  },
  {
    identifier: "minecraft:lit_smoker",
    states: [ "facing_direction" ]
  },
  {
    identifier: "minecraft:blast_furnace",
    states: [ "facing_direction" ]
  },
  {
    identifier: "minecraft:lit_blast_furnace",
    states: [ "facing_direction" ]
  },
  {
    identifier: "anvil",
    states: [ "direction" ]
  },
  {
    identifier: "minecraft:observer",
    states: [ "facing_direction" ]
  },
  {
    identifier: "minecraft:calibrated_sculk_sensor",
    states: [ "direction" ]
  },
  {
    identifier: "minecraft:dirt",
    states: []
  },
  {
    identifier: "minecraft:coarse_dirt",
    states: []
  }
]

world.afterEvents.worldLoad.subscribe(() => {
  // Add the ticking area
  world.getDimension("overworld").runCommand("tickingarea add circle 0 -60 0 4 dump")

  system.runTimeout(() => {
    // Map the block states and filter out the blocked states
    let blockStates = BlockStates.getAll().map((state) => {
      return {
        identifier: state.id,
        values: state.validValues,
      }
    }).filter((state) => !blockedStates.includes(state.identifier))
    
    // Map the block types
    const blockTypes = BlockTypes.getAll().map((type) => {
      // Get the default permutation for the block type
      const permutation = BlockPermutation.resolve(type.id)
    
      let air = false
      let liquid = false
      let solid = false
      let tags = []

      // Organize the block type by alphabetical order, and remove the blocked states
      let states = Object.keys(permutation.getAllStates()).sort().filter((state) => {
        return !blockedStates.includes(state)
      })

      // Filter out the blocked states blocked for the specific block type
      states = states.filter((state) => {
        const blockedState = blockedStatesPerBlock.find((x) => x.identifier === type.id)
        if (blockedState) {
          return !blockedState.states.includes(state)
        }

        return true
      })
    
      // Prepare the block type components
      const components = []

      try {
        const block = world.getDimension("overworld").getBlock({ x: 0, y: -60, z: 0 })
        block.setType(type)

        air = block.isAir
        liquid = block.isLiquid
        solid = block.isSolid
        tags = block.getTags()

        for (const component of Object.values(BlockComponentTypes)) {
          try {
            if (block.getComponent(component)) {
              components.push(component)
            }
          } catch {}
        }
      } catch {}

      return {
        identifier: type.id,
        components,
        tags,
        loggable: type.canBeWaterlogged,
        air,
        liquid,
        solid,
      }
    })
    
    // Map the item types
    const itemTypes = ItemTypes.getAll().map((type) => {
      // Create a stack of the item type
      const stack = new ItemStack(type, 1)

      // Get the components of the item type
      const components = stack.getComponents().map((x) => x.typeId)

      return {
        identifier: type.id,
        tags: stack.getTags(),
        stackable: stack.isStackable,
        maxAmount: stack.maxAmount,
      }
    })
    
    const entityTypes = EntityTypes.getAll().map((type) => {
      try {
        const entity = world.getDimension("overworld").spawnEntity(type.id, { x: 0, y: -60, z: 0 })
        const components = entity.getComponents().map((x) => {
          return x.typeId
        })
    
        entity.remove()
    
        return {
          identifier: type.id,
          components,
        }
      } catch {
        return {
          identifier: type.id,
          components: [],
        }
      }
    })
    
    const request = new HttpRequest("http://localhost:8080");
    request.setMethod(HttpRequestMethod.Post);
    request.setBody(JSON.stringify({blockStates, blockTypes, itemTypes, entityTypes}));
    http.request(request);
  }, 20)
})
