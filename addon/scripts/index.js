import { BlockPermutation, BlockStates, BlockTypes } from "@minecraft/server"
import { HttpRequest, HttpRequestMethod, http } from "@minecraft/server-net"

// const states = []
// for (const type of BlockTypes.getAll()) {
//   states.push(type.id)
// }

const arr = []

const type = BlockTypes.getAll()[0]

const permutation = BlockPermutation.resolve(type.id)

// states.push(permutation.getAllStates())

const states = permutation.getAllStates()

// We want map every possible state and push to the array
for (const entry of Object.keys(states)) {
  const state = BlockStates.get(entry).validValues
  arr.push(state)
}

const main = []

for (const entry of arr) {
  for (const state of entry) {
    main.push(state)
  }
}

let request = new HttpRequest("http://localhost:8080");
request.setMethod(HttpRequestMethod.Post);
request.setBody(JSON.stringify(main));
http.request(request);