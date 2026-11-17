import sys,json,copy
sys.path.insert(0,'pruebas')
from test_dec062 import *
import test_dec062 as T
def a_ai(kind):
    if kind=='conf':
        a=attest(verdict='CONFLICT',resolution=res('NON_MATERIAL'));a['conflict_resolution']['authority_id']='AI_BOT'
    elif kind=='rev':
        a=attest();a['reviewer_id']='AI_BOT'
    else:
        a=attest();a['binding_id']='B-CANDIDATE';a['binding_version']='1'
    return mme.sign_attestation({k:v for k,v in a.items() if k!='signature'},S)
def tampered():
    d=na();d['signature']='tampered';return d
def revoked():
    e=copy.deepcopy(EVID);e['e1']['revoked_at']='2026-11-17';return e
r33=registry(CID);r33['IND-CM-03']={'version':'1.0.0','state':'CANDIDATE'}
cases={
 'test_03':run(ats=[attest()]),
 'test_04':run(ats=[attest(verdict='FAIL')]),
 'test_05':run(),
 'test_06':run(ats=[attest(verdict='CONFLICT',resolution=res('MATERIAL'))]),
 'test_07':run(ats=[attest(verdict='CONFLICT',resolution=res('NON_MATERIAL'))]),
 'test_08':run(ats=[attest(verdict='CONFLICT',resolution=res('NON_MATERIAL','UNKNOWN'))]),
 'test_09':run(ats=[a_ai('conf')]),
 'test_10':run(ats=[attest(verdict='CONFLICT')]),
 'test_11':run(na_decisions=[na()]),
 'test_12':run(na_decisions=[na(company='C2')]),
 'test_13':run(na_decisions=[na(assessment='A2')]),
 'test_14':run(na_decisions=[na(target='CONDITION')]),
 'test_15':run(na_decisions=[tampered()]),
 'test_16':run(na_decisions=[na()],evidence_store=revoked()),
 'test_17':run(ats=[attest()],evidence_store=revoked()),
 'test_18':run(activation_registry={}),
 'test_19':run(policy_registry={CID+':NA':CAT['version']}),
 'test_20':run(cid='OP-05'),
 'test_21':run(cid='OP-05',scope='EXECUTION_OP05'),
 'test_22':run(cid='OP-05',scope='EXECUTION_OP05',activation_registry={}),
 'test_23':run(ats=[a_ai('rev')]),
 'test_24':run(ats=[a_ai('bind')]),
 'test_25':run(na_decisions=[na(company='')]),
 'test_28':run(cid='OP-05',scope='EXECUTION_OP05',activation_registry={}),
 'test_29':run(ats=[attest(lvl='M4')]),
 'test_30':run(ats=[attest()],na_decisions=[na()]),
 'test_31a':run(cid='OP-05',scope='INITIAL_DIAGNOSIS'),
 'test_31b':run(cid='CM-03',scope='EXECUTION_OP05'),
 'test_32':run(policy_registry={}),
 'test_33':run(ats=[attest(lvl='M5')],activation_registry=r33),
}
out={'generator':'mme_dec062.py (DEC-062 06B) via pruebas/test_dec062.py helpers','engine':mme.VERSION,
 'signatures':{'attest_default':attest()['signature'],'na_default':na()['signature']},'cases':cases}
json.dump(out,open('python-reference-results.json','w'),ensure_ascii=False,indent=1,sort_keys=True)
print({k:v['status'] for k,v in cases.items()})
