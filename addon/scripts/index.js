import { BlockPermutation, BlockStates, BlockTypes, ItemTypes } from "@minecraft/server"
import { HttpRequest, HttpRequestMethod, http } from "@minecraft/server-net"

// Map the block states
const blockStates = BlockStates.getAll().map((state) => {
  return {
    identifier: state.id,
    values: state.validValues,
  }
})

// Map the block types
const blockTypes = BlockTypes.getAll().map((type) => {
  // Get the default permutation for the block type
  const permutation = BlockPermutation.resolve(type.id)

  return {
    identifier: type.id,
    loggable: type.canBeWaterlogged,
    states: Object.keys(permutation.getAllStates()),
  }
})

// Map the item types
const itemTypes = ItemTypes.getAll().map((type) => {
  return {
    identifier: type.id,
  }
})

let request = new HttpRequest("http://localhost:8080");
request.setMethod(HttpRequestMethod.Post);
request.setBody(JSON.stringify({blockStates, blockTypes, itemTypes}));
http.request(request);
