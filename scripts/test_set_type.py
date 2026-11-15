import ctypes
from ctypes import wintypes, byref, c_void_p, c_uint32, c_int64, POINTER, Structure, cast

mf = ctypes.windll.mfplat
mfreadwrite = ctypes.windll.mfreadwrite
ole32 = ctypes.windll.ole32

ole32.CoInitialize(None)
mf.MFStartup(2, 1)

# Attributes for SourceReader: MF_SOURCE_READER_ENABLE_VIDEO_PROCESSING
# To decode MP3 to PCM:
reader = c_void_p()
hr = mfreadwrite.MFCreateSourceReaderFromURL(ctypes.c_wchar_p('public/audio/christmas-train-music.mp3'), None, byref(reader))

class GUID(Structure):
    _fields_ = [('Data1', wintypes.DWORD), ('Data2', wintypes.WORD), ('Data3', wintypes.WORD), ('Data4', wintypes.BYTE * 8)]

MFMediaType_Audio = GUID(0x73647561, 0x0000, 0x0010, (wintypes.BYTE * 8)(0x80, 0x00, 0x00, 0xAA, 0x00, 0x38, 0x9B, 0x71))
MFAudioFormat_PCM = GUID(0x00000001, 0x0000, 0x0010, (wintypes.BYTE * 8)(0x80, 0x00, 0x00, 0xAA, 0x00, 0x38, 0x9B, 0x71))
MF_MT_MAJOR_TYPE = GUID(0x48eba18e, 0xf827, 0x49ed, (wintypes.BYTE * 8)(0xaf, 0x12, 0xed, 0x20, 0xdc, 0x57, 0x9e, 0x93))
MF_MT_SUBTYPE = GUID(0xf7e34c9a, 0x42e8, 0x4714, (wintypes.BYTE * 8)(0x87, 0x03, 0xa6, 0x1a, 0x00, 0xaa, 0x9f, 0x39))

mediaType = c_void_p()
mf.MFCreateMediaType(byref(mediaType))

vt = cast(mediaType, POINTER(POINTER(c_void_p))).contents
set_guid = ctypes.WINFUNCTYPE(ctypes.c_long, c_void_p, POINTER(GUID), POINTER(GUID))(vt[20])
set_guid(mediaType, byref(MF_MT_MAJOR_TYPE), byref(MFMediaType_Audio))
set_guid(mediaType, byref(MF_MT_SUBTYPE), byref(MFAudioFormat_PCM))

rvt = cast(reader, POINTER(POINTER(c_void_p))).contents
set_cur_media = ctypes.WINFUNCTYPE(ctypes.c_long, c_void_p, c_uint32, POINTER(c_uint32), c_void_p)(rvt[7])
hr = set_cur_media(reader, 0xFFFFFFFD, None, mediaType)
print('SetCurrentMediaType(7):', hex(hr if hr >= 0 else (1 << 32) + hr))
