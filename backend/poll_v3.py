"""Poll for v3 debug endpoint (has 'real_class' field)."""
import urllib.request, json, time, sys

URL = 'https://mcd-agencia-api.onrender.com/api/v1/debug/storage/'
MAX_ATTEMPTS = 30
INTERVAL = 20

for attempt in range(1, MAX_ATTEMPTS + 1):
    try:
        resp = urllib.request.urlopen(URL, timeout=15)
        data = json.loads(resp.read())
        
        if 'real_class' in data:
            print(f'\n✅ v3 debug endpoint is LIVE! (attempt {attempt})')
            print(json.dumps(data, indent=2))
            sys.exit(0)
        else:
            print(f'[{attempt}/{MAX_ATTEMPTS}] Old version — waiting {INTERVAL}s...')
    except Exception as e:
        print(f'[{attempt}/{MAX_ATTEMPTS}] {e} — waiting {INTERVAL}s...')
    
    time.sleep(INTERVAL)
