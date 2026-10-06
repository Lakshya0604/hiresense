// Fetch a job posting from a URL and turn it into plain text.
// Safety: only http(s), no private/loopback addresses (checked at connect time, so DNS tricks fail), redirect cap, timeout, size cap.
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';

export class JdFetchError extends Error {
  constructor(message, code = 'fetch_failed') { super(message); this.code = code; }
}

export function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l === '::1' || l === '::') return true;
    if (l.startsWith('::ffff:')) return isPrivateIp(l.slice(7));
    return /^(fc|fd|fe[89ab])/.test(l);
  }
  return true;
}

function safeLookup(hostname, options, cb) {
  dns.lookup(hostname, { ...options, all: true }, (err, addrs) => {
    if (err) return cb(err);
    const ok = addrs.filter((a) => !isPrivateIp(a.address));
    if (!ok.length) return cb(new JdFetchError('That address is not allowed.', 'blocked_address'));
    if (options && options.all) return cb(null, ok);
    cb(null, ok[0].address, ok[0].family);
  });
}

function getOnce(url) {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(url, {
      method: 'GET', lookup: safeLookup, timeout: 10000,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; HireSenseBot/1.0; +https://hiresense-f3p6.onrender.com)',
        accept: 'text/html,application/xhtml+xml,application/ld+json;q=0.9,*/*;q=0.5',
        'accept-language': 'en-US,en;q=0.9'
      }
    }, (res) => {
      const chunks = [];
      let size = 0;
      res.on('data', (c) => {
        size += c.length;
        if (size > 1_500_000) { req.destroy(new JdFetchError('Page is too large.', 'too_large')); return; }
        chunks.push(c);
      });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new JdFetchError('The site took too long to respond.', 'timeout')));
    req.on('error', reject);
    req.end();
  });
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '-', mdash: '-', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', bull: '-', hellip: '...' };
function decode(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(Number(n), 0x10ffff)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Math.min(parseInt(n, 16), 0x10ffff)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
}

export function htmlToText(html) {
  return decode(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header|form)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<li[^>]*>/gi, '\n- ')
      .replace(/<\/(p|div|h[1-6]|li|tr|section|article|ul|ol)>|<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/^-\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Many job boards embed the posting as schema.org JSON-LD. It is cleaner than scraping the page body.
function fromJsonLd(html) {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const data = JSON.parse(m[1].trim());
      const list = Array.isArray(data) ? data : data['@graph'] || [data];
      for (const item of list) {
        const type = [].concat(item['@type'] || []);
        if (type.includes('JobPosting') && item.description) {
          const company = item.hiringOrganization?.name ? ` at ${item.hiringOrganization.name}` : '';
          return { title: `${item.title || ''}${company}`.trim(), text: `${item.title || ''}${company}\n\n${htmlToText(String(item.description))}`.trim() };
        }
      }
    } catch { /* ignore bad JSON-LD */ }
  }
  return null;
}

const WALL = /(sign in|log in|login|join now|create an account|captcha|verify you are (a )?human|enable javascript|access denied|are you a robot|just a moment)/i;

export async function fetchJobPosting(rawUrl) {
  let url;
  try { url = new URL(String(rawUrl).trim()); } catch { throw new JdFetchError('That does not look like a valid link.', 'bad_url'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new JdFetchError('Only http and https links work.', 'bad_url');
  if (url.username || url.password) throw new JdFetchError('Links with a username or password are not allowed.', 'bad_url');
  if (net.isIP(url.hostname.replace(/^\[|\]$/g, '')) && isPrivateIp(url.hostname.replace(/^\[|\]$/g, ''))) throw new JdFetchError('That address is not allowed.', 'blocked_address');
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(url.hostname)) throw new JdFetchError('That address is not allowed.', 'blocked_address');

  let res;
  for (let hop = 0; hop < 5; hop++) {
    try {
      res = await getOnce(url);
    } catch (e) {
      if (e instanceof JdFetchError) throw e;
      if (e.code === 'ENOTFOUND') throw new JdFetchError('That site could not be found. Check the link.', 'not_found');
      throw new JdFetchError('Could not open that link.', 'fetch_failed');
    }
    if ([301, 302, 303, 307, 308].includes(res.status) && res.headers.location) {
      try { url = new URL(res.headers.location, url); } catch { throw new JdFetchError('The link redirects somewhere invalid.', 'fetch_failed'); }
      if (!['http:', 'https:'].includes(url.protocol)) throw new JdFetchError('The link redirects somewhere invalid.', 'fetch_failed');
      continue;
    }
    break;
  }
  if ([301, 302, 303, 307, 308].includes(res.status)) throw new JdFetchError('The link redirects too many times.', 'fetch_failed');
  if ([401, 403, 429, 999].includes(res.status)) throw new JdFetchError('This site blocks automatic reading (it needs a login or blocks bots).', 'blocked');
  if (res.status === 404 || res.status === 410) throw new JdFetchError('That job page was not found. It may have been taken down.', 'not_found');
  if (res.status >= 400) throw new JdFetchError(`The site returned an error (${res.status}).`, 'fetch_failed');

  const ld = fromJsonLd(res.body);
  const title = ld?.title || (res.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ? decode(res.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)[1]).trim() : '');
  const text = (ld ? ld.text : htmlToText(res.body)).slice(0, 12000);
  if (text.length < 300) {
    throw new JdFetchError('Could not find job text on that page. It probably loads with JavaScript or needs a login.', 'no_content');
  }
  if (!ld && WALL.test(text.slice(0, 400)) && text.length < 1500) {
    throw new JdFetchError('This site blocks automatic reading (it needs a login or blocks bots).', 'blocked');
  }
  return { text, title: title.slice(0, 120), host: url.hostname, source: ld ? 'structured' : 'page' };
}
