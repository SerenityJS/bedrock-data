import { BlockPermutation, BlockStates, BlockTypes } from "@minecraft/server"
import { HttpRequest, HttpRequestMethod, http } from "@minecraft/server-net"

// const states = []
// for (const type of BlockTypes.getAll()) {
//   states.push(type.id)
// }

const type = BlockTypes.getAll()[0]

const permutation = BlockPermutation.resolve(type.id)

// states.push(permutation.getAllStates())

const states = BlockStates.get("direction").validValues

let request = new HttpRequest("http://localhost:8080");
request.setMethod(HttpRequestMethod.Post);
request.setBody(JSON.stringify(states));
http.request(request);