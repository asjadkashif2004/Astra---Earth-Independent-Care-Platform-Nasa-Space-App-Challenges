import { Readable } from 'node:stream';

/** Drive the real request handler without sockets; the sandbox prohibits bind. */
export function transport(app) {
  return async function call(path, { cookie = '', body, headers = {}, method = body === undefined ? 'GET' : 'POST' } = {}) {
    const req = Readable.from(body === undefined ? [] : [Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))]);
    Object.assign(req, { url: path, method, socket: { remoteAddress: 'harness' }, headers: Object.fromEntries(Object.entries({ host: 'localhost', cookie, 'content-type': 'application/json', ...headers }).map(([k,v])=>[k.toLowerCase(),v])) });
    const response = { status: 200, headers: {}, chunks: [], headersSent: false, writableLength: 0,
      writeHead(status, headers) { this.status = status; this.headers = headers; this.headersSent = true; },
      write(data) { this.chunks.push(Buffer.from(data)); }, end(data) { if (data) this.chunks.push(Buffer.from(data)); }, destroy() { this.destroyed = true; } };
    await app.handleRequest(req, response);
    return { status: response.status, headers: response.headers, text: () => Buffer.concat(response.chunks).toString(), json: () => JSON.parse(Buffer.concat(response.chunks).toString()), raw: response, request: req };
  };
}
