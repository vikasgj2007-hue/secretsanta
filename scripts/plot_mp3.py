import ctypes
from ctypes import wintypes, byref, c_void_p, c_uint32, c_int64, POINTER, cast, string_at
import struct, math

mf = ctypes.windll.mfplat
mfreadwrite = ctypes.windll.mfreadwrite
ole32 = ctypes.windll.ole32

ole32.CoInitialize(None)
mf.MFStartup(2, 1)

reader = c_void_p()
mfreadwrite.MFCreateSourceReaderFromURL(ctypes.c_wchar_p('public/audio/christmas-train-music.mp3'), None, byref(reader))
rvt = cast(reader, POINTER(POINTER(c_void_p))).contents
read_sample = ctypes.WINFUNCTYPE(ctypes.c_long, c_void_p, c_uint32, c_uint32, POINTER(c_uint32), POINTER(c_uint32), POINTER(c_int64), POINTER(c_void_p))(rvt[9])

samples_data = []

while True:
    actual_stream = c_uint32()
    stream_flags = c_uint32()
    timestamp = c_int64()
    sample = c_void_p()
    hr = read_sample(reader, 0xFFFFFFFD, 0, byref(actual_stream), byref(stream_flags), byref(timestamp), byref(sample))
    if hr != 0 or not sample.value:
        break
    
    t = timestamp.value / 10000000.0
    if t > 25.0:
        break

    svt = cast(sample, POINTER(POINTER(c_void_p))).contents
    get_buf = ctypes.WINFUNCTYPE(ctypes.c_long, c_void_p, c_uint32, POINTER(c_void_p))(svt[40])
    buf = c_void_p()
    get_buf(sample, 0, byref(buf))

    bvt = cast(buf, POINTER(POINTER(c_void_p))).contents
    lock = ctypes.WINFUNCTYPE(ctypes.c_long, c_void_p, POINTER(c_void_p), POINTER(c_uint32), POINTER(c_uint32))(bvt[3])
    unlock = ctypes.WINFUNCTYPE(ctypes.c_long, c_void_p)(bvt[4])
    ptr = c_void_p()
    max_len = c_uint32()
    cur_len = c_uint32()
    lock(buf, byref(ptr), byref(max_len), byref(cur_len))

    raw_bytes = string_at(ptr.value, cur_len.value)
    unlock(buf)

    # Release buf and sample
    ctypes.WINFUNCTYPE(ctypes.c_ulong, c_void_p)(cast(buf, POINTER(POINTER(c_void_p))).contents[2])(buf)
    ctypes.WINFUNCTYPE(ctypes.c_ulong, c_void_p)(svt[2])(sample)

    # Check 16-bit PCM samples
    # Unpack int16
    count = len(raw_bytes) // 2
    if count > 0:
        shorts = struct.unpack(f'<{count}h', raw_bytes[:count*2])
        rms = math.sqrt(sum(s*s for s in shorts) / count)
        peak = max(abs(s) for s in shorts)
        samples_data.append((t, rms, peak))

print('Time(s) | RMS     | Peak   | Visual')
print('------------------------------------')
for t, rms, peak in samples_data:
    if int(t * 10) % 5 == 0: # Print every ~0.5s
        bar = '#' * int(rms / 400)
        print(f'{t:6.2f}s | {rms:7.1f} | {peak:6d} | {bar}')
