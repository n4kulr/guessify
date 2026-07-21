import { routePartykitRequest } from "partyserver";
import { Room } from "./room.js";

export { Room };

export default {
  async fetch(request, env) {
    return (
      (await routePartykitRequest(request, env)) ||
      new Response("guessify multiplayer ok", { status: 200 })
    );
  },
};
