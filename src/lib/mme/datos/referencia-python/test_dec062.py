import unittest, sys, json, copy
from pathlib import Path
from hashlib import sha256
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'original/PYMAPA_IMD31_MME_INTEGRACION_V1/01_DATOS'
sys.path.insert(0,str(ROOT/'parches/03_CODIGO'))
import mme_dec062 as mme
CAT=json.loads((DATA/'catalogo_mme_31_155_620.json').read_text())
OP05=json.loads((DATA/'op05_64_execution_only.json').read_text())
S='SYNTHETIC-LAB-ONLY-SECRET'
SIG={'reviewer':{'role':'METHODOLOGIST','secret':S}}
blob=b'ONLY SYNTHETIC EVIDENCE'
EVID={'e1':{'content':blob,'sha256':sha256(blob).hexdigest(),'source':'SYNTHETIC','observed_at':'2026-11-16'}}
CID='CM-03'
def registry(cid):
    c=CAT['capabilities'][cid]
    return {id:{'version':CAT['version'],'state':'ENABLED','authorization':'LAB_SYNTHETIC_ONLY'} for lvl in c['levels'].values() for id in [lvl['original_predicate_id']]+[x['id'] for x in lvl['checks']]}
def attest(cid='CM-03',lvl='M1',kind='HECHO',verdict='PASS',resolution=None):
    d=next(x for x in CAT['capabilities'][cid]['levels'][lvl]['checks'] if x['type']==kind)
    payload={'fact_kind':d['fact_kind'],'facts':{f:'SYNTHETIC_VALUE_'+f for f in d['required_domain_fields']},'semantic_reviewed':True} if kind=='HECHO' else ({'applied_case_ref':'synth','observed_result':'synth'} if kind=='OPERACION' else ({'actor':'lab','period':'2026-Q3','scope':'lab'} if kind=='CONTEXTO' else {'source_corroborates_claim':True}))
    a={'check_id':d['id'],'assessment_id':'A1','verdict':verdict,'reviewer_id':'reviewer','issued_at':'2026-11-16','version':mme.VERSION,'evidence_refs':['e1'],'payload':payload}
    if resolution is not None:a['conflict_resolution']=resolution
    return mme.sign_attestation(a,S)
def res(materiality,verdict='PASS'):
    return {'materiality':materiality,'resolved_verdict':verdict,'rationale':'Synthetic human review','evidence_refs':['e1'],'authority_id':'reviewer','decision_version':'DEC062-LAB-1'}
def na(company='C1',assessment='A1',target='CAPABILITY',cid=CID):
    d={'company_id':company,'assessment_id':assessment,'capability_id':cid,'catalog_version':CAT['version'],'target_type':target,'context':'Synthetic relevant context','justification':'Explicit synthetic nonapplicability','evidence_refs':['e1'],'authority_id':'reviewer','decision_version':'NA-LAB-1','issued_at':'2026-11-16'}
    if target=='CONDITION':d['rubric_id']=CAT['capabilities'][cid]['levels']['M1']['rubric_id']
    return mme.sign_attestation(d,S)
def run(cid=CID,ats=None, **kw):
    return mme.assess(cid,catalog=CAT,attestations=ats or [],assessment_id='A1',company_id='C1',evidence_store=kw.pop('evidence_store',EVID),signers=SIG,policy_registry=kw.pop('policy_registry',{cid:CAT['version']}),activation_registry=kw.pop('activation_registry',registry(cid)),**kw)
