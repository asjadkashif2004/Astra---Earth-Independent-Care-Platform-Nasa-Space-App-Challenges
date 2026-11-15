"""Compile/render the exact application GLSL with a locally available ANGLE runtime.

Optional QA only: Python stdlib + ASTRA_ANGLE_DIR/libEGL.so/libGLESv2.so and its
SwiftShader Vulkan runtime. It does not replace browser/layout/FPS verification.
"""
import ctypes as C
import json
import os
from pathlib import Path
import struct
import subprocess
import zlib

root = Path(__file__).resolve().parents[1]
cached = next(Path.home().glob('.cache/dotslash/*/*/React Native DevTools-linux-x64'), Path('/nonexistent'))
runtime = Path(os.environ.get('ASTRA_ANGLE_DIR', str(cached)))
if not (runtime / 'libEGL.so').exists():
    raise SystemExit('Optional shader QA needs ASTRA_ANGLE_DIR pointing to an existing ANGLE/SwiftShader runtime.')
os.environ['VK_ICD_FILENAMES'] = str(runtime / 'vk_swiftshader_icd.json')
os.environ['XDG_CACHE_HOME'] = '/tmp/astra-gl-cache'
egl = C.CDLL(str(runtime / 'libEGL.so'))
gl = C.CDLL(str(runtime / 'libGLESv2.so'))
P, I, U, F = C.c_void_p, C.c_int, C.c_uint, C.c_float


def bind(lib, name, result, *args):
    fn = getattr(lib, name); fn.restype = result; fn.argtypes = list(args); return fn


get_proc = bind(egl, 'eglGetProcAddress', P, C.c_char_p)
get_display = C.CFUNCTYPE(P, U, P, C.POINTER(I))(get_proc(b'eglGetPlatformDisplayEXT'))
attrs = (I * 7)(0x3203, 0x3450, 0x3209, 0x3487, 0x348F, 0x34A5, 0x3038)
display = get_display(0x3202, None, attrs)
initialize = bind(egl, 'eglInitialize', U, P, C.POINTER(I), C.POINTER(I))
major, minor = I(), I()
if not initialize(display, C.byref(major), C.byref(minor)):
    error = bind(egl, 'eglGetError', I)()
    raise SystemExit(f'Optional software graphics context unavailable: EGL {error:#x}')
choose = bind(egl, 'eglChooseConfig', U, P, C.POINTER(I), C.POINTER(P), I, C.POINTER(I))
config_attrs = (I * 13)(0x3033, 1, 0x3040, 0x40, 0x3024, 8, 0x3023, 8, 0x3022, 8, 0x3021, 8, 0x3038)
config, count = P(), I()
assert choose(display, config_attrs, C.byref(config), 1, C.byref(count)) and count.value
bind(egl, 'eglBindAPI', U, U)(0x30A0)
context = bind(egl, 'eglCreateContext', P, P, P, P, C.POINTER(I))(display, config, None, (I * 3)(0x3098, 3, 0x3038))
surface = bind(egl, 'eglCreatePbufferSurface', P, P, P, C.POINTER(I))(display, config, (I * 5)(0x3057, 800, 0x3056, 800, 0x3038))
assert bind(egl, 'eglMakeCurrent', U, P, P, P, P)(display, surface, surface, context)
get_string = bind(gl, 'glGetString', C.c_char_p, U)
print('Shader QA renderer:', get_string(0x1F01).decode())

shaders = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', "import {SHADERS} from './apps/mission-control-web/scenes.mjs'; console.log(JSON.stringify(SHADERS))"], cwd=root))
create_shader = bind(gl, 'glCreateShader', U, U)
shader_source = bind(gl, 'glShaderSource', None, U, I, C.POINTER(C.c_char_p), C.POINTER(I))
compile_shader = bind(gl, 'glCompileShader', None, U)
shader_iv = bind(gl, 'glGetShaderiv', None, U, U, C.POINTER(I))
shader_log = bind(gl, 'glGetShaderInfoLog', None, U, I, C.POINTER(I), C.c_char_p)


def compile(kind, text):
    shader = create_shader(kind); raw = C.c_char_p(text.encode()); shader_source(shader, 1, C.byref(raw), None); compile_shader(shader)
    ok = I(); shader_iv(shader, 0x8B81, C.byref(ok))
    if not ok.value:
        log = C.create_string_buffer(8192); shader_log(shader, 8192, None, log); raise RuntimeError(log.value.decode())
    return shader


