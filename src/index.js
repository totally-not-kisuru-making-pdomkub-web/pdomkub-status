const BASE_PATH = "/pdomkub";

const services = [
  { name: "Minecraft Server", host: "play.pdomkub.com", port: 19132, type: "game" },
  { name: "Advanced Management Panel", url: "http://play.pdomkub.com:8080", type: "http", useHead: true },
  { name: "Simple Management Portal", url: "http://admin.pdomkub.com", type: "http", useHead: false },
  { name: "Social", url: "http://pdomkub.com", type: "http" },
];

function normalizeRequestPath(pathname) {
  if (pathname === BASE_PATH) {
    return "/";
  }

  if (pathname.startsWith(`${BASE_PATH}/`)) {
    return pathname.slice(BASE_PATH.length) || "/";
  }

  return pathname;
}

async function checkHttpService(service) {
  try {
    const response = await fetch(service.url, {
      method: service.useHead ? "HEAD" : "GET",
    });
    return response.ok ? "operational" : "down";
  } catch {
    return "down";
  }
}

async function checkGameServerStatus(host, port) {
  const endpoint = `https://api.mcstatus.io/v2/status/bedrock/${encodeURIComponent(host)}:${port}`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      return "down";
    }

    const status = await response.json();
    return status.online === true ? "operational" : "down";
  } catch {
    return "down";
  }
}

async function checkService(service) {
  if (service.type === "game") {
    return checkGameServerStatus(service.host, service.port);
  }

  return checkHttpService(service);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = normalizeRequestPath(url.pathname);

    if (url.pathname === BASE_PATH) {
      url.pathname = "/pdomkub/";
      return Response.redirect(url.toString(), 301);
    }

    if (pathname === "/api/services") {
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

    const assetUrl = new URL(pathname, url.origin);
    assetUrl.search = url.search;
    const assetResponse = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));

    if (assetResponse.status !== 404) {
      return assetResponse;
    }

    if (!pathname.startsWith("/api/")) {
      const indexUrl = new URL("/index.html", url.origin);
      return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
    }

    return new Response("Not Found", { status: 404 });
  },
};
