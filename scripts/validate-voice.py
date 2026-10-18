#!/usr/bin/env python3
"""Verify exact dialogue bindings, generation fingerprints, sources and audio decode."""
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    def read(name):
        return json.loads((ROOT / name).read_text())
    provider = read('docs/production/VOICE-PROVIDER-v0.3.0.json')
    recorded = read('docs/production/VOICE-RECORDINGS-v0.3.0.json')
    manifest = read('src/game/voice-manifest.json')
    plan = read('docs/production/VOICE-BINDINGS-v0.3.0.json')
    story = read('src/story/story.json')
    lines = {line['id']: line for scene in story['scenes'] for line in scene['lines']}
    provider_hash = digest(json.dumps(provider, sort_keys=True).encode())
    assert recorded['providerSha256'] == provider_hash
    assert len(recorded['clips']) == len(manifest['clips']) == plan['publishedClips'] == 8
    assert len({row['id'] for row in recorded['clips']}) == 8
    runtime = {row['id']: row for row in manifest['clips']}
    decoded = []
    for row in recorded['clips']:
        original = lines[row['lineId']]
        assert original['speaker'] == row['speaker'] and original['text'] == row['text']
        assert original.get('medium') != 'chat'
        request = {key: row[key] for key in ('lineId', 'text', 'speaker', 'voice', 'instruct', 'seed', 'providerSha256')}
        assert row['requestSha256'] == digest(json.dumps(request, ensure_ascii=False, sort_keys=True).encode())
        assert row['providerSha256'] == provider_hash
        for file in row['files']:
            path = ROOT / file['path']
            assert path.resolve().is_relative_to(ROOT)
            data = path.read_bytes()
            assert len(data) == file['bytes'] and digest(data) == file['sha256'], path
            process = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(path), '-f', 'null', '-'], capture_output=True, check=True)
            assert not process.stderr, path
            if path.suffix == '.ogg':
                assert runtime[row['id']] == {'id': row['id'], 'lineId': row['lineId'],
                    'speaker': row['speaker'], 'text': row['text'], 'src': str(path.relative_to(ROOT / 'public'))}
                probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
                    'format=duration:stream=sample_rate,channels', '-of', 'json', str(path)]))
                assert probe['streams'][0]['sample_rate'] == '24000' and probe['streams'][0]['channels'] == 1
                assert abs(float(probe['format']['duration']) - row['duration']) < .2
                decoded.append({'id': row['id'], 'duration': row['duration'], 'sha256': file['sha256'], 'bytes': file['bytes']})
    asr = read('docs/production/VOICE-ASR-v0.3.0.json')
    assert asr['passed'] == 8 and asr['review'] == 0
    for row in asr['clips']:
        assert row['oggSha256'] == next(clip['sha256'] for clip in decoded if clip['id'] == row['id'])
    output = {'status': 'passed', 'clips': decoded, 'decodedFiles': 24,
              'humanListening': 'pending', 'limitations': 'Decode, provenance and ASR checks do not certify voice acting.'}
    (ROOT / 'docs/production/VOICE-VALIDATION-v0.3.0.json').write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
    print('VOICE_VALIDATED: 8 recordings, 24 source/runtime decodes, exact text and ASR fingerprints')


if __name__ == '__main__':
    main()