class TestDEC062(unittest.TestCase):
    def test_01_catalog_31_155_620(self):
        self.assertEqual((len(CAT['capabilities']),sum(len(x['levels']) for x in CAT['capabilities'].values()),sum(len(l['checks']) for x in CAT['capabilities'].values() for l in x['levels'].values())),(31,155,620))
    def test_02_op05_64(self):self.assertEqual(len(OP05),64)
    def test_03_positive_pass_no_auto_maturity(self):
        r=run(ats=[attest()]);self.assertEqual(r['status'],'BOUNDED_UNCERTAIN');self.assertIsNone(r['level'])
    def test_04_negative_fail(self):
        r=run(ats=[attest(verdict='FAIL')]);self.assertEqual(r['levels'][0]['checks']['HECHO']['status'],'FAIL')
    def test_05_unknown(self):self.assertEqual(run()['status'],'NOT_DETERMINED')
    def test_06_material_conflict(self):self.assertEqual(run(ats=[attest(verdict='CONFLICT',resolution=res('MATERIAL'))])['status'],'REVIEW_REQUIRED')
    def test_07_nonmaterial_conflict_explicit_pass(self):
        r=run(ats=[attest(verdict='CONFLICT',resolution=res('NON_MATERIAL'))]);self.assertEqual(r['levels'][0]['checks']['HECHO']['status'],'PASS');self.assertNotEqual(r['status'],'REVIEW_REQUIRED')
    def test_08_nonmaterial_conflict_not_auto_pass(self):
        r=run(ats=[attest(verdict='CONFLICT',resolution=res('NON_MATERIAL','UNKNOWN'))]);self.assertEqual(r['levels'][0]['checks']['HECHO']['status'],'UNKNOWN')
    def test_09_conflict_without_authority(self):
        a=attest(verdict='CONFLICT',resolution=res('NON_MATERIAL'));a['conflict_resolution']['authority_id']='AI_BOT';a=mme.sign_attestation({k:v for k,v in a.items() if k!='signature'},S)
        self.assertEqual(run(ats=[a])['status'],'REVIEW_REQUIRED')
    def test_10_conflict_no_materiality(self):self.assertEqual(run(ats=[attest(verdict='CONFLICT')])['status'],'REVIEW_REQUIRED')
    def test_11_na_contextual(self):self.assertEqual(run(na_decisions=[na()])['status'],'NOT_APPLICABLE_CONTEXTUAL')
    def test_12_na_other_company(self):self.assertEqual(run(na_decisions=[na(company='C2')])['status'],'REVIEW_REQUIRED')
    def test_13_na_other_assessment(self):self.assertEqual(run(na_decisions=[na(assessment='A2')])['status'],'REVIEW_REQUIRED')
    def test_14_na_condition_needs_policy(self):self.assertEqual(run(na_decisions=[na(target='CONDITION')])['status'],'REVIEW_REQUIRED_NA_AGGREGATION_POLICY')
    def test_15_na_unsigned(self):
        d=na();d['signature']='tampered';self.assertEqual(run(na_decisions=[d])['status'],'REVIEW_REQUIRED')
    def test_16_na_revoked(self):
        e=copy.deepcopy(EVID);e['e1']['revoked_at']='2026-11-17';self.assertEqual(run(na_decisions=[na()],evidence_store=e)['status'],'REVIEW_REQUIRED')
    def test_17_evidence_revoked(self):
        e=copy.deepcopy(EVID);e['e1']['revoked_at']='2026-11-17';self.assertEqual(run(ats=[attest()],evidence_store=e)['status'],'REVIEW_REQUIRED')
    def test_18_no_activation(self):self.assertEqual(run(activation_registry={})['status'],'BLOCKED_NO_ITEM_AUTHORIZATION')
    def test_19_old_global_na_ignored(self):self.assertEqual(run(policy_registry={CID+':NA':CAT['version']})['status'],'BLOCKED_NO_AUTHORIZATION')
    def test_20_op05_initial_excluded(self):self.assertEqual(run(cid='OP-05')['status'],'EXCLUDED_OP05')
    def test_21_op05_execution_same_engine(self):self.assertEqual(run(cid='OP-05',scope='EXECUTION_OP05')['status'],'NOT_DETERMINED')
    def test_22_op05_execution_unapproved_block(self):self.assertEqual(run(cid='OP-05',scope='EXECUTION_OP05',activation_registry={})['status'],'BLOCKED_NO_ITEM_AUTHORIZATION')
    def test_23_no_signature_ai(self):
        a=attest();a['reviewer_id']='AI_BOT';a=mme.sign_attestation({k:v for k,v in a.items() if k!='signature'},S)
        self.assertEqual(run(ats=[a])['status'],'REVIEW_REQUIRED')
    def test_24_no_binding_auto_enabled(self):
        a=attest();a['binding_id']='B-CANDIDATE';a['binding_version']='1';a=mme.sign_attestation({k:v for k,v in a.items() if k!='signature'},S)
        self.assertEqual(run(ats=[a])['status'],'BLOCKED_BINDING_NOT_AUTHORIZED')
    def test_25_no_global_na_without_company(self):self.assertEqual(run(na_decisions=[na(company='')])['status'],'REVIEW_REQUIRED')
if __name__=='__main__':unittest.main(verbosity=2)
