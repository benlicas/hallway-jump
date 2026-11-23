"""Local test server for Hallway Jump.

Run:  py serve.py        (or double-click start.bat)
Then open http://localhost:8000 on this PC, or the "phone" address it prints.

Unlike `py -m http.server`, this tells the browser never to cache, so new
art, sounds and code always show up after a normal refresh.
"""
import http.server
import socket
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    # Windows can report the wrong type for .js files, which breaks the game.
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".webmanifest": "application/manifest+json",
        ".m4a": "audio/mp4",
        ".mp4": "video/mp4",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("192.168.0.1", 80))  # no data is sent; just picks the Wi-Fi address
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return None


if __name__ == "__main__":
    ip = lan_ip()
    print(f"Hallway Jump running.  PC: http://localhost:{PORT}")
    if ip:
        print(f"                    Phone: http://{ip}:{PORT}  (same Wi-Fi)")
    print("Press Ctrl+C to stop.")
    server = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), NoCacheHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
