#!/usr/bin/env python3
"""Verify Cloudflare Pages deployment: cek domain, SSL, dan konten.

Usage:
    export CLOUDFLARE_API_TOKEN="cfut_..."
    export CLOUDFLARE_ACCOUNT_ID="..."
    python3 scripts/verify_deployment.py <project-name> [<custom-domain>]
"""
import os
import sys
import json
import urllib.request
import subprocess


def get_project_domains(account_id: str, token: str, project: str) -> list[dict]:
    url = (
        f"https://api.cloudflare.com/client/v4/accounts/{account_id}"
        f"/pages/projects/{project}/domains"
    )
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    return data.get("result", [])


def check_http(url: str) -> tuple[int, str]:
    """Return (status_code, title) atau (status, error_msg)."""
    try:
        with urllib.request.urlopen(url, timeout=15) as resp:
            body = resp.read(8192).decode("utf-8", errors="replace")
            title = ""
            if "<title>" in body:
                start = body.index("<title>") + 7
                end = body.index("</title>", start)
                title = body[start:end].strip()
            return (resp.status, title or "(no title)")
    except Exception as e:
        return (0, str(e))


def dig_dns(domain: str) -> str:
    try:
        result = subprocess.run(
            ["dig", "@1.1.1.1", domain, "+short", "+time=3"],
            capture_output=True, text=True, timeout=10
        )
        return result.stdout.strip() or "(no record)"
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return "(dig unavailable)"


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: verify_deployment.py <project-name>")
        sys.exit(1)

    project = sys.argv[1]
    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
    token = os.environ.get("CLOUDFLARE_API_TOKEN", "")

    print(f"\n🔍 Verifying project: {project}\n")

    # 1. Pages default URL
    default_url = f"https://{project}.pages.dev"
    print(f"[1] Default URL: {default_url}")
    status, title = check_http(default_url)
    if status == 200:
        print(f"    ✅ HTTP {status} | title: {title}")
    else:
        print(f"    ❌ HTTP {status} | {title}")

    # 2. Custom domains
    if account_id and token:
        print(f"\n[2] Custom domains:")
        domains = get_project_domains(account_id, token, project)
        if not domains:
            print("    (none configured)")
        for d in domains:
            name = d["name"]
            d_status = d.get("status", "unknown")
            v_status = d.get("verification_data", {}).get("status", "unknown")
            print(f"    - {name}")
            print(f"      Pages status: {d_status} | verification: {v_status}")

            dns = dig_dns(name)
            print(f"      DNS: {dns}")

            url = f"https://{name}"
            status, title = check_http(url)
            if status == 200:
                print(f"      ✅ HTTP {status} | title: {title}")
            else:
                print(f"      ❌ HTTP {status} | {title}")
    else:
        print("\n[2] Custom domains: skipped (set CF_ACCOUNT_ID + CF_TOKEN)")

    print()


if __name__ == "__main__":
    main()
