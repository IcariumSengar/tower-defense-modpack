"""Patch numeric constant-pool entries inside one class of a jar, writing a new jar.

usage: patch_class_constants.py <in.jar> <out.jar> <class path inside jar> <spec>...
  spec = D:<old>=<new>  (CONSTANT_Double)   or  I:<old>=<new>  (CONSTANT_Integer)
All specs are applied in a single pass over the ORIGINAL pool, so D:4.0=2.0 and
D:2.0=1.0 together do not chain. Every other jar entry is copied byte-for-byte.
"""
import struct, sys, zipfile

def parse_pool(b):
    """Return list of (index, tag, offset_of_payload) for every constant-pool slot."""
    magic, minor, major, count = struct.unpack('>IHHH', b[:10])
    assert magic == 0xCAFEBABE, 'not a class file'
    off = 10
    entries = []
    i = 1
    while i < count:
        tag = b[off]
        payload = off + 1
        if tag == 1:
            (ln,) = struct.unpack('>H', b[payload:payload + 2]); size = 2 + ln
        elif tag in (3, 4): size = 4
        elif tag in (5, 6): size = 8
        elif tag in (7, 8, 16, 19, 20): size = 2
        elif tag in (9, 10, 11, 12, 17, 18): size = 4
        elif tag == 15: size = 3
        else: raise ValueError('unknown constant tag %d at %d' % (tag, off))
        entries.append((i, tag, payload))
        off = payload + size
        i += 2 if tag in (5, 6) else 1
    return entries

def patch(class_bytes, specs):
    b = bytearray(class_bytes)
    hits = {s: 0 for s in specs}
    for idx, tag, payload in parse_pool(b):
        # Read the ORIGINAL value once per entry, then apply at most one spec to it,
        # so D:4.0=2.0 followed by D:2.0=1.0 can never chain on the same slot.
        if tag == 6:
            (val,) = struct.unpack('>d', b[payload:payload + 8])
        elif tag == 3:
            (val,) = struct.unpack('>i', b[payload:payload + 4])
        else:
            continue
        for spec in specs:
            kind, rest = spec.split(':', 1)
            old, new = rest.split('=')
            if kind == 'D' and tag == 6 and val == float(old):
                b[payload:payload + 8] = struct.pack('>d', float(new)); hits[spec] += 1
                print('  #%d Double %s -> %s' % (idx, old, new)); break
            if kind == 'I' and tag == 3 and val == int(old):
                b[payload:payload + 4] = struct.pack('>i', int(new)); hits[spec] += 1
                print('  #%d Integer %s -> %s' % (idx, old, new)); break
    for spec, n in hits.items():
        assert n == 1, 'expected exactly one hit for %s, got %d' % (spec, n)
    return bytes(b)

def main():
    src, dst, cls, *specs = sys.argv[1:]
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(dst, 'w') as zout:
        found = False
        for info in zin.infolist():
            data = zin.read(info.filename)
            if info.filename == cls:
                print('patching', cls)
                data = patch(data, specs)
                found = True
            zout.writestr(info, data, compress_type=info.compress_type)
        assert found, 'class not found: ' + cls
    print('wrote', dst)

if __name__ == '__main__':
    main()
