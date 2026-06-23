import json
p='runs.json'
with open(p,'r',encoding='utf-8') as f:
    j=json.load(f)
runs=j.get('workflow_runs',[])
for r in runs:
    print(f"#{r.get('run_number')} • {r.get('name')} • status={r.get('status')} conclusion={r.get('conclusion')} id={r.get('id')} url={r.get('html_url')}")
