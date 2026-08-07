/**
 * Pick the caller's routable public IP, if there is one.
 *
 * Two topologies have to work from one endpoint. On a **hosted** gateway the
 * caller is a real browser somewhere on the internet and its IP is the thing
 * worth geo-locating. On the **local** gateway that ships with the desktop app
 * (and with `midnite serve`) the caller is always loopback — nothing an IP
 * geolocation service can resolve — so the answer is `null` and the caller
 * should geo-locate the gateway's own egress IP instead, which sits on the same
 * network as the user.
 *
 * `x-forwarded-for` is attacker-controllable, so it is deliberately only ever
 * used to choose *which* public IP to look up. The worst a spoofed header can
 * do is put the weather widget in the wrong city.
 */
export function publicClientIp(forwardedFor: string | undefined, remoteAddress: string | undefined): string | null {
  const chain = (forwardedFor ?? '').split(',');
  for (const hop of [...chain, remoteAddress ?? '']) {
    const ip = normalise(hop);
    if (ip && isPublic(ip)) return ip;
  }
  return null;
}

/** Strip whitespace, a `[v6]:port` wrapper, a `v4:port` suffix, and the v4-mapped-v6 prefix. */
function normalise(raw: string): string | null {
  let ip = raw.trim();
  if (!ip) return null;

  const bracketed = /^\[(.+)\](?::\d+)?$/.exec(ip);
  if (bracketed?.[1]) ip = bracketed[1];

  // A single colon means "v4 with a port" — a bare v6 address always has two or more.
  if (ip.split(':').length === 2) ip = ip.slice(0, ip.lastIndexOf(':'));

  if (ip.toLowerCase().startsWith('::ffff:') && ip.includes('.')) ip = ip.slice('::ffff:'.length);

  return ip || null;
}

function isPublic(ip: string): boolean {
  return ip.includes(':') ? isPublicV6(ip) : isPublicV4(ip);
}

function isPublicV4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  const [a, b] = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : Number.NaN));
  if (parts.some((p) => !/^\d{1,3}$/.test(p) || Number(p) > 255)) return false;
  if (a === undefined || b === undefined || Number.isNaN(a) || Number.isNaN(b)) return false;

  if (a === 0) return false; // unspecified / "this network"
  if (a === 10) return false; // private
  if (a === 127) return false; // loopback
  if (a === 169 && b === 254) return false; // link-local
  if (a === 172 && b >= 16 && b <= 31) return false; // private
  if (a === 192 && b === 168) return false; // private
  if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
  if (a >= 224) return false; // multicast + reserved
  return true;
}

function isPublicV6(ip: string): boolean {
  if (!/^[0-9a-f:]+$/i.test(ip)) return false;
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return false; // unspecified / loopback
  if (/^fe[89ab]/.test(lower)) return false; // link-local
  if (/^f[cd]/.test(lower)) return false; // unique-local
  if (lower.startsWith('ff')) return false; // multicast
  return true;
}
