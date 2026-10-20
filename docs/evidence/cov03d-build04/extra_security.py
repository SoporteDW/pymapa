import json,requests,uuid
from pathlib import Path
D=Path('/tmp/browser/build04');e=dict(l.strip().split('=',1) for l in open('/dev-server/.env') if '=' in l);u=e['VITE_SUPABASE_URL'].strip('"');k=e['VITE_SUPABASE_PUBLISHABLE_KEY'].strip('"');out=[]
for label in ['owner','admin','member']:
 m=json.load(open(D/(label+'-session.json')));h={'apikey':k,'Authorization':'Bearer '+m['session']['access_token'],'Content-Type':'application/json'}
 r=requests.post(u+'/rest/v1/coverage_pilot_authorizations',headers=h,json={'organization_id':'9816dfad-a1be-4140-8293-c4cab34f3603','assessment_id':'c71d7b34-9da0-4755-8394-418172412731','knowledge_version_id':'d1a25af1-3634-4c9b-9465-69ac25875e26','capability_id':'CM-05','acquisition_ref':'ACQ·P1·01','criteria_version':'CM05-P101-COV-1.0.0','authorization_reference':'BUILD04_NEGATIVE_CLIENT_SELF_AUTH','synthetic_qa':True});out.append({'role':label,'selfAuthorizationStatus':r.status_code,'result':r.json() if r.content else None})
D.joinpath('self-authorization-negatives.json').write_text(json.dumps(out,indent=2));print([(x['role'],x['selfAuthorizationStatus']) for x in out])
