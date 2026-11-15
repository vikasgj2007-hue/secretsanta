import ctypes
import os

path = os.path.abspath('public/audio/christmas-train-music.mp3')
print('Audio path:', path)

winmm = ctypes.windll.winmm
buf = ctypes.create_unicode_buffer(512)

cmd = f'open "{path}" type mpegvideo alias myaudio'
err = winmm.mciSendStringW(cmd, buf, 512, 0)
print('Open error code:', err)

winmm.mciSendStringW('set myaudio time format milliseconds', buf, 512, 0)
winmm.mciSendStringW('status myaudio length', buf, 512, 0)
print('Length in ms:', buf.value)

winmm.mciSendStringW('close myaudio', buf, 512, 0)

