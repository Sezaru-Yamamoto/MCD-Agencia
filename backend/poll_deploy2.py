"""Poll for the ENHANCED debug endpoint (with actual_class and sample_url)."""
import urllib.request, json, time, sys

URL = 'https://mcd-agencia-api.onrender.com/api/v1/debug/storage/'
MAX_ATTEMPTS = 30
INTERVAL = 20

for attempt in range(1, MAX_ATTEMPTS + 1):
    try:
        resp = urllib.request.urlopen(URL, timeout=15)
        data = json.loads(resp.read())
        
        # Check if this is the ENHANCED version (has 'actual_class' field)
        if 'actual_class' in data:
            print(f'\n✅ Enhanced debug endpoint is LIVE! (attempt {attempt})')
            print(json.dumps(data, indent=2))
            
            if data.get('url_has_signature'):
                print('\n✅ PRESIGNED URLS ARE WORKING!')
            else:
                print(f'\n❌ URL has no signature. URL: {data.get("sample_url", "N/A")[:150]}')
            sys.exit(0)
        else:
            print(f'[{attempt}/{MAX_ATTEMPTS}] Old version still running — waiting {INTERVAL}s...')
    except urllib.error.HTTPError as e:
        print(f'[{attempt}/{MAX_ATTEMPTS}] HTTP {e.code} — waiting {INTERVAL}s...')
    except Exception as e:
        print(f'[{attempt}/{MAX_ATTEMPTS}] Error: {e} — waiting {INTERVAL}s...')
    
    time.sleep(INTERVAL)

print(f'\n⏰ Timed out after {MAX_ATTEMPTS * INTERVAL}s.')
