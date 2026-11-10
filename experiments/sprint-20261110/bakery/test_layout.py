#!/usr/bin/env python3
"""Layout checks for the Hearth bakery scene. No browser required."""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
LAYOUT = os.path.join(HERE, 'layout.json')

# Counter mesh, metres, after prepareAsset centering and a 180 degree yaw.
# Main-bar customer face sits at local +Z before instance scale.
LOCAL_FRONT_Z = 0.443
LOCAL_BACK_Z = -0.019
LOCAL_HALF_X = 0.9


def forward(rot):
    return (-math.sin(rot), math.cos(rot))


def main():
    with open(LAYOUT, encoding='utf-8') as f:
        layout = json.load(f)
    errors = []

    def check(cond, msg):
        if not cond:
            errors.append(msg)

    room = layout['meta']['room']
    zones = {z['id'] for z in layout['meta']['zones']}
    for zid in ('bread', 'pastry', 'prep', 'window'):
        check(zid in zones, 'missing zone ' + zid)

    ids = [i['id'] for i in layout['instances']]
    check(len(ids) == len(set(ids)), 'duplicate instance ids')

    half_w = room['width'] / 2 + 0.25
    half_d = room['depth'] / 2 + 0.25
    for inst in layout['instances']:
        spec = layout['assets'].get(inst['kind'])
        check(spec is not None, 'unknown kind ' + inst['kind'])
        x, y, z = inst['position']
        check(-half_w <= x <= half_w, inst['id'] + ' x out of room')
        check(-half_d <= z <= half_d, inst['id'] + ' z out of room')
        check(-0.01 <= y <= room['height'], inst['id'] + ' y out of room')
        if inst['kind'] in ('dining_chair', 'bar_stool'):
            check('lookAt' in inst, inst['id'] + ' missing lookAt')
            if 'lookAt' in inst:
                fx, fz = forward(inst.get('rotationY') or 0)
                dx = inst['lookAt'][0] - x
                dz = inst['lookAt'][1] - z
                n = math.hypot(dx, dz)
                check(n > 0.25, inst['id'] + ' lookAt too close')
                if n > 0:
                    dot = (fx * dx + fz * dz) / n
                    check(dot > 0.75, '%s faces away (dot %.2f)' % (inst['id'], dot))

    for kind, spec in layout['assets'].items():
        glb = spec['glb']
        check(glb.startswith('../../../'), kind + ' must reference shared GLBs relatively')
        check('://' not in glb, kind + ' must be offline')
        path = os.path.normpath(os.path.join(HERE, glb))
        check(path.startswith(REPO), kind + ' escapes the repo')
        check(os.path.isfile(path), 'missing ' + glb + ' -> ' + path)
        check(spec['targetHeight'] > 0.05, kind + ' target height')

    counter = next(i for i in layout['instances'] if i['id'] == 'counter')
    spec = layout['assets']['bar_counter']
    s = spec['targetHeight'] / spec['nativeHeight']
    sx, _, sz = counter['scale']
    front = counter['position'][2] + LOCAL_FRONT_Z * s * sz
    back = counter['position'][2] + LOCAL_BACK_Z * s * sz
    left = counter['position'][0] - LOCAL_HALF_X * s * sx
    right = counter['position'][0] + LOCAL_HALF_X * s * sx
    anchor = layout['meta']['anchors']['counter']
    check(abs(front - anchor['frontZ']) < 0.02, 'frontZ drift %.3f vs %.3f' % (front, anchor['frontZ']))
    check(abs(counter['rotationY'] - math.pi) < 0.02, 'counter should yaw 180 so the long face is +Z')
    case = layout['meta']['anchors']['case']
    check(case['x'] - case['w'] / 2 > left - 0.02, 'case hangs off counter left')
    check(case['x'] + case['w'] / 2 < right + 0.02, 'case hangs off counter right')
    check(case['z'] - case['d'] / 2 > back - 0.02, 'case hangs off counter back')
    check(case['z'] + case['d'] / 2 < front + 0.02, 'case hangs past the customer edge')

    html = open(os.path.join(HERE, 'index.html'), encoding='utf-8').read()
    check('bakery.js' in html, 'index does not load bakery.js')
    check('http://' not in html and 'https://' not in html, 'index pulls a remote URL')
    check('workshop/vendor/three.module.js' in html, 'three.js is not vendored offline')

    facing = [i for i in layout['instances'] if i['kind'] == 'dining_chair']
    check(len(facing) >= 4, 'need several dining chairs')
    rots = {round(i.get('rotationY') or 0, 2) for i in facing}
    check(len(rots) >= 3, 'chairs should not all face the same way')

    if errors:
        print('FAIL')
        for e in errors:
            print(' -', e)
        return 1
    print('ok', len(layout['instances']), 'instances', len(layout['assets']), 'assets')
    return 0


if __name__ == '__main__':
    sys.exit(main())
