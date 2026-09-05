# pdomkub-status

## Cloudflare subpath deployment (`/pdomkub/`)

This app can be served from both the root path and the `/pdomkub` subpath.

- App: `https://status.kisuru.site/pdomkub` and `https://status.kisuru.site/pdomkub/`
- API: `https://status.kisuru.site/pdomkub/api/services`

For Worker routing, configure a route matching:

- `status.kisuru.site/pdomkub*`