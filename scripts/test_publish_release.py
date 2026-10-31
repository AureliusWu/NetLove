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
    def __init__(self, *, existing=None, tag=None, upload_error=False, corrupt=False, missing=False, moved=False,
                 moved_tag=False, tampered=False, bad_digest=False, moved_target=False):
        self.existing = existing
        self.tag = tag
        self.upload_error = upload_error
        self.corrupt = corrupt
        self.missing = missing
        self.moved = moved
        self.moved_tag = moved_tag
        self.tampered = tampered
        self.bad_digest = bad_digest
        self.moved_target = moved_target
        self.mutations = []
        self.downloads = []
        self.release = None
        self.data = {}
        self.head_reads = 0

    def tag_commit(self, tag):
        if self.moved_tag and self.head_reads > 1:
            return 'b' * 40
        return self.tag

    def request(self, method, path, data=None, binary=False, anonymous=False, content_type=None):
        if method != 'GET':
            self.mutations.append((method, path, data))
        if path == 'git/ref/heads/main':
            self.head_reads += 1
            return {'object': {'sha': 'b' * 40 if self.moved and self.head_reads > 1 else COMMIT}}
        if path.startswith('releases/tags/'):
            return self.existing if self.existing is None or not self.existing.get('draft') else None
        if path.startswith('releases?'):
            return [{**self.existing, 'tag_name': 'v1.0.0'}] if self.existing else []
        if path == 'releases' and method == 'POST':
            self.release = {**data, 'id': 17, 'upload_url': 'https://uploads.example/17{?name,label}', 'assets': []}
            return copy.deepcopy(self.release)
        if path.startswith('https://uploads.example/'):
            if self.upload_error:
                raise RuntimeError('upload interrupted')
            name = publisher.urllib.parse.parse_qs(publisher.urllib.parse.urlsplit(path).query)['name'][0]
            self.data[name] = data
            uploaded = bytes([data[0] ^ 1]) + data[1:] if self.tampered else data
            if not (self.missing and name == 'PWA.zip'):
                self.release['assets'].append({'id': len(self.data), 'name': name, 'size': len(data),
                    'digest': 'sha256:' + ('0' * 64 if self.bad_digest else hashlib.sha256(uploaded).hexdigest()), 'url': 'https://api.example/' + name,
                    'browser_download_url': 'https://public.example/' + name})
            return {}
        if path == 'releases/17':
            if self.moved_target:
                self.release['target_commitish'] = 'main'
            if method == 'PATCH':
                self.release.update(data)
                self.tag = COMMIT
            return copy.deepcopy(self.release)
        if binary:
            name = path.rsplit('/', 1)[1]
            self.downloads.append((name, anonymous))
            if self.tampered:
                return bytes([self.data[name][0] ^ 1]) + self.data[name][1:]
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

    def test_existing_draft_on_later_list_page_is_not_overwritten(self):
        class Paginated(FakeGitHub):
            def request(self, method, path, **kwargs):
                if path == 'releases?per_page=100&page=1':
                    return [{'tag_name': 'unrelated-' + str(i)} for i in range(100)]
                if path == 'releases?per_page=100&page=2':
                    return [{'tag_name': 'v1.0.0', 'draft': True}]
                return super().request(method, path, **kwargs)
        api = Paginated()
        with self.assertRaisesRegex(RuntimeError, 'already exists'):
            run(api)
        self.assertEqual(api.mutations, [])

    def test_wrong_tag_never_mutates(self):
        api = FakeGitHub(tag='b' * 40)
        with self.assertRaisesRegex(RuntimeError, 'different commit'):
            run(api)
        self.assertEqual(api.mutations, [])

    def test_published_version_on_older_commit_is_validation_only(self):
        api = FakeGitHub(existing={'draft': False, 'tag_name': 'v1.0.0'}, tag='b' * 40)
        plan = publisher.publication_plan(api, COMMIT, '1.0.0')
        self.assertEqual(plan, {'publish': False, 'reason': 'already-published',
                                'tag': 'v1.0.0', 'releaseCommit': 'b' * 40})
        self.assertEqual(api.mutations, [])

    def test_new_version_is_planned_without_mutation(self):
        for target in (None, COMMIT):
            api = FakeGitHub(tag=target)
            self.assertTrue(publisher.publication_plan(api, COMMIT, '1.0.0')['publish'])
            self.assertEqual(api.mutations, [])

    def test_unpublished_mismatched_tag_still_blocks(self):
        api = FakeGitHub(tag='b' * 40)
        with self.assertRaisesRegex(RuntimeError, 'different commit'):
            publisher.publication_plan(api, COMMIT, '1.0.0')
        self.assertEqual(api.mutations, [])

    def test_existing_draft_still_blocks_publication_planning(self):
        api = FakeGitHub(existing={'draft': True, 'tag_name': 'v1.0.0'})
        with self.assertRaisesRegex(RuntimeError, 'draft requires separate recovery'):
            publisher.publication_plan(api, COMMIT, '1.0.0')
        self.assertEqual(api.mutations, [])

    def test_missing_published_tag_is_not_silently_skipped(self):
        api = FakeGitHub(existing={'draft': False, 'tag_name': 'v1.0.0'})
        with self.assertRaisesRegex(RuntimeError, 'no matching tag'):
            publisher.publication_plan(api, COMMIT, '1.0.0')
        self.assertEqual(api.mutations, [])

    def test_superseded_commit_does_not_plan_a_release(self):
        api = FakeGitHub()
        plan = publisher.publication_plan(api, 'c' * 40, '1.0.0')
        self.assertEqual(plan['reason'], 'superseded')
        self.assertFalse(plan['publish'])
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

    def test_tag_changed_after_upload_leaves_only_a_draft(self):
        api = FakeGitHub(moved_tag=True)
        with self.assertRaisesRegex(RuntimeError, 'different commit'):
            run(api)
        self.assert_unpublished(api)

    def test_draft_target_changed_after_upload_leaves_only_a_draft(self):
        api = FakeGitHub(moved_target=True)
        with self.assertRaisesRegex(RuntimeError, 'identity changed'):
            run(api)
        self.assert_unpublished(api)

    def test_remote_digest_mismatch_leaves_only_a_draft(self):
        api = FakeGitHub(bad_digest=True)
        with self.assertRaisesRegex(RuntimeError, 'digest mismatch'):
            run(api)
        self.assert_unpublished(api)

    def test_same_size_rehashed_tampering_still_fails_byte_comparison(self):
        api = FakeGitHub(tampered=True)
        with self.assertRaisesRegex(RuntimeError, 'bytes differ'):
            run(api)
        self.assert_unpublished(api)

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
