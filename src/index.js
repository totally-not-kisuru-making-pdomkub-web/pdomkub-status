export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Redirect /pdomkub → /pdomkub/ so relative asset paths resolve correctly
    if (url.pathname === "/pdomkub") {
      url.pathname = "/pdomkub/";
      return Response.redirect(url.toString(), 301);
    }

    // Only serve requests under /pdomkub/
    if (!url.pathname.startsWith("/pdomkub/")) {
      return new Response("Not Found", { status: 404 });
    }

    // Strip the /pdomkub prefix so ASSETS sees the real file path
    const stripped = url.pathname.slice("/pdomkub".length) || "/";
    const assetUrl = new URL(stripped, url.origin);
    assetUrl.search = url.search;

    return env.ASSETS.fetch(new Request(assetUrl.toString(), request));
  },
};
