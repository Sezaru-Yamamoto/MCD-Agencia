"""Check if Render has deployed the presigned URL changes."""
import urllib.request, json

# Test the carousel endpoint (public, no auth required based on our check)
url = 'https://mcd-agencia-api.onrender.com/api/v1/content/carousel/'
resp = urllib.request.urlopen(url, timeout=20)
data = json.loads(resp.read())

print(f'Carousel endpoint returned {len(data)} slides')
if isinstance(data, list) and len(data) > 0:
    first = data[0]
    img = first.get('image', '')
    print(f'\nFirst slide image URL:')
    print(f'  {img}')
    
    has_presigned = 'X-Amz' in img
    print(f'\n  Has presigned params: {has_presigned}')
    print(f'  Uses r2.dev: {"r2.dev" in img}')
    print(f'  Uses cloudflarestorage: {"cloudflarestorage" in img}')
    
    # Try to access the image
    try:
        req = urllib.request.Request(img)
        req.add_header('User-Agent', 'test-script')
        r = urllib.request.urlopen(req, timeout=15)
        print(f'  Accessible: YES ({r.status}, {r.headers.get("Content-Type")})')
    except urllib.error.HTTPError as e:
        print(f'  Accessible: NO ({e.code} {e.reason})')
    except Exception as e:
        print(f'  Accessible: ERROR ({e})')
elif isinstance(data, dict) and 'results' in data:
    results = data['results']
    print(f'Paginated: {len(results)} slides')
    if results:
        img = results[0].get('image', '')
        print(f'\nFirst slide image URL:')
        print(f'  {img}')
        has_presigned = 'X-Amz' in img
        print(f'  Has presigned params: {has_presigned}')
else:
    print(f'Unexpected response format: {str(data)[:300]}')
