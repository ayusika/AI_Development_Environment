import json
import subprocess
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


WEB_DIR = Path(__file__).resolve().parent
REPOSITORY_DIR = WEB_DIR.parent.parent


def run_git(*arguments):
    result = subprocess.run(
        ["git", "-C", str(REPOSITORY_DIR), *arguments],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


class KoppyWorldHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def do_GET(self):
        request_path = urlparse(self.path).path

        if request_path == "/api/git-status":
            self.send_git_status()
            return

        super().do_GET()

    def send_git_status(self):
        try:
            branch = run_git("branch", "--show-current")
            changes = run_git("status", "--short")

            payload = {
                "success": True,
                "branch": branch,
                "hasChanges": bool(changes),
                "changes": changes.splitlines() if changes else [],
            }

            status_code = 200

        except Exception as error:
            payload = {
                "success": False,
                "error": str(error),
            }

            status_code = 500

        response = json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        ).encode("utf-8")

        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)


if __name__ == "__main__":
    server = ThreadingHTTPServer(
        ("127.0.0.1", 8000),
        KoppyWorldHandler,
    )

    print("♢ᴷ Koppy World Local Bridge β")
    print("http://localhost:8000")
    print("終了：Control + C")

    server.serve_forever()