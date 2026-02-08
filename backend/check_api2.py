import urllib.request, json

resp = urllib.request.urlopen('https://mcd-agencia-api.onrender.com/api/v1/content/landing/')
data = json.loads(resp.read())

print('=== Landing API response keys:', list(data.keys()))

# The carousel field
slides = data.get('carousel', data.get('hero_carousel', []))
print(f'\n=== Carousel: {len(slides)} slides ===')
for i, s in enumerate(slides):
    img = s.get('image', '')
    print(f'\nSlide {i+1}: {s.get("title", "?")}')
    print(f'  image URL: {img}')
    
    # Check if presigned (has query params)
    has_signature = '?X-Amz' in img or '?AWSAccessKeyId' in img
    print(f'  presigned: {"YES" if has_signature else "NO (plain URL)"}')
    
    # Try to access the image
    if img:
        try:
            req = urllib.request.Request(img)
            req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
            r = urllib.request.urlopen(req, timeout=10)
            print(f'  accessible: YES ({r.status}, {r.headers.get("Content-Type")}, {r.headers.get("Content-Length")} bytes)')
        except urllib.error.HTTPError as e:
            print(f'  accessible: NO ({e.code} {e.reason})')
        except Exception as e:
            print(f'  accessible: ERROR ({e})')

# Also check services
print(f'\n=== Services ===')
for svc in data.get('services', []):
    imgs = svc.get('carousel_images', [])
    print(f'  {svc.get("name","?")}: {len(imgs)} carousel images')
