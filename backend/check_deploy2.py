"""Hit a diagnostic endpoint to check if the deploy has the new settings."""
import urllib.request, json

# Check if django returns any info about the settings
# Try a settings check via a simple request that would reveal the behavior
url = 'https://mcd-agencia-api.onrender.com/api/v1/content/carousel/'
req = urllib.request.Request(url)
resp = urllib.request.urlopen(req, timeout=20)
data = json.loads(resp.read())

if data and len(data) > 0:
    img_url = data[0].get('image', '')
    print(f'Image URL: {img_url}')
    print()
    
    # Analyze the URL
    if '?X-Amz' in img_url:
        print('✅ PRESIGNED URL detected — new deploy is active!')
    elif 'r2.dev' in img_url:
        print('❌ Still using r2.dev — old deploy (before custom domain change)')
    elif 'r2.cloudflarestorage.com' in img_url and '?' not in img_url:
        print('⚠️ Uses S3 endpoint but NO signature')
        print('   This means AWS_S3_CUSTOM_DOMAIN="" is active (commit 2)')
        print('   But AWS_QUERYSTRING_AUTH=True is NOT active')
        print()
        print('   Possible causes:')
        print('   1. Render deploy still in progress (free tier can take 5-15 min)')
        print('   2. django-storages caching issue')
        print('   3. MEDIA_URL being used instead of storage.url()')
    else:
        print(f'Unknown URL format: {img_url[:200]}')
