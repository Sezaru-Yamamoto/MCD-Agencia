import urllib.request, json

resp = urllib.request.urlopen('https://mcd-agencia-api.onrender.com/api/v1/content/landing/')
data = json.loads(resp.read())

# Check hero carousel
slides = data.get('hero_carousel', [])
print(f'=== Hero Carousel: {len(slides)} slides ===')
for i, s in enumerate(slides):
    img = s.get('image', 'NONE')
    mobile = s.get('mobile_image', 'NONE')
    print(f'\nSlide {i+1}:')
    print(f'  title: {s.get("title", "?")}')
    print(f'  image: {img[:150] if img else "EMPTY"}')
    print(f'  mobile: {str(mobile)[:150] if mobile else "EMPTY"}')
    # Test if the image URL is accessible
    if img and img.startswith('http'):
        try:
            req = urllib.request.Request(img[:300])
            req.add_header('User-Agent', 'Mozilla/5.0')
            r = urllib.request.urlopen(req, timeout=10)
            print(f'  accessible: YES ({r.status})')
        except Exception as e:
            print(f'  accessible: NO ({e})')

# Check services
services = data.get('services', [])
print(f'\n=== Services: {len(services)} ===')
for svc in services[:3]:
    imgs = svc.get('carousel_images', [])
    print(f'  {svc.get("name","?")}: {len(imgs)} images')
    if imgs:
        print(f'    first: {imgs[0].get("image","?")[:120]}')
