#!/usr/bin/env python3
"""Deploy directory ke Cloudflare Pages via REST API.

Usage:
    export CLOUDFLARE_API_TOKEN="cfut_..."
    export CLOUDFLARE_ACCOUNT_ID="..."
    python3 scripts/deploy_pages.py <project-name> <directory>

Reference: docs/en/11-deploy/README.md
"""
import os
import sys
import json
import urllib.request
import urllib.error
from pathlib import Path


def deploy(directory: str, project: str, branch: str = "main") -> None:
    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
    token = os.environ.get("CLOUDFLARE_API_TOKEN")

    if not account_id or not token:
        print("❌ Set CLOUDFLARE_ACCOUNT_ID dan CLOUDFLARE_API_TOKEN dulu")
        sys.exit(1)

    base = Path(directory)
    if not base.is_dir():
        print(f"❌ Directory tidak ada: {directory}")
        sys.exit(1)

    files: dict[str, str] = {}
    for path in base.rglob("*"):
        if path.is_file():
            rel = str(path.relative_to(base)).replace(os.sep, "/")
            files[rel] = str(path)

    if not files:
        print(f"❌ Tidak ada file di {directory}")
        sys.exit(1)

    print(f"📦 Deploying {len(files)} files dari {directory} ke {project}...")

    manifest_data = {
        "files": {k: {"contentType": "application/octet-stream"} for k in files.keys()}
    }
    manifest = json.dumps(manifest_data)

    boundary = "----formboundarydeploypagesxyz"
    body: list[bytes] = []
    body.append(f"--{boundary}".encode())
    body.append(b'Content-Disposition: form-data; name="manifest"')
    body.append(b"")
    body.append(manifest.encode())

    for rel, abs_path in files.items():
        body.append(f"--{boundary}".encode())
        body.append(f'Content-Disposition: form-data; name="file"; filename="{rel}"'.encode())
        body.append(b"")
        body.append(Path(abs_path).read_bytes())

    body.append(f"--{boundary}--".encode())
    body.append(b"")
    payload = b"\r\n".join(body)

    url = (
        f"https://api.cloudflare.com/client/v4/accounts/{account_id}"
        f"/pages/projects/{project}/deployments"
    )
    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        result = json.loads(e.read())
        print(f"❌ HTTP {e.code}: {result.get('errors')}")
        sys.exit(1)

    if result.get("success"):
        url_out = result["result"].get("url", "(no url)")
        print(f"✅ Deployed: https://{url_out}")
    else:
        print(f"❌ Failed: {result.get('errors')}")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: deploy_pages.py <project-name> <directory>")
        sys.exit(1)
    deploy(sys.argv[1], sys.argv[2])
