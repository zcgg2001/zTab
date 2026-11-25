"""Import the reference site's public bookmark data and self-host its visible assets.

Run with paths to public-data.json and reference-extras.json. Sources are recorded
in docs/asset-sources.json; no production-site account or private data is used.
"""
import concurrent.futures
import hashlib
from html.parser import HTMLParser
import json
import re
from pathlib import Path
import sys
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://nav.peptide.ink'
data = json.loads(Path(sys.argv[1]).read_text())['data']
extras = json.loads(Path(sys.argv[2]).read_text())
urls = set()
assets = ROOT / 'public/assets/reference'
assets.mkdir(parents=True, exist_ok=True)
(ROOT / 'src/data').mkdir(parents=True, exist_ok=True)
(ROOT / 'docs').mkdir(exist_ok=True)

theme = {
    'wallpaper': data['config']['theme']['backgroundImage'],
    'logo': data['site']['logo'],
    'hotBackground': '/dist/assets/background.DlWCSK8X.1794375913563.jpg',
    'todoBackground': '/dist/assets/back.WmHaX0Dd.1794375913563.png',
    'aiIcon': '/dist/assets/icon_icon.RMSWVQie.1794375913563.png',
    'trash': '/dist/assets/lajitong.64cMgGjf.1794375913563.png',
    'wood': '/dist/assets/muyu.DkBLMjKG.1794375913563.png',
    'searchIcon': '/images/2024/09/08/asLafXpxroMGhOybxwOllyvLUPjVCbSS.png',
}
for item in data['link'] + data['tabbar']:
    if item.get('src'):
        urls.add(item['src'])
for key, value in theme.items():
    urls.add(value)
for a in extras['assets']:
    if a['src'] and not a['src'].startswith('data:') and not 'chrome-extension:' in a['src']:
        urls.add(a['src'])

def download(url):
    if url.startswith('data:'):
        return url, url
    full = urllib.parse.urljoin(BASE, url)
    extension = Path(urllib.parse.urlparse(full).path).suffix.lower()
    if extension not in ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico']:
        extension = '.png'
    filename = hashlib.sha256(full.encode()).hexdigest()[:16] + extension
    target = assets / filename
    try:
        if not target.exists():
            request = urllib.request.Request(full, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(request, timeout=25) as response:
                body = response.read()
                if not response.headers.get('Content-Type', '').startswith('image/'):
                    raise ValueError('Response is not an image')
                target.write_bytes(body)
        return url, '/assets/reference/' + filename
    except Exception as error:
        return url, None

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    mapping = dict(pool.map(download, sorted(urls)))

def clean(item):
    keys = ['id','name','type','size','src','url','sort','pageGroup','pid','component','name_en','tips','bgColor','text']
    result = {key: item[key] for key in keys if key in item}
    if result.get('src'):
        result['src'] = mapping.get(result['src']) or '/favicon.svg'
    return result

for key in theme:
    theme[key] = mapping[theme[key]]
navigation = {'links': [clean(x) for x in data['link']], 'dock': [clean(x) for x in data['tabbar']]}

# Optional rendered-DOM and Dock snapshots override icons updated by mTab after
# loading its public defaults. This preserves the visual appearance actually seen.
class RenderedIcons(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.sources = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'div':
            self.ids.append(attrs.get('data-id'))
        if tag == 'img':
            item_id = next((x for x in reversed(self.ids) if x), None)
            if item_id and attrs.get('src'):
                self.sources[item_id] = (attrs['src'], attrs.get('style', ''))

    def handle_endtag(self, tag):
        if tag == 'div' and self.ids:
            self.ids.pop()

rendered = RenderedIcons()
if len(sys.argv) > 3:
    snapshot = json.loads(Path(sys.argv[3]).read_text())
    for group in snapshot['links']:
        for item in group['items']:
            rendered.feed(item['html'])
if len(sys.argv) > 4:
    snapshot = json.loads(Path(sys.argv[4]).read_text())
    for item in snapshot['dock']:
        rendered.feed(item['html'])
for item in navigation['links'] + navigation['dock']:
    if item['type'] == 'icon' and item['id'] in rendered.sources:
        source, style = rendered.sources[item['id']]
        if mapping.get(source):
            item['src'] = mapping[source]
        background = re.search(r'background:\s*([^;]+)', style)
        if background:
            item['bgColor'] = background.group(1)

(ROOT/'src/data/navigation.json').write_text(json.dumps(navigation, ensure_ascii=False, indent=2))
(ROOT/'src/data/theme.json').write_text(json.dumps(theme, ensure_ascii=False, indent=2))
(ROOT/'src/data/weather.json').write_text(json.dumps(extras['weather'], ensure_ascii=False, indent=2))
(ROOT/'docs/asset-sources.json').write_text(json.dumps({urllib.parse.urljoin(BASE,k):v for k,v in mapping.items() if not k.startswith('data:')}, ensure_ascii=False, indent=2))
print(json.dumps({'bookmarks':len(navigation['links']), 'assets':len(mapping), 'failed':[x for x,y in mapping.items() if y is None]}, ensure_ascii=False))
