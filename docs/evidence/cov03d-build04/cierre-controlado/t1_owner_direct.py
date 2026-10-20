import json,requests,os
from pathlib import Path
D=Path('/tmp/browser/cierre_controlado');m=json.load(open(D/'owner-session.json'))
e=dict(l.strip().split('=',1) for l in open('/dev-server/.env') if '=' in l);u=e['VITE_SUPABASE_URL'].strip('"');k=e['VITE_SUPABASE_PUBLISHABLE_KEY'].strip('"')
H={'apikey':k,'Authorization':'Bearer '+m['session']['access_token'],'Content-Type':'application/json','Prefer':'return=representation'}
ORG='9816dfad-a1be-4140-8293-c4cab34f3603';AS='c71d7b34-9da0-4755-8394-418172412731';MID='b0400000-0000-4000-8000-000000000014'
def g(t,q): r=requests.get(u+'/rest/v1/'+t,headers=H,params=q);return r.json()
def snap(): return {'mapping':g('fragment_mappings',{'id':'eq.'+MID,'select':'id,status,coverage_scope,coverage_revision,coverage_acquisition_ref,updated_at'}),
 'decisions':g('coverage_decisions',{'mapping_id':'eq.'+MID,'select':'id,revision,created_at','order':'revision'}),
 'catalog':g('coverage_criteria_catalog',{'select':'criteria_version,approval_status','approval_status':'neq.PROPOSED'}),
 'pilots':g('coverage_pilot_authorizations',{'select':'id,active,organization_id'}),
 'observations':len(g('observations',{'assessment_id':'eq.'+AS,'select':'id'})),
 'audit':len(g('audit_events',{'subject_id':'eq.'+MID,'select':'id'}))}
out={'actor':'qa.cm05e2e (OWNER, org QA A)','before':snap(),'attempts':[]}
dec=out['before']['decisions'][0]['id'] if out['before']['decisions'] else None
A=[('PATCH','fragment_mappings?id=eq.'+MID,{'coverage_scope':'FULL'}),
('PATCH','fragment_mappings?id=eq.'+MID,{'status':'VALIDATED'}),
('DELETE','fragment_mappings?id=eq.'+MID,None),
('POST','fragment_mappings',{'organization_id':ORG,'assessment_id':AS,'fragment_id':'b0400000-0000-4000-8000-000000000034','capability_id':'CM-05','target_type':'ACQUISITION','target_ref':'ACQ·P1·01','knowledge_version_id':'d1a25af1-3634-4c9b-9465-69ac25875e26','knowledge_pack_id':'cm-05','knowledge_pack_version':'1.0.0','proposed_by':'HUMAN','status':'VALIDATED','coverage_scope':'FULL'}),
('POST','coverage_decisions',{'organization_id':ORG,'assessment_id':AS,'mapping_id':MID,'revision':99,'actor_user_id':m['user_id'],'declaration':{},'result':{'scope':'FULL'}}),
('PATCH','coverage_decisions?id=eq.'+str(dec),{'result':{'scope':'FULL'}}),
('DELETE','coverage_decisions?id=eq.'+str(dec),None),
('PATCH','coverage_criteria_catalog?criteria_version=eq.CM05-P101-COV-1.0.0',{'approval_status':'APPROVED'}),
('POST','coverage_criteria_catalog',{'knowledge_version_id':'d1a25af1-3634-4c9b-9465-69ac25875e26','capability_id':'CM-05','acquisition_ref':'ACQ·P1·02','criteria_version':'FAKE','approval_status':'APPROVED','approval_reference':'self','mapping_target_type':'ACQUISITION','components':[]}),
('POST','coverage_pilot_authorizations',{'organization_id':ORG,'assessment_id':AS,'knowledge_version_id':'d1a25af1-3634-4c9b-9465-69ac25875e26','capability_id':'CM-05','acquisition_ref':'ACQ·P1·02','criteria_version':'CM05-P101-COV-1.0.0','authorization_reference':'self','synthetic_qa':True,'active':True}),
('PATCH','coverage_pilot_authorizations?organization_id=eq.'+ORG,{'active':True}),
('POST','audit_events',{'organization_id':ORG,'event_type':'FRAGMENT_MAPPING_COVERAGE_DECIDED','subject_table':'fragment_mappings','subject_id':MID}),
('DELETE','audit_events?subject_id=eq.'+MID,None)]
for meth,path,body in A:
 r=requests.request(meth,u+'/rest/v1/'+path,headers=H,json=body)
 out['attempts'].append({'method':meth,'target':path.split('?')[0],'status':r.status_code,'rowsAffected':(len(r.json()) if r.status_code<300 and r.content and isinstance(r.json(),list) else None),'error':(r.json().get('code') if r.status_code>=300 and r.content else None)})
out['after']=snap();out['unchanged']=out['before']==out['after']
out['allRejectedOrZeroRows']=all(a['status']>=400 or a['rowsAffected']==0 for a in out['attempts'])
(D/'t1-owner-direct-write.json').write_text(json.dumps(out,indent=1,ensure_ascii=False))
for a in out['attempts']: print(a)
print('unchanged',out['unchanged'],'allRejected',out['allRejectedOrZeroRows']);print(json.dumps(out['before'],ensure_ascii=False)[:600])
