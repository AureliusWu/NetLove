#!/usr/bin/env python3
"""Independent Chinese ASR without expected-text prompts. Flags need review."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import time
import re

ROOT = Path(__file__).resolve().parents[1]


def normalized(text, converter):
    def number(match):
        digits = dict(zip('零〇一二两三四五六七八九', [0, 0, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9]))
        value, current = 0, 0
        for char in match.group():
            if char in digits:
                current = digits[char]
            else:
                value += (current or 1) * {'十': 10, '百': 100, '千': 1000}[char]
                current = 0
        return str(value + current)
    text = re.sub(r'[零〇一二两三四五六七八九十百千]+', number, converter.convert(text))
    return ''.join(c for c in text if c.isalnum()).lower()


def cer(expected, actual):
    prior = list(range(len(actual) + 1))
    for i, a in enumerate(expected, 1):
        current = [i]
        for j, b in enumerate(actual, 1):
            current.append(min(current[-1] + 1, prior[j] + 1, prior[j-1] + (a != b)))
        prior = current
    return prior[-1] / max(1, len(expected))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model-dir', required=True)
    parser.add_argument('--only', help='Recheck changed clip IDs; preserve unchanged independent results')
    args = parser.parse_args()
    import numpy as np
    from faster_whisper import WhisperModel
    from opencc import OpenCC
    converter = OpenCC('t2s')
    model = WhisperModel(args.model_dir, device='cpu', compute_type='int8', cpu_threads=4, num_workers=1, local_files_only=True)
    manifest = json.loads((ROOT / 'docs/production/VOICE-RECORDINGS-v0.3.0.json').read_text())
    output = ROOT / 'docs/production/VOICE-ASR-v0.3.0.json'
    old = json.loads(output.read_text()) if args.only and output.exists() else {'clips': []}
    previous = {row['id']: row for row in old['clips']}
    wanted = set(args.only.split(',')) if args.only else None
    rows = []
    began = time.monotonic()
    for clip in manifest['clips']:
        file = next(f for f in clip['files'] if f['path'].endswith('.ogg'))
        if wanted and clip['id'] not in wanted:
            saved = previous.get(clip['id'])
            assert saved and saved['oggSha256'] == file['sha256'], ('Unverified unchanged clip', clip['id'])
            saved = dict(saved)
            expected, actual = normalized(clip['text'], converter), normalized(saved['transcript'], converter)
            saved['cer'] = round(cer(expected, actual), 6)
            saved['status'] = 'passed' if actual and saved['cer'] <= .2 and saved['polarityCountsMatch'] else 'review'
            rows.append(saved)
            continue
        decoded = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(ROOT / file['path']), '-ac', '1', '-ar', '16000', '-f', 'f32le', 'pipe:1'], capture_output=True, check=True).stdout
        samples = np.frombuffer(decoded, dtype='<f4').copy()
        segments, _ = model.transcribe(samples, language='zh', beam_size=5, condition_on_previous_text=False, vad_filter=False)
        transcript = ''.join(segment.text for segment in segments)
        expected, actual = normalized(clip['text'], converter), normalized(transcript, converter)
        error = cer(expected, actual)
        polarity = all(expected.count(c) == actual.count(c) for c in ('不', '没'))
        row = {'id': clip['id'], 'oggSha256': file['sha256'], 'expected': clip['text'], 'transcript': transcript, 'cer': round(error, 6),
               'polarityCountsMatch': polarity, 'status': 'passed' if actual and error <= .2 and polarity else 'review'}
        rows.append(row)
        print(row['status'].upper(), clip['id'], repr(transcript), flush=True)
    path = Path(args.model_dir) / 'model.bin'
    report = {'schemaVersion': 1, 'model': 'Systran/faster-whisper-large-v3', 'modelSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
              'computeType': 'int8', 'initialPrompt': None, 'hotwords': None, 'elapsedSeconds': round(time.monotonic() - began, 3),
              'recheckedIds': sorted(wanted) if wanted else None, 'comparisonNormalization': 'Simplified Chinese, alphanumeric, Chinese and Arabic numeral equivalence',
              'passed': sum(r['status'] == 'passed' for r in rows), 'review': sum(r['status'] == 'review' for r in rows),
              'clips': rows, 'limitations': 'ASR errors, names and acting require human listening; this is a diagnostic, not creative approval.'}
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
