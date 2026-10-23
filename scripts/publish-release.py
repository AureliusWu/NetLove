#!/usr/bin/env python3
"""Publish only after an immutable draft has passed exact-byte download checks."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import urllib.error
import urllib.parse
import urllib.request
import zipfile


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def release_spec(version):
    require(re.fullmatch(r'\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?', version), 'Invalid release version')
    return 'v' + version, '-' in version


def local_assets(root, pwa, version):
    expected = {f'NetLove-{version}-x64-Setup.exe', f'NetLove-{version}-x64-Portable.exe',
                f'NetLove-PWA-{version}.zip', 'SHA256SUMS.txt'}
    require({p.name for p in root.iterdir()} == expected, 'Unexpected local release asset set')
    files = {name: (root / name).read_bytes() for name in expected}
    for name, data in files.items():
        require(bool(data), 'Empty asset: ' + name)
        if name.endswith('.exe'):
            require(data[:2] == b'MZ', 'Invalid Windows executable: ' + name)
    sums = {}
    for line in files['SHA256SUMS.txt'].decode('utf-8').splitlines():
        digest, name = line.split('  ', 1)
        require(name in expected - {'SHA256SUMS.txt'} and name not in sums, 'Invalid checksum entry')
        require(sha256(files[name]) == digest, 'Checksum mismatch: ' + name)
        sums[name] = digest
    require(set(sums) == expected - {'SHA256SUMS.txt'}, 'Incomplete checksum list')
    with zipfile.ZipFile(root / f'NetLove-PWA-{version}.zip') as archive:
        require(archive.testzip() is None, 'PWA ZIP CRC failed')
        entries = [info for info in archive.infolist() if not info.is_dir()]
        require(len({i.filename for i in entries}) == len(entries), 'Duplicate PWA ZIP entries')
        actual = {i.filename: archive.read(i) for i in entries}
        original = {p.relative_to(pwa).as_posix(): p.read_bytes() for p in pwa.rglob('*') if p.is_file()}
        require(bool(original) and actual == original, 'PWA ZIP differs from tested web artifact')
    return files, len(original)


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        redirect = super().redirect_request(req, fp, code, msg, headers, newurl)
        if redirect is not None and urllib.parse.urlsplit(req.full_url).netloc != urllib.parse.urlsplit(newurl).netloc:
            redirect.remove_header('Authorization')
        return redirect


class GitHub:
    def __init__(self, repo, token):
        self.base = 'https://api.github.com/repos/' + repo
        self.token = token
        self.opener = urllib.request.build_opener(SafeRedirect())

    def request(self, method, path, data=None, binary=False, anonymous=False, content_type=None):
        url = path if path.startswith('https://') else self.base + '/' + path
        headers = {'Accept': 'application/octet-stream' if binary else 'application/vnd.github+json',
                   'User-Agent': 'NetLove-verified-publisher', 'X-GitHub-Api-Version': '2022-11-28'}
        if not anonymous:
            headers['Authorization'] = 'Bearer ' + self.token
        if data is not None:
            headers['Content-Type'] = content_type or 'application/json'
            if not isinstance(data, bytes):
                data = json.dumps(data).encode('utf-8')
        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with self.opener.open(request, timeout=180) as response:
                body = response.read()
        except urllib.error.HTTPError as error:
            if method == 'GET' and error.code == 404 and not binary:
                return None
            raise
        return body if binary else json.loads(body)

    def tag_commit(self, tag):
        ref = self.request('GET', 'git/ref/tags/' + urllib.parse.quote(tag, safe=''))
        if ref is None:
            return None
        obj = ref['object']
        seen = set()
        while obj['type'] == 'tag':
            require(obj['sha'] not in seen, 'Cyclic annotated tag')
            seen.add(obj['sha'])
            obj = self.request('GET', 'git/tags/' + obj['sha'])['object']
        require(obj['type'] == 'commit', 'Tag must identify a commit')
        return obj['sha']


def guard_target(api, commit, tag, require_tag=False):
    head = api.request('GET', 'git/ref/heads/main')
    require(head['object']['sha'] == commit, 'main changed; refusing stale publication')
    target = api.tag_commit(tag)
    require(target == commit if require_tag else target in (None, commit), 'Release tag identifies a different commit')


def verify_assets(api, release, expected, public=False):
    assets = release['assets']
    require(len(assets) == len(expected) and {a['name'] for a in assets} == set(expected), 'Remote asset set differs from tested artifacts')
    records = []
    for asset in assets:
        name = asset['name']
        url = asset['browser_download_url'] if public else asset['url']
        data = api.request('GET', url, binary=True, anonymous=public)
        digest = sha256(data)
        require(len(data) == asset['size'], 'Remote asset size mismatch: ' + name)
        require(asset.get('digest') == 'sha256:' + digest, 'Remote asset digest mismatch: ' + name)
        require(data == expected[name], 'Downloaded bytes differ from tested artifact: ' + name)
        records.append({'id': asset['id'], 'name': name, 'bytes': len(data), 'sha256': digest,
                        'url': asset['browser_download_url']})
    return records


def publish(api, commit, version, title, notes, expected, record):
    tag, prerelease = release_spec(version)
    guard_target(api, commit, tag)
    existing = api.request('GET', 'releases/tags/' + tag)
    # Neither previous public releases nor abandoned drafts may be overwritten or adopted.
    require(existing is None, 'Release already exists; immutable release left untouched')
    draft = api.request('POST', 'releases', {'tag_name': tag, 'target_commitish': commit, 'name': title,
                                          'body': notes, 'draft': True, 'prerelease': prerelease})
    record.update({'releaseId': draft['id'], 'phase': 'draft-upload', 'prerelease': prerelease})
    require(draft['draft'] and draft['tag_name'] == tag, 'GitHub did not create the requested draft')
    upload_url = draft['upload_url'].split('{', 1)[0]
    for name in sorted(expected):
        api.request('POST', upload_url + '?name=' + urllib.parse.quote(name), expected[name], content_type='application/octet-stream')
    draft = api.request('GET', 'releases/' + str(draft['id']))
    require(draft['draft'] and draft['tag_name'] == tag and draft['prerelease'] == prerelease, 'Draft release identity changed')
    record['draftAssets'] = verify_assets(api, draft, expected)
    record['phase'] = 'draft-verified'
    guard_target(api, commit, tag)
    published = api.request('PATCH', 'releases/' + str(draft['id']), {'draft': False, 'prerelease': prerelease, 'make_latest': 'false' if prerelease else 'true'})
    require(not published['draft'] and published['tag_name'] == tag and published['prerelease'] == prerelease, 'Published release metadata differs')
    guard_target(api, commit, tag, require_tag=True)
    record['phase'] = 'public-readback'
    # Use anonymous public URLs after publication; draft checks used authenticated API downloads.
    published = api.request('GET', 'releases/' + str(draft['id']))
    record['assets'] = verify_assets(api, published, expected, public=True)
    record.update({'phase': 'complete', 'status': 'passed', 'allDraftBytesMatchTestedArtifacts': True,
                   'allPublicBytesMatchTestedArtifacts': True})
    return record


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--assets', type=Path, default=Path('release-assets'))
    parser.add_argument('--pwa', type=Path, default=Path('pwa'))
    parser.add_argument('--report', type=Path, default=Path('public-readback/result.json'))
    args = parser.parse_args()
    version = json.loads(Path('package.json').read_text(encoding='utf-8'))['version']
    notes = Path(f'docs/releases/v{version}.md').read_text(encoding='utf-8')
    commit = os.environ['GITHUB_SHA']
    record = {'schema': 2, 'status': 'failed', 'phase': 'preflight', 'version': version,
              'runtimeCommit': commit, 'runId': int(os.environ['GITHUB_RUN_ID'])}
    try:
        expected, count = local_assets(args.assets, args.pwa, version)
        record.update({'checksumEntries': 3, 'pwaZipCrc': True, 'pwaFiles': count, 'pwaFilesMatchTestedArtifact': True})
        publish(GitHub(os.environ['GITHUB_REPOSITORY'], os.environ['GH_TOKEN']), commit, version,
                notes.splitlines()[0].lstrip('# '), notes, expected, record)
    except Exception as error:
        record['error'] = str(error)
        raise
    finally:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(json.dumps(record, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
