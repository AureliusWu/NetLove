"""Offline failure-path tests for the release publication state machine."""
import copy
import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('publisher', Path(__file__).with_name('publish-release.py'))
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)

COMMIT = 'a' * 40
FILES = {'Setup.exe': b'MZsetup', 'Portable.exe': b'MZportable', 'PWA.zip': b'zip', 'SHA256SUMS.txt': b'sums'}


class FakeGitHub:
    def __init__(self, *, existing=None, tag=None, upload_error=False, corrupt=False, missing=False, moved=False):
        self.existing = existing
        self.tag = tag
        self.upload_error = upload_error
        self.corrupt = corrupt
        self.missing = missing
        self.moved = moved
        self.mutations = []
        self.downloads = []
        self.release = None
        self.data = {}
        self.head_reads = 0

    def tag_commit(self, tag):
        return self.tag

    def request(self, method, path, data=None, binary=False, anonymous=False, content_type=None):
        if method != 'GET':
            self.mutations.append((method, path, data))
        if path == 'git/ref/heads/main':
            self.head_reads += 1
            return {'object': {'sha': 'b' * 40 if self.moved and self.head_reads > 1 else COMMIT}}
        if path.startswith('releases/tags/'):
            return self.existing
        if path == 'releases' and method == 'POST':
            self.release = {**data, 'id': 17, 'upload_url': 'https://uploads.example/17{?name,label}', 'assets': []}
            return copy.deepcopy(self.release)
        if path.startswith('https://uploads.example/'):
            if self.upload_error:
                raise RuntimeError('upload interrupted')
            name = publisher.urllib.parse.parse_qs(publisher.urllib.parse.urlsplit(path).query)['name'][0]
            self.data[name] = data
            if not (self.missing and name == 'PWA.zip'):
                self.release['assets'].append({'id': len(self.data), 'name': name, 'size': len(data),
                    'digest': 'sha256:' + hashlib.sha256(data).hexdigest(), 'url': 'https://api.example/' + name,
                    'browser_download_url': 'https://public.example/' + name})
            return {}
        if path == 'releases/17':
            if method == 'PATCH':
                self.release.update(data)
                self.tag = COMMIT
            return copy.deepcopy(self.release)
        if binary:
            name = path.rsplit('/', 1)[1]
            self.downloads.append((name, anonymous))
            return b'corrupt' if self.corrupt else self.data[name]
        raise AssertionError((method, path))


def run(api, version='1.0.0'):
    return publisher.publish(api, COMMIT, version, 'Title', 'Notes', FILES, {})


class PublisherTests(unittest.TestCase):
    def assert_unpublished(self, api):
        self.assertFalse(any(method == 'PATCH' for method, _, _ in api.mutations))

    def test_stable_downloads_draft_before_publication_and_public_after(self):
        api = FakeGitHub()
        result = run(api)
        self.assertEqual(result['status'], 'passed')
        self.assertFalse(result['prerelease'])
        self.assertTrue(api.mutations[0][2]['draft'])
        self.assertEqual([anon for _, anon in api.downloads], [False] * 4 + [True] * 4)
        self.assertFalse(api.release['draft'])
        self.assertEqual(api.release['make_latest'], 'true')

    def test_preview_flag_is_derived_from_version(self):
        api = FakeGitHub()
        self.assertTrue(run(api, '1.1.0-rc.1')['prerelease'])
        self.assertEqual(api.release['make_latest'], 'false')

    def test_invalid_version_never_mutates(self):
        api = FakeGitHub()
        with self.assertRaisesRegex(RuntimeError, 'Invalid release version'):
            run(api, 'not-a-version')
        self.assertEqual(api.mutations, [])

    def test_existing_public_release_is_never_changed(self):
        api = FakeGitHub(existing={'draft': False})
        with self.assertRaisesRegex(RuntimeError, 'already exists'):
            run(api)
        self.assertEqual(api.mutations, [])

    def test_existing_draft_is_not_adopted_or_replaced(self):
        api = FakeGitHub(existing={'draft': True})
        with self.assertRaisesRegex(RuntimeError, 'already exists'):
            run(api)
        self.assertEqual(api.mutations, [])

    def test_wrong_tag_never_mutates(self):
        api = FakeGitHub(tag='b' * 40)
        with self.assertRaisesRegex(RuntimeError, 'different commit'):
            run(api)
        self.assertEqual(api.mutations, [])

    def test_stale_head_never_mutates(self):
        api = FakeGitHub()
        with self.assertRaisesRegex(RuntimeError, 'main changed'):
            publisher.publish(api, 'c' * 40, '1.0.0', 'Title', 'Notes', FILES, {})
        self.assertEqual(api.mutations, [])

    def test_head_changed_after_upload_leaves_only_a_draft(self):
        api = FakeGitHub(moved=True)
        with self.assertRaisesRegex(RuntimeError, 'main changed'):
            run(api)
        self.assert_unpublished(api)
        self.assertTrue(api.release['draft'])

    def test_interrupted_upload_leaves_only_a_draft(self):
        api = FakeGitHub(upload_error=True)
        with self.assertRaisesRegex(RuntimeError, 'upload interrupted'):
            run(api)
        self.assert_unpublished(api)
        self.assertTrue(api.release['draft'])

    def test_corrupt_draft_download_leaves_only_a_draft(self):
        api = FakeGitHub(corrupt=True)
        with self.assertRaisesRegex(RuntimeError, 'mismatch'):
            run(api)
        self.assert_unpublished(api)
        self.assertTrue(api.release['draft'])

    def test_missing_draft_asset_leaves_only_a_draft(self):
        api = FakeGitHub(missing=True)
        with self.assertRaisesRegex(RuntimeError, 'asset set'):
            run(api)
        self.assert_unpublished(api)

    def test_cross_host_redirect_drops_credentials(self):
        request = publisher.urllib.request.Request('https://api.github.com/a', headers={'Authorization': 'Bearer secret'})
        redirect = publisher.SafeRedirect().redirect_request(request, None, 302, 'Found', {}, 'https://objects.example/file')
        self.assertIsNone(redirect.get_header('Authorization'))

    def test_local_assets_validate_zip_payload_and_checksums(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'release'
            pwa = Path(directory) / 'pwa'
            root.mkdir()
            pwa.mkdir()
            (pwa / 'index.html').write_bytes(b'<html>tested</html>')
            for kind in ('Setup', 'Portable'):
                (root / f'NetLove-1.0.0-x64-{kind}.exe').write_bytes(b'MZbytes')
            with zipfile.ZipFile(root / 'NetLove-PWA-1.0.0.zip', 'w') as archive:
                archive.write(pwa / 'index.html', 'index.html')
            sums = ''.join(hashlib.sha256(path.read_bytes()).hexdigest() + '  ' + path.name + '\n' for path in sorted(root.iterdir()))
            (root / 'SHA256SUMS.txt').write_text(sums)
            files, count = publisher.local_assets(root, pwa, '1.0.0')
            self.assertEqual(len(files), 4)
            self.assertEqual(count, 1)
            (pwa / 'index.html').write_bytes(b'changed')
            with self.assertRaisesRegex(RuntimeError, 'differs from tested'):
                publisher.local_assets(root, pwa, '1.0.0')


if __name__ == '__main__':
    unittest.main()
