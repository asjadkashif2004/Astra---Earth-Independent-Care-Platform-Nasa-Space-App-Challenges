"""Reconstruct selected PDF drawing streams for a dependency-free visual audit.

This small SVG interpreter supports the supplied PDF's paths, transformations,
form XObjects and Unicode text. Font metrics and clipping are approximate; use a
full PDF renderer for pixel-accurate verification. Rasterizes with installed
librsvg/cairo, without downloading packages.
"""
import ctypes as C
from copy import deepcopy
from html import escape
from pathlib import Path
import re
import runpy

spec = runpy.run_path(str(Path(__file__).with_name('inspect-research.py')))
objects, stream, fonts, pages = (spec[k] for k in ('objects', 'stream', 'fonts', 'pages'))
root = Path(__file__).resolve().parents[1]
target = root / 'artifacts' / 'research'
target.mkdir(parents=True, exist_ok=True)
TOKEN = re.compile(rb'<[0-9A-Fa-f]*>|\[(?:[^\]]*)\]|\((?:\\.|[^\\)])*\)|/[^\s/<>()\[\]]+|[-+]?(?:\d*\.\d+|\d+)|[^\s/<>()\[\]]+')


def resources(body):
    ref = re.search(rb'/Resources\s+(\d+) 0 R', body)
    res = objects[int(ref[1])] if ref else body
    fref = re.search(rb'/Font\s+(\d+) 0 R', res)
    fr = objects[int(fref[1])] if fref else res
    return ({n: fonts.get(int(v), {}) for n, v in re.findall(rb'/([A-Za-z0-9]+)\s+(\d+) 0 R', fr)},
            {n: int(v) for n, v in re.findall(rb'/(x\d+)\s+(\d+) 0 R', res)})


def render(data, res, recursion=0):
    if recursion > 12:
        return ''
    fs, xs = res
    out, stack, args, path = [], [], [], []
    state = {'fill': '#000', 'stroke': '#000', 'width': 1, 'font': {}, 'size': 12, 'tm': [1, 0, 0, 1, 0, 0], 'tx': 0}
    depth = 0

    def text(raw):
        if raw.startswith(b'<'):
            raw = raw[1:-1]
            return ''.join(state['font'].get(int(raw[i:i+4], 16), '') for i in range(0, len(raw), 4))
        return raw[1:-1].decode('latin1', 'replace')

    for token in TOKEN.findall(data):
        if re.fullmatch(rb'[-+]?(?:\d*\.\d+|\d+)', token):
            args.append(float(token))
            continue
        if token.startswith((b'/', b'<', b'(', b'[')):
            args.append(token)
            continue
        op = token.decode('latin1')
        try:
            if op == 'q':
                stack.append((deepcopy(state), depth))
                out.append('<g>'); depth += 1
            elif op == 'Q' and stack:
                state, old_depth = stack.pop()
                out.extend(['</g>'] * (depth - old_depth)); depth = old_depth
            elif op == 'cm' and len(args) >= 6:
                out.append('<g transform="matrix(%s)">' % ' '.join(map(str, args[-6:]))); depth += 1
            elif op in ('rg', 'RG'):
                values = [max(0, min(255, int(v * 255))) for v in args[-3:]]
                state['fill' if op == 'rg' else 'stroke'] = 'rgb(%s)' % ','.join(map(str, values))
            elif op in ('g', 'G'):
                n = int(args[-1] * 255)
                state['fill' if op == 'g' else 'stroke'] = f'rgb({n},{n},{n})'
            elif op == 'w':
                state['width'] = args[-1]
            elif op == 'm': path.append('M %s %s' % tuple(args[-2:]))
            elif op == 'l': path.append('L %s %s' % tuple(args[-2:]))
            elif op == 'c': path.append('C %s %s %s %s %s %s' % tuple(args[-6:]))
            elif op == 'h': path.append('Z')
            elif op == 're':
                x, y, w, h = args[-4:]
                path.append(f'M{x} {y}h{w}v{h}h{-w}Z')
            elif op in ('f', 'f*', 'S', 's', 'B', 'B*'):
                fill = state['fill'] if op in ('f', 'f*', 'B', 'B*') else 'none'
                stroke = state['stroke'] if op in ('S', 's', 'B', 'B*') else 'none'
                out.append(f'<path d="{" ".join(path)}" fill="{fill}" stroke="{stroke}" stroke-width="{state["width"]}"/>')
                path = []
            elif op == 'n': path = []
            elif op == 'BT': state['tx'] = 0
            elif op == 'Tf': state['font'] = fs.get(args[-2][1:], {}); state['size'] = args[-1]
            elif op == 'Tm': state['tm'] = args[-6:]; state['tx'] = 0
            elif op == 'Td': state['tm'][4] += args[-2]; state['tm'][5] += args[-1]; state['tx'] = 0
            elif op in ('Tj', 'TJ'):
                chunks = [args[-1]] if op == 'Tj' else re.findall(rb'<[0-9a-fA-F]+>|\((?:\\.|[^\\)])*\)', args[-1])
                value = ''.join(text(c) for c in chunks)
                tm = ' '.join(map(str, state['tm']))
                out.append(f'<text transform="matrix({tm}) translate({state["tx"]} 0) scale(1 -1)" font-family="sans-serif" font-size="{state["size"]}" fill="{state["fill"]}">{escape(value)}</text>')
                state['tx'] += len(value) * state['size'] * .5
            elif op == 'Do' and args and args[-1][1:] in xs:
                obj = objects[xs[args[-1][1:]]]
                out.append(render(stream(obj), resources(obj), recursion + 1))
        except (IndexError, TypeError, ValueError):
            pass
        args = []
    out.extend(['</g>'] * depth)
    return ''.join(out)


