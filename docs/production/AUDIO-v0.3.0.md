# 网恋离线语音制作与复用

本轮采用Circuit的MIT离线Qwen制作/独立ASR方法，按本作稳定台词生成8段Serena/谢听禾、Vivian/许弥录音；不复用其他作品的录音身份。模型固定Qwen3-TTS-12Hz-1.7B-CustomVoice的0c0e3051f131929182e2c023b9537f8b1c68adfe，权重逐项摘要、请求指纹、原WAV、响度处理WAV和运行OGG均保留。模型不进入玩家包。

生成入口scripts/generate-voice.py；独立转写scripts/check-voice-asr.py不传expected prompt或hotwords。CI只需scripts/validate-voice.py与FFmpeg，核精确正文、来源、编码、时长和ASR文件指纹；不安装推理模型。运行文件24kHz单声道OGG，响度目标-20 LUFS、true peak -2 dB。Qwen模型Apache-2.0许可随公开播放器提供。

复用来源AureliusWu/Circuit@43efd3ebc3e744b8c46b276c695de7a418f8eeba，tools/audio/generate_voice.py与check_asr.py。安装升级门禁另参考AureliusWu/Healing@5e7e08f2b031dab99f09ca317001b773e1d020f2，按NetLove独立安装器、存档和预览基线重新适配。

恢复环境中的llvmlite动态库曾在导入Qwen时SIGBUS；重新安装同版本后恢复，随后实际生成全部8句，失败启动不计入生成成功。浏览器本地使用官方headless-shell多进程运行；完整Chrome在此执行环境不支持singleton Unix socket，single-process试跑无法跨context，均未记通过。CI继续使用标准Chromium与两个工作进程。

真人试听、配音表演与创作批准仍待进行。原始CG请求缺失单列于CG-v0.3.0.json，不影响原图与成品字节追溯。
