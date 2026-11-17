import unittest,sys,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'parches/03_CODIGO'))
import mme_dec062 as mme
from test_dec062 import CAT,OP05,run,attest,registry,na,CID
class TestSyntheticIntegrationContract(unittest.TestCase):
    def test_26_initial_catalog_excludes_op05_not_model(self):
        self.assertEqual(len(CAT['capabilities']),31)
        self.assertEqual(len([c for c in CAT['capabilities'].values() if c['stage']=='INITIAL_DIAGNOSIS']),30)
    def test_27_op05_five_rubrics_twenty_checks(self):
        levels=CAT['capabilities']['OP-05']['levels'];self.assertEqual(len(levels),5)
        self.assertEqual(sum(len(l['checks']) for l in levels.values()),20)
    def test_28_op05_no_candidate_automatically_enabled(self):
        self.assertTrue(all(x['scope']=='EXECUTION_OP05' and not x['included_initial_diagnosis'] for x in OP05))
        self.assertEqual(run(cid='OP-05',scope='EXECUTION_OP05',activation_registry={})['status'],'BLOCKED_NO_ITEM_AUTHORIZATION')
    def test_29_indicator_requires_individual_authorization(self):
        a=attest(lvl='M4');r=run(ats=[a]);self.assertEqual(r['status'],'BLOCKED_INDICATOR_NOT_AUTHORIZED')
    def test_30_na_does_not_override_attestations(self):
        self.assertEqual(run(ats=[attest()],na_decisions=[na()])['status'],'REVIEW_REQUIRED')
    def test_31_scope_wrong(self):
        self.assertEqual(run(cid='OP-05',scope='INITIAL_DIAGNOSIS')['status'],'EXCLUDED_OP05')
        self.assertEqual(run(cid='CM-03',scope='EXECUTION_OP05')['status'],'REVIEW_REQUIRED')
    def test_32_no_company_auth_missing(self):
        self.assertEqual(run(policy_registry={})['status'],'BLOCKED_NO_AUTHORIZATION')
    def test_33_unapproved_indicator_block_even_with_test_registry(self):
        a=attest(lvl='M5');r=registry(CID);r['IND-CM-03']={'version':'1.0.0','state':'CANDIDATE'}
        self.assertEqual(run(ats=[a],activation_registry=r)['status'],'BLOCKED_INDICATOR_NOT_AUTHORIZED')
if __name__=='__main__':unittest.main(verbosity=2)
