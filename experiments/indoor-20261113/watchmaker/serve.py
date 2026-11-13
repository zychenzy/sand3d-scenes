#!/usr/bin/env python3
"""Serve the sand3d-scenes repo so shared GLBs and vendored three.js resolve."""
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
PORT = 8873


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.glb': 'model/gltf-binary',
        '.json': 'application/json',
    }

    def log_message(self, fmt, *args):
        if args and str(args[1]).startswith('4'):
            super().log_message(fmt, *args)


def main():
    os.chdir(ROOT)
    httpd = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    url = 'http://127.0.0.1:%d/experiments/indoor-20261113/watchmaker/' % PORT
    print(url, flush=True)
    httpd.serve_forever()


if __name__ == '__main__':
    main()
