import { createPlaywrightServer } from "@playwright/mcp";

async function start() {

 const server = await createPlaywrightServer({
   browser: "chromium",
   headless: true
 });

 await server.start();

 console.log("MCP Playwright Server running");
}

start();



/*
Esta clase permite que la IA controle Playwright remotamente.
*/