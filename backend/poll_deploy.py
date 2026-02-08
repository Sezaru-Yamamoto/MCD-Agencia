"""Poll the debug endpoint until Render deploys the new code."""
import urllib.request, json, time, sys

URL = 'https://mcd-agencia-api.onrender.com/api/v1/debug/storage/'
MAX_ATTEMPTS = 30  # 30 * 20s = 10 minutes
INTERVAL = 20

for attempt in range(1, MAX_ATTEMPTS + 1):
    try:
        resp = urllib.request.urlopen(URL, timeout=15)
        data = json.loads(resp.read())
        print(f'\n✅ Debug endpoint is LIVE! (attempt {attempt})')
        print(json.dumps(data, indent=2))
        
        # Check if presigned URLs are working
        if data.get('querystring_auth') is True:
            print('\n✅ AWS_QUERYSTRING_AUTH = True — presigned URLs are active!')
        else:
            print(f'\n❌ querystring_auth = {data.get("querystring_auth")} — NOT active')
        sys.exit(0)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f'[{attempt}/{MAX_ATTEMPTS}] Debug endpoint not found yet (404) — waiting {INTERVAL}s...')
        else:
            print(f'[{attempt}/{MAX_ATTEMPTS}] HTTP {e.code} — waiting {INTERVAL}s...')
    except Exception as e:
        print(f'[{attempt}/{MAX_ATTEMPTS}] Error: {e} — waiting {INTERVAL}s...')
    
    time.sleep(INTERVAL)

print(f'\n⏰ Timed out after {MAX_ATTEMPTS * INTERVAL}s. Deploy may still be in progress.')