cairo = C.CDLL('libcairo.so.2')
rsvg = C.CDLL('librsvg-2.so.2')
gobject = C.CDLL('libgobject-2.0.so.0')
cairo.cairo_image_surface_create.argtypes = [C.c_int, C.c_int, C.c_int]
cairo.cairo_image_surface_create.restype = C.c_void_p
cairo.cairo_create.argtypes = [C.c_void_p]; cairo.cairo_create.restype = C.c_void_p
cairo.cairo_scale.argtypes = [C.c_void_p, C.c_double, C.c_double]
cairo.cairo_surface_write_to_png.argtypes = [C.c_void_p, C.c_char_p]
cairo.cairo_destroy.argtypes = [C.c_void_p]; cairo.cairo_surface_destroy.argtypes = [C.c_void_p]
rsvg.rsvg_handle_new_from_data.argtypes = [C.c_char_p, C.c_size_t, C.c_void_p]
rsvg.rsvg_handle_new_from_data.restype = C.c_void_p
rsvg.rsvg_handle_render_cairo.argtypes = [C.c_void_p, C.c_void_p]
gobject.g_object_unref.argtypes = [C.c_void_p]

for number in (1, 6, 10, 11, 25, 26, 29):
    _, page = pages[number - 1]
    ref = int(re.search(rb'/Contents\s+(\d+) 0 R', page)[1])
    drawing = render(stream(objects[ref]), resources(page))
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="612" height="792"><rect width="612" height="792" fill="white"/><g transform="translate(0 792) scale(1 -1)">{drawing}</g></svg>'.encode()
    (target / f'page-{number}.svg').write_bytes(svg)
    handle = rsvg.rsvg_handle_new_from_data(svg, len(svg), None)
    if not handle:
        raise RuntimeError('SVG reconstruction failed')
    surface = cairo.cairo_image_surface_create(0, 1224, 1584)
    context = cairo.cairo_create(surface); cairo.cairo_scale(context, 2, 2)
    rsvg.rsvg_handle_render_cairo(handle, context)
    cairo.cairo_surface_write_to_png(surface, str(target / f'page-{number}.png').encode())
    cairo.cairo_destroy(context); cairo.cairo_surface_destroy(surface); gobject.g_object_unref(handle)
    print(f'Reconstructed page {number}: {target / f"page-{number}.png"}')
