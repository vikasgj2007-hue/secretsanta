import ctypes
from ctypes import wintypes, byref, c_void_p, c_uint32, c_int64, POINTER, cast

mf = ctypes.windll.mfplat
mfreadwrite = ctypes.windll.mfreadwrite
ole32 = ctypes.windll.ole32

ole32.CoInitialize(None)
mf.MFStartup(2, 1)

reader = c_void_p()
hr = mfreadwrite.MFCreateSourceReaderFromURL(ctypes.c_wchar_p('public/audio/christmas-train-music.mp3'), None, byref(reader))
print('Reader created:', hr)

rvt = cast(reader, POINTER(POINTER(c_void_p))).contents
read_sample = ctypes.WINFUNCTYPE(ctypes.c_long, c_void_p, c_uint32, c_uint32, POINTER(c_uint32), POINTER(c_uint32), POINTER(c_int64), POINTER(c_void_p))(rvt[9])

for i in range(20):
    actual_stream = c_uint32()
    stream_flags = c_uint32()
    timestamp = c_int64()
    sample = c_void_p()
    hr = read_sample(reader, 0xFFFFFFFD, 0, byref(actual_stream), byref(stream_flags), byref(timestamp), byref(sample))
    t = timestamp.value / 10000000.0
    print(f'Sample {i}: hr={hex(hr if hr>=0 else (1<<32)+hr)}, flags={hex(stream_flags.value)}, time={t:.3f}s, sample_ptr={sample.value}')
    if sample.value:
        # Release the sample
        svt = cast(sample, POINTER(POINTER(c_void_p))).contents
        release = ctypes.WINFUNCTYPE(ctypes.c_ulong, c_void_p)(svt[2])
        release(sample)
