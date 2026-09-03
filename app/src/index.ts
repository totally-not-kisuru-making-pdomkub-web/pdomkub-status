import { Elysia } from "elysia";
import dgram from "dgram";
import { readFileSync } from "fs";
import { join } from "path";

const homepage = readFileSync(join(import.meta.dir, "web/index.html"), "utf-8");

const services = [
  { name: "Minecraft Server", host: "play.pdomkub.com", port: 19132, type: "game" },
  { name: "Management Panel", url: "http://play.pdomkub.com:8080", type: "http", useHead: true },
  { name: "Social", url: "http://pdomkub.com", type: "http" },
];

async function checkServiceStatus(url: string, useHead: boolean = false): Promise<"operational" | "down"> {
  try {
    const response = await fetch(url, { method: useHead ? "HEAD" : "GET" });
    return response.ok ? "operational" : "down";
  } catch {
    return "down";
  }
}

async function checkGameServerStatus(host: string, port: number): Promise<"operational" | "down"> {
  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");
    let resolved = false;
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        socket.close();
        resolve("operational");
      }
    }, 2000);
    
    socket.on("error", () => {
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        socket.close();
        resolve("down");
      }
    });
    
    // Send Bedrock protocol ping packet
    const buffer = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    socket.send(buffer, port, host, (err) => {
      if (err) {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          resolve("down");
        }
        socket.close();
      }
    });
  });
}

const app = new Elysia()
  .get("/", () => new Response(homepage, { headers: { "Content-Type": "text/html; charset=utf-8" } }))
  .get("/api/services", async () => {
    const statuses = await Promise.all(
      services.map(async (service: any) => {
        let status;
        if (service.type === "game") {
          status = await checkGameServerStatus(service.host, service.port);
        } else {
          status = await checkServiceStatus(service.url, service.useHead);
        }
        return { name: service.name, status };
      })
    );
    return { services: statuses, timestamp: new Date().toISOString() };
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