create_program = bind(gl, 'glCreateProgram', U)
attach = bind(gl, 'glAttachShader', None, U, U)
link = bind(gl, 'glLinkProgram', None, U)
program_iv = bind(gl, 'glGetProgramiv', None, U, U, C.POINTER(I))
use = bind(gl, 'glUseProgram', None, U)
gen_buffers = bind(gl, 'glGenBuffers', None, I, C.POINTER(U))
bind_buffer = bind(gl, 'glBindBuffer', None, U, U)
buffer_data = bind(gl, 'glBufferData', None, U, C.c_ssize_t, P, U)
attrib = bind(gl, 'glGetAttribLocation', I, U, C.c_char_p)
enable = bind(gl, 'glEnableVertexAttribArray', None, U)
pointer = bind(gl, 'glVertexAttribPointer', None, U, I, U, U, I, P)
uniform = bind(gl, 'glGetUniformLocation', I, U, C.c_char_p)
float_uniform = bind(gl, 'glUniform1f', None, I, F)
viewport = bind(gl, 'glViewport', None, I, I, I, I)
draw = bind(gl, 'glDrawArrays', None, U, I, I)
read_pixels = bind(gl, 'glReadPixels', None, I, I, I, I, U, U, P)
finish = bind(gl, 'glFinish', None)
error = bind(gl, 'glGetError', U)


def png(path, width, height, data):
    def chunk(kind, payload):
        return struct.pack('!I', len(payload)) + kind + payload + struct.pack('!I', zlib.crc32(kind + payload))
    rows = b''.join(b'\0' + data[y*width*4:(y+1)*width*4] for y in range(height-1, -1, -1))
    header = struct.pack('!2I5B', width, height, 8, 6, 0, 0, 0)
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) + chunk(b'IDAT', zlib.compress(rows)) + chunk(b'IEND', b''))


output = Path(os.environ.get('ASTRA_SHADER_OUTPUT', str(root / 'artifacts' / 'n04' / 'shader-qa'))); output.mkdir(parents=True, exist_ok=True)




for name, width, height in [('earth', 800, 360), ('twin', 480, 700)]:
    program = create_program(); attach(program, compile(0x8B31, shaders['vertex'])); attach(program, compile(0x8B30, shaders[name])); link(program)
    ok = I(); program_iv(program, 0x8B82, C.byref(ok)); assert ok.value, 'Shader link failed'
    use(program); vertex_buffer = U(); gen_buffers(1, C.byref(vertex_buffer)); bind_buffer(0x8892, vertex_buffer)
    vertices = (F * 12)(-1,-1,1,-1,-1,1,-1,1,1,-1,1,1); buffer_data(0x8892,C.sizeof(vertices),vertices,0x88E4)
    pos = attrib(program,b'position'); enable(pos); pointer(pos,2,0x1406,0,0,None)
    bind(gl,'glUniform2f',None,I,F,F)(uniform(program,b'resolution'),width,height)
    for key,value in {'elapsed':5.1,'rotation':-.12,'heartRate':72,'breathingRate':14,'warning':0,'blackout':0,'layer':0,'zoom':1,'planetRadius':.7,'quality':0,'linkAvailable':0}.items():
        float_uniform(uniform(program,key.encode()),value)
    texture = U(); bind(gl,'glGenTextures',None,I,C.POINTER(U))(1,C.byref(texture)); bind(gl,'glBindTexture',None,U,U)(0x0DE1,texture)
    # One-pixel debug input checks shader execution only. Geographic/cloud asset
    # rendering is verified in actual Chromium, not inferred from this smoke.
    pixel = (C.c_ubyte * 4)(80,110,130,255)
    tw, th = (1, 1)
    bind(gl,'glTexImage2D',None,U,I,I,I,I,I,U,U,P)(0x0DE1,0,0x1908,tw,th,0,0x1908,0x1401,pixel)
    bind(gl,'glTexParameteri',None,U,U,I)(0x0DE1,0x2801,0x2601)
    viewport(0,0,width,height); draw(0x0004,0,6); finish()
    pixels = (C.c_ubyte * (width*height*4))(); read_pixels(0,0,width,height,0x1908,0x1401,pixels)
    assert error() == 0, 'GL error after render'
    png(output / f'{name}.png',width,height,bytes(pixels))
    print(f'{name}: GLSL compiled, linked and rendered to {output / f"{name}.png"}')
    if name == 'twin':
        baseline = bytes(pixels)
        float_uniform(uniform(program,b'heartRate'),100)
        draw(0x0004,0,6); finish(); read_pixels(0,0,width,height,0x1908,0x1401,pixels)
        assert bytes(pixels) != baseline, 'Heart rate must change the rendered pulse.'
        float_uniform(uniform(program,b'heartRate'),72)
        float_uniform(uniform(program,b'breathingRate'),21)
        draw(0x0004,0,6); finish(); read_pixels(0,0,width,height,0x1908,0x1401,pixels)
        assert bytes(pixels) != baseline, 'Respiratory rate must change respiratory motion.'
        float_uniform(uniform(program,b'breathingRate'),14)
        float_uniform(uniform(program,b'warning'),1)
        draw(0x0004,0,6); finish(); read_pixels(0,0,width,height,0x1908,0x1401,pixels)
        assert bytes(pixels) != baseline, 'Evidence warning must alter thorax rendering.'
        png(output / 'twin-review.png',width,height,bytes(pixels))
        print('twin: HR pulse, RR motion and evidence-warning frames differ as expected.')
bind(egl,'eglTerminate',U,P)(display)
