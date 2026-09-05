import homepage from "./web/index.html";

type ServiceStatus = "operational" | "down";

type HttpService = {
  name: string;
  type: "http";
  url: string;
  useHead?: boolean;
};

type GameService = {
  name: string;
  type: "game";
  host: string;
  port: number;
};

type Service = HttpService | GameService;

const services: Service[] = [
  { name: "Minecraft Server", host: "play.pdomkub.com", port: 19132, type: "game" },
  { name: "Advanced Management Panel", url: "http://play.pdomkub.com:8080", type: "http", useHead: true },
  { name: "Simple Management Portal", url: "http://admin.pdomkub.com", type: "http", useHead: false },
  { name: "Social", url: "http://pdomkub.com", type: "http" },
];

async function checkHttpService(service: HttpService): Promise<ServiceStatus> {
  try {
    const response = await fetch(service.url, {
      method: service.useHead ? "HEAD" : "GET",
    });
    return response.ok ? "operational" : "down";
  } catch {
    return "down";
  }
}

async function checkGameServerStatus(host: string, port: number): Promise<ServiceStatus> {
  const endpoint = `https://api.mcstatus.io/v2/status/bedrock/${encodeURIComponent(host)}:${port}`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      return "down";
    }

    const status = (await response.json()) as { online?: boolean };
    return status.online === true ? "operational" : "down";
  } catch {
    return "down";
  }
}

async function checkService(service: Service): Promise<ServiceStatus> {
  if (service.type === "game") {
    return checkGameServerStatus(service.host, service.port);
  }

  return checkHttpService(service);
}

const worker: ExportedHandler = {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response(homepage, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/favicon.png") {
      return new Response("./web/favicon.png", {
        headers: { "Content-Type": "image/png" },
      });
    }

    if (url.pathname === "/api/services") {
      const statuses = await Promise.all(
        services.map(async (service) => ({
          name: service.name,
          status: await checkService(service),
        })),
      );

      return Response.json({
        services: statuses,
        timestamp: new Date().toISOString(),
      });
    }

    return new Response("Not found", { status: 404 });
  },
};

export default worker;
