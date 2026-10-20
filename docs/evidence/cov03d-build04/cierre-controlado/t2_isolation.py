import json,requests
from pathlib import Path
D=Path('.');m=json.load(open('orgb-exclusive-session.json'));e=dict(l.strip().split('=',1) for l in open('/dev-server/.env') if '=' in l);u=e['VITE_SUPABASE_URL'].strip('"');k=e['VITE_SUPABASE_PUBLISHABLE_KEY'].strip('"')
H={'apikey':k,'Authorization':'Bearer '+m['session']['access_token'],'Content-Type':'application/json','Prefer':'return=representation'}
A='9816dfad-a1be-4140-8293-c4cab34f3603';AS='c71d7b34-9da0-4755-8394-418172412731';B='b0400000-0000-4000-8000-000000000001';MA='b0400000-0000-4000-8000-000000000014'
out={'actor':'qa.orgb.exclusive (MEMBER, solo QA B, creada en esta verificación)','ownMemberships':requests.get(u+'/rest/v1/memberships',headers=H,params={'select':'organization_id,role'}).json(),'readsA':{},'writesA':[],'rpcA':{},'readsB':{}}
for t in ['coverage_decisions','fragment_mappings','evidence','evidence_fragments','observations','responses','audit_events','coverage_pilot_authorizations','assessments','memberships']:
 r=requests.get(u+'/rest/v1/'+t,headers=H,params={'organization_id':'eq.'+A,'select':'id'});out['readsA'][t]={'status':r.status_code,'rows':len(r.json()) if r.status_code==200 else None}
 r=requests.get(u+'/rest/v1/'+t,headers=H,params={'organization_id':'eq.'+B,'select':'id'});out['readsB'][t]={'status':r.status_code,'rows':len(r.json()) if r.status_code==200 else None}
r=requests.get(u+'/rest/v1/fragment_mappings',headers=H,params={'id':'eq.'+MA,'select':'id'});out['readsA']['mappingById']=len(r.json())
r=requests.get(u+'/rest/v1/coverage_decisions',headers={**H,'Prefer':'count=exact'},params={'organization_id':'eq.'+A,'select':'id'});out['readsA']['countHeader']=r.headers.get('content-range')
for meth,path,body in [('PATCH','fragment_mappings?id=eq.'+MA,{'coverage_scope':'FULL'}),('DELETE','coverage_decisions?organization_id=eq.'+A,None),('POST','coverage_decisions',{'organization_id':A,'assessment_id':AS,'mapping_id':MA,'revision':99,'actor_user_id':m['user_id'],'declaration':{},'result':{}})]:
 r=requests.request(meth,u+'/rest/v1/'+path,headers=H,json=body);out['writesA'].append({'method':meth,'target':path.split('?')[0],'status':r.status_code,'rows':len(r.json()) if r.status_code<300 and r.content else None})
def rpc(fn,d): r=requests.post(u+'/rest/v1/rpc/'+fn,headers=H,json=d);return {'status':r.status_code,'message':(r.json().get('message') if r.content and isinstance(r.json(),dict) else r.text[:120])}
out['rpcA']['revoke']=rpc('revoke_fragment_mapping',{'_mapping_id':MA,'_note':'QA B cross-org attempt'})
out['rpcA']['validate']=rpc('validate_fragment_mapping',{'_mapping_id':'b0400000-0000-4000-8000-000000000037','_decision':'REJECTED','_basis':'HUMAN_VALIDATION','_rule_ref':None,'_note':'QA B cross-org attempt'})
d=json.load(open('/dev-server/docs/evidence/cov03d-build04/full-declaration.json'));d.update(mappingId=MA,expectedRevision=6,requestId='00000000-0000-4000-8000-0000000c1002',targetScope='FULL')
out['rpcA']['setCoverage']=rpc('set_structured_acquisition_coverage',{'_declaration':d})
out['pass']=all(v['rows'] in (0,None) for v in out['readsA'].values() if isinstance(v,dict)) and out['readsA']['mappingById']==0 and all(w['status']>=400 or w['rows']==0 for w in out['writesA']) and all(v['status']>=400 for v in out['rpcA'].values()) and out['readsB']['coverage_decisions']['rows']>0
(D/'t2-isolation.json').write_text(json.dumps(out,indent=1,ensure_ascii=False));print(json.dumps(out,ensure_ascii=False,indent=0)[:3000])
