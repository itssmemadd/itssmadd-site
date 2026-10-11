#!/usr/bin/env python3
"""Lit la date de prise de vue (EXIF DateTimeOriginal) d'un JPEG, sans dépendance.
Affiche 'YYYY-MM-DD HH:MM:SS'. Si absente, retombe sur la date de modif du fichier.
Usage: exif-date.py <fichier.jpg>"""
import sys, struct, os, datetime

def exif_original(path):
    try:
        with open(path, 'rb') as f:
            data = f.read()
    except OSError:
        return None
    if data[:2] != b'\xff\xd8':
        return None
    i = 2
    while i < len(data) - 4:
        if data[i] != 0xFF:
            break
        marker = data[i + 1]
        if marker in (0xD8, 0xD9):
            i += 2; continue
        size = struct.unpack('>H', data[i + 2:i + 4])[0]
        seg = data[i + 4:i + 2 + size]
        if marker == 0xE1 and seg[:6] == b'Exif\x00\x00':
            return _parse_tiff(seg[6:])
        i += 2 + size
    return None

def _parse_tiff(t):
    if t[:2] == b'MM': bo = '>'
    elif t[:2] == b'II': bo = '<'
    else: return None
    u16 = lambda o: struct.unpack(bo + 'H', t[o:o+2])[0]
    u32 = lambda o: struct.unpack(bo + 'I', t[o:o+4])[0]
    try:
        ifd0 = u32(4)
        # pointeur vers l'IFD Exif (tag 0x8769) dans l'IFD0
        n = u16(ifd0); exif_off = None
        for k in range(n):
            e = ifd0 + 2 + k * 12
            if u16(e) == 0x8769:
                exif_off = u32(e + 8); break
        if exif_off is None:
            return None
        # DateTimeOriginal (0x9003) dans l'IFD Exif
        n = u16(exif_off)
        for k in range(n):
            e = exif_off + 2 + k * 12
            if u16(e) == 0x9003:
                cnt = u32(e + 4); so = u32(e + 8)
                return t[so:so + cnt - 1].decode('ascii', 'ignore')
    except (struct.error, IndexError):
        return None
    return None

def main():
    path = sys.argv[1]
    d = exif_original(path)
    if d and len(d) >= 19:
        # 'YYYY:MM:DD HH:MM:SS' → 'YYYY-MM-DD HH:MM:SS'
        d = d[:10].replace(':', '-') + d[10:]
        print(d)
    else:
        ts = os.path.getmtime(path)
        print(datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S'))

if __name__ == '__main__':
    main()
