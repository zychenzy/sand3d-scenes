#!/usr/bin/env python3
"""Serve the sand3d-scenes repo so shared GLBs and vendored three.js resolve."""
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
PORT = 8791


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.glb': 'model/gltf-binary',
        '.json': 'application/json',
    }


def main():
    os.chdir(ROOT)
    httpd = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    url = 'http://127.0.0.1:%d/experiments/sprint-20261110/bakery/' % PORT
    print(url, flush=True)
    httpd.serve_forever()


if __name__ == '__main__':
    main()
