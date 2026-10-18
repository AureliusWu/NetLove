#!/usr/bin/env python3
"""Authoring-only offline Qwen recordings; adapted from Circuit's MIT recipe.

Model weights never enter the game. Resume requires identical requests and bytes.
"""
import argparse
import hashlib
import importlib.metadata
import json
from pathlib import Path
import re
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
REVISION = '0c0e3051f131929182e2c023b9537f8b1c68adfe'
IDS = ['c2-call-004', 'c2-call-006', 'c2-call-009', 'c5-tinghe-005',
       'c5-tinghe-016', 'c5-xumi-002', 'c5-xumi-013', 'c5-xumi-019']


def digest(data):
    return hashlib.sha256(data).hexdigest()


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model-dir', type=Path, required=True)
    parser.add_argument('--only', nargs='*')
    args = parser.parse_args()
    plan = json.loads((ROOT / 'docs/production/VOICE-BINDINGS-v0.3.0.json').read_text())
    model = args.model_dir.resolve()
    provider = {'model': 'Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice', 'revision': REVISION,
                'license': 'Apache-2.0', 'language': 'Chinese', 'device': 'cpu',
                'dtype': 'bfloat16', 'attention': 'eager', 'threads': 8,
                'maxNewTokens': 512, 'wrapper': 'qwen-tts-' + importlib.metadata.version('qwen-tts'),
                'torch': importlib.metadata.version('torch'),
                'processing': 'ebu_r128_minus20_lufs_truepeak_minus2_db_24k_pcm16_v1',
                'snapshotFiles': [{'path': p.relative_to(model).as_posix(), 'bytes': p.stat().st_size,
                                   'sha256': hashlib.file_digest(p.open('rb'), 'sha256').hexdigest()}
                                  for p in sorted(model.rglob('*')) if p.is_file()
                                  and '.cache' not in p.parts and p.suffix in ('.json', '.txt', '.safetensors')]}
    provider_hash = digest(json.dumps(provider, sort_keys=True).encode())
    save(ROOT / 'docs/production/VOICE-PROVIDER-v0.3.0.json', provider)
    manifest_path = ROOT / 'src/game/voice-manifest.json'
    records_path = ROOT / 'docs/production/VOICE-RECORDINGS-v0.3.0.json'
    old = json.loads(records_path.read_text()) if records_path.exists() else {'clips': []}
    records = {row['id']: row for row in old['clips']}
    import numpy as np
    import soundfile as sf
    import torch
    from qwen_tts import Qwen3TTSModel
    torch.set_num_threads(provider['threads'])
    torch.set_num_interop_threads(1)
    engine = None
    for index, row in enumerate(plan['clips']):
        if row['lineId'] not in (args.only or IDS):
            continue
        voice = 'Serena' if row['speaker'] == '谢听禾' else 'Vivian'
        instruction = ('年轻成年女性，普通话，自然轻声说话，声音温和清楚，克制，不朗诵。'
                       if voice == 'Serena' else '年轻成年女性，普通话，语气自然爽朗，轻微打趣，清晰不过分夸张。')
        request = {'lineId': row['lineId'], 'text': row['text'], 'speaker': row['speaker'],
                   'voice': voice, 'instruct': instruction, 'seed': 300030 + index,
                   'providerSha256': provider_hash}
        fingerprint = digest(json.dumps(request, ensure_ascii=False, sort_keys=True).encode())
        previous = records.get(row['lineId'])
        if previous and previous['requestSha256'] == fingerprint and all(
                (ROOT / f['path']).exists() and digest((ROOT / f['path']).read_bytes()) == f['sha256']
                for f in previous['files']):
            print('CACHE', row['lineId'], flush=True)
            continue
        if engine is None:
            engine = Qwen3TTSModel.from_pretrained(str(model), device_map='cpu', dtype=torch.bfloat16,
                                                  attn_implementation='eager', low_cpu_mem_usage=True)
        started = time.monotonic()
        torch.manual_seed(request['seed'])
        np.random.seed(request['seed'])
        with torch.inference_mode():
            waves, rate = engine.generate_custom_voice(text=row['text'], language='Chinese', speaker=voice,
                                                       instruct=instruction, max_new_tokens=512)
        samples = np.asarray(waves[0], dtype=np.float32).reshape(-1)
        duration = len(samples) / rate
        assert rate == 24000 and len(waves) == 1 and np.isfinite(samples).all()
        assert .35 <= duration <= max(8, len(row['text']) * .8), (row['lineId'], duration)
        raw = ROOT / 'assets_source/voice/v0.3.0' / (row['lineId'] + '-raw.wav')
        master = raw.with_name(row['lineId'] + '.wav')
        output = ROOT / 'public/voice' / (row['lineId'] + '.ogg')
        for p in (raw, master, output):
            p.parent.mkdir(parents=True, exist_ok=True)
        sf.write(raw, samples, rate, subtype='PCM_16')
        base = ['ffmpeg', '-nostdin', '-v', 'info', '-y', '-i', str(raw)]
        analysis = subprocess.run(base + ['-af', 'loudnorm=I=-20:TP=-2:LRA=6:print_format=json',
                                          '-f', 'null', '-'], capture_output=True, text=True, check=True)
        measured = json.loads(re.search(r'\{\s*"input_i".*?\}', analysis.stderr, re.S).group())
        assert all(measured[k] not in ('-inf', 'inf', 'nan') for k in ('input_i', 'input_tp', 'input_lra', 'input_thresh'))
        filt = ('loudnorm=I=-20:TP=-2:LRA=6:linear=true:'
                f"measured_I={measured['input_i']}:measured_TP={measured['input_tp']}:"
                f"measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}:offset={measured['target_offset']}")
        subprocess.run(base + ['-af', filt, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', str(master)], capture_output=True, check=True)
        subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', str(master), '-c:a', 'libvorbis', '-q:a', '5', str(output)], check=True)
        records[row['lineId']] = {'id': row['lineId'], **request, 'requestSha256': fingerprint,
            'duration': round(duration, 4), 'generationSeconds': round(time.monotonic() - started, 3),
            'loudnessInput': measured, 'files': [{'path': p.relative_to(ROOT).as_posix(), 'bytes': p.stat().st_size,
                                               'sha256': digest(p.read_bytes())} for p in (raw, master, output)]}
        save(records_path, {'schema': 1, 'game': 'netlove', 'providerSha256': provider_hash,
                            'clips': list(records.values()), 'humanListening': 'pending'})
        save(manifest_path, {'schema': 1, 'game': 'netlove', 'clips': [
            {'id': r['id'], 'lineId': r['lineId'], 'speaker': r['speaker'], 'text': r['text'],
             'src': 'voice/' + r['id'] + '.ogg'} for r in records.values()]})
        print('GENERATED', row['lineId'], duration, 'seconds;', round(time.monotonic() - started, 1), 'CPU seconds', flush=True)


if __name__ == '__main__':
    main()
