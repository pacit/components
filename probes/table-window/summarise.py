import json,sys
for eng in ['chromium','firefox','webkit']:
    print('=====',eng)
    for l in open(f''+sys.argv[1]+f'/{eng}.jsonl'):
        d=json.loads(l); r=d['result']
        if d['probe'].startswith('P1'): print(d['probe'], r['n'], 'built',r['built'],'first',r['firstFrame'],'scroll',r['scrollMedian'],r['scrollMax'],'restyle',r['restyleMedian'],'relayout',r['relayoutMedian'],'reorder',r['reorder'],'find',r['found'],repr(r['selected'])[:20],'heap',r['heapUsed'])
        elif d['probe']=='P2':
            print('P2',r['kind'],r['layout'],'drift',r['maxColDrift'],'move',r['moveMedian'],r['moveMax'],'exp',r['expectedHeight'],[ (s['rowOffsetError'],s['stickyHeaderTop'],s['scrollHeight']) for s in r['samples']], r['axe'])
        elif d['probe']=='P3': print('P3',r['correct'],r['anchor'],r['maxJump'],r['sumJump'],[(s['engine'],s['jump']) for s in r['steps'] if s['delta'] or s['jump'] or s['engine']])
        elif d['probe']=='P4': print('P4',r['structure'],r['axe'],r['roles'] if eng=='chromium' else '')
        else: print('P5',r['kind'],r['keptUpTo'],[(t['H'],t['scrollHeight'],t['reachesEnd']) for t in r['tries']])
    print(d['cond'])
