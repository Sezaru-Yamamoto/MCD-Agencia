import urllib.request, json

# Check the admin carousel endpoint (requires auth, so check if it 401s or returns data)
endpoints = [
    '/api/v1/content/carousel/',
    '/api/v1/content/landing/',
    '/api/v1/admin/content/carousel/',
]

for ep in endpoints:
    url = f'https://mcd-agencia-api.onrender.com{ep}'
    try:
        resp = urllib.request.urlopen(url, timeout=15)
        data = resp.read().decode()[:300]
        print(f'{ep}: {resp.status} -> {data}')
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:200]
        print(f'{ep}: {e.code} {e.reason} -> {body}')
    except Exception as e:
        print(f'{ep}: ERROR -> {e}')
