import { BlockPermutation, BlockStates, BlockTypes } from "@minecraft/server"
import { HttpRequest, HttpRequestMethod, http } from "@minecraft/server-net"

// Map the block states
const states = BlockStates.getAll().map((state) => {
  return {
    identifier: state.id,
    values: state.validValues,
  }
})

// Map the block types
const types = BlockTypes.getAll().map((type) => {
  // Get the default permutation for the block type
  const permutation = BlockPermutation.resolve(type.id)

  return {
    identifier: type.id,
    states: Object.keys(permutation.getAllStates()),
    loggable: type.canBeWaterlogged,
  }
})

let request = new HttpRequest("http://localhost:8080");
request.setMethod(HttpRequestMethod.Post);
request.setBody(JSON.stringify({states, types}));
http.request(request);
