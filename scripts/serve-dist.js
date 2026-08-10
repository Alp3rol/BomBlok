import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { URL } from 'node:url';

const port = Number(process.env.PORT || 4173);
const root = normalize(join(process.cwd(), 'dist'));
const mime = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml'
};

createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = normalize(join(root, pathname === '/' ? 'index.html' : pathname));
    if (!file.startsWith(root) || !existsSync(file)) {
        response.writeHead(404).end('Not found');
        return;
    }
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
    response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    response.setHeader('Cache-Control', 'no-store');
    createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => {
    console.log(`BomBlok preview: http://127.0.0.1:${port}`);
});
