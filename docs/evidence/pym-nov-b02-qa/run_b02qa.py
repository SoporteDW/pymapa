import json, os, time, requests, datetime as dt
U="https://xgziirtcwopmjtqpagud.supabase.co"; K="sb_publishable_Q1tO1UIW-enQvuFekZvWVA_DIeKwF4p"
def tok(f): d=json.load(open(f)); return d["session"]["access_token"]
T={k:tok(f"/tmp/b02qa/{k}.json") for k in ["gov","a","b"]}
def H(k): return {"apikey":K,"Authorization":"Bearer "+T[k],"Content-Type":"application/json"}
def rpc(k,fn,args): r=requests.post(f"{U}/rest/v1/rpc/{fn}",headers=H(k),json=args); return r.status_code, r.json() if r.text else None
def get(k,path): r=requests.get(f"{U}/rest/v1/{path}",headers=H(k)); return r.status_code, r.json()
OA,AA,UA="9816dfad-a1be-4140-8293-c4cab34f3603","c71d7b34-9da0-4755-8394-418172412731","d918f1e4-d569-4569-b60e-fe3b90ec86da"
OB,AB,UB="b0400000-0000-4000-8000-000000000001","b0400000-0000-4000-8000-000000000003","ef9d59d2-9c1c-4374-b501-ff42301fcb47"
R=[];S={}
def rec(id,desc,ok,ev): R.append({"id":id,"test":desc,"result":"PASS" if ok else "FAIL","evidence":ev}); print(id,"PASS" if ok else "FAIL",desc,str(ev)[:200])
now=dt.datetime.now(dt.timezone.utc); iso=lambda d:d.isoformat()
REF="DEC-052 · EPAR_QA_ONLY · B02-QA"
# responses existing
_,ra=get("a",f"responses?select=id,payload&assessment_id=eq.{AA}&limit=50")
_,rb=get("b",f"responses?select=id,payload&assessment_id=eq.{AB}&limit=50")
ra=[r["id"] for r in ra if (r["payload"] or {}).get("capabilityId","OP-01")=="OP-01"]
rb=[r["id"] for r in rb if (r["payload"] or {}).get("capabilityId","OP-01")=="OP-01"]
S["responsesA"]=len(ra);S["responsesB"]=len(rb)
_,ea=get("a",f"evidence?select=id&assessment_id=eq.{AA}&limit=5"); ea=[e["id"] for e in ea]
_,eb=get("b",f"evidence?select=id&assessment_id=eq.{AB}&limit=5"); eb=[e["id"] for e in eb]
S["evidenceA"]=len(ea);S["evidenceB"]=len(eb)
OLD=["bd720086-279b-4853-a35f-91ceb00084e9","9e148c2a-9f70-406d-ad7d-0df5acfbbfc9","fb406d0f-5c21-4b5a-bf86-8265a334e011","c2cd45b5-0155-4a66-aa1f-3cd66ad25dc1"]
# negatives before grant
c,b=rpc("a","grant_professional_authority",{"_organization":OA,"_evaluator":UA,"_assessment":AA,"_capabilities":["OP-01"],"_from":iso(now),"_until":iso(now+dt.timedelta(hours=4)),"_approval":REF})
rec("G-01","QA A (OWNER) no puede autodesignarse",c>=400 and "EPAR_GOVERNANCE_DENIED" in json.dumps(b),b)
c,b=rpc("gov","grant_professional_authority",{"_organization":OA,"_evaluator":UB,"_assessment":AA,"_capabilities":["OP-01"],"_from":iso(now),"_until":iso(now+dt.timedelta(hours=4)),"_approval":REF})
rec("G-02","Gobierno no puede designar a QA B en org A (no miembro)",c>=400 and "EPAR_DESIGNATION_INVALID" in json.dumps(b),b)
c,b=rpc("gov","grant_professional_authority",{"_organization":OA,"_evaluator":UA,"_assessment":AB,"_capabilities":["OP-01"],"_from":iso(now),"_until":iso(now+dt.timedelta(hours=4)),"_approval":REF})
rec("G-03","Gobierno no puede designar sobre assessment ajeno",c>=400 and "EPAR_DESIGNATION_INVALID" in json.dumps(b),b)
# grants
until=now+dt.timedelta(hours=4)
c,ga=rpc("gov","grant_professional_authority",{"_organization":OA,"_evaluator":UA,"_assessment":AA,"_capabilities":["OP-01"],"_from":iso(now-dt.timedelta(seconds=5)),"_until":iso(until),"_approval":REF+" · QA A"})
rec("G-04","Gobierno designa QA A (OP-01, assessment A)",c==200,ga)
c,gb=rpc("gov","grant_professional_authority",{"_organization":OB,"_evaluator":UB,"_assessment":AB,"_capabilities":["OP-01"],"_from":iso(now-dt.timedelta(seconds=5)),"_until":iso(until),"_approval":REF+" · QA B"})
rec("G-05","Gobierno designa QA B (OP-01, assessment B)",c==200,gb)
c,gf=rpc("gov","grant_professional_authority",{"_organization":OA,"_evaluator":UA,"_assessment":AA,"_capabilities":["OP-01"],"_from":iso(now+dt.timedelta(days=1)),"_until":iso(now+dt.timedelta(days=1,hours=1)),"_approval":REF+" · futura"})
c2,ge=rpc("gov","grant_professional_authority",{"_organization":OA,"_evaluator":UA,"_assessment":AA,"_capabilities":["OP-01"],"_from":iso(now-dt.timedelta(seconds=5)),"_until":iso(now+dt.timedelta(seconds=75)),"_approval":REF+" · expiración"})
rec("G-06","Designaciones de prueba de ventana temporal emitidas",c==200 and c2==200,{"futura":gf,"corta":ge})
src=iso(now-dt.timedelta(minutes=1)); vu=iso(now+dt.timedelta(days=30))
base={"justification":"QA sintética B02","limitations":"Datos sintéticos","uncertainty":"Alta","sources":"Respuestas registradas","pendingInformation":"","sourceDate":src,"validUntil":vu,"evidenceIds":[]}
# A substantiated
body=dict(base,authorityId=ga,state="SUBSTANTIATED",conclusion="Conclusión profesional sintética QA A",responseIds=[],evidenceIds=ea[:1])
c,va1=rpc("a","register_professional_assessment",{"_organization":OA,"_assessment":AA,"_capability":"OP-01","_body":body})
rec("P-01","QA A registra evaluación SUBSTANTIATED con referencia a evidencia propia",c==200,{"id":va1,"evidence":ea[:1]})
c,bad=rpc("a","register_professional_assessment",{"_organization":OA,"_assessment":AA,"_capability":"OP-01","_body":dict(base,authorityId=ga,state="SUBSTANTIATED",conclusion="x",responseIds=[])}); 
rec("P-02","SUBSTANTIATED sin respaldo es rechazado",c>=400,bad)
# B abstention
body=dict(base,authorityId=gb,state="INSUFFICIENT_INFORMATION",conclusion=None,responseIds=rb[:1],pendingInformation="Faltan datos de proceso",evidenceIds=eb[:1])
c,vb1=rpc("b","register_professional_assessment",{"_organization":OB,"_assessment":AB,"_capability":"OP-01","_body":body})
rec("P-03","QA B registra abstención INSUFFICIENT_INFORMATION sin conclusión",c==200,vb1)
c,bad=rpc("b","register_professional_assessment",{"_organization":OB,"_assessment":AB,"_capability":"OP-01","_body":dict(body,conclusion="forzada")})
rec("P-04","Abstención con conclusión forzada es rechazada",c>=400,bad)
# persistence/retrieval
c,rows=get("a",f"professional_assessments?select=id,evaluation_id,version,state,conclusion,evaluator_user_id,origin&id=eq.{va1}")
rec("P-05","QA A recupera su evaluación persistida",c==200 and len(rows)==1 and rows[0]["state"]=="SUBSTANTIATED",rows)
ev=rows[0]["evaluation_id"] if rows else None
c,rowsb=get("b",f"professional_assessments?select=id,state,conclusion&id=eq.{vb1}")
rec("P-06","QA B recupera su abstención (conclusion null)",c==200 and len(rowsb)==1 and rowsb[0]["conclusion"] is None,rowsb)
# supersession
body=dict(base,authorityId=ga,state="REVIEW_REQUIRED",conclusion="Versión 2",responseIds=[],evidenceIds=ea[:1],evaluationId=ev,previousVersionId=va1)
c,va2=rpc("a","register_professional_assessment",{"_organization":OA,"_assessment":AA,"_capability":"OP-01","_body":body})
c2,v2=get("a",f"professional_assessments?select=version,previous_version_id&id=eq.{va2}") if c==200 else (0,None)
rec("P-07","Supersesión: versión 2 enlazada a versión 1",c==200 and v2 and v2[0]["version"]==2 and v2[0]["previous_version_id"]==va1,v2)
c,bad=rpc("a","register_professional_assessment",{"_organization":OA,"_assessment":AA,"_capability":"OP-01","_body":dict(body,conclusion="rama")})
rec("P-08","Versión obsoleta (bifurcación) rechazada",c>=400 and "EPAR_STALE_VERSION" in json.dumps(bad),bad)
c,v1=get("a",f"professional_assessments?select=id,conclusion&id=eq.{va1}")
rec("P-09","Versión 1 conservada sin cambios (append-only)",c==200 and v1 and v1[0]["conclusion"]=="Conclusión profesional sintética QA A",v1)
# review
c,bad=rpc("a","review_professional_assessment",{"_version":va1,"_organization":OA,"_assessment":AA,"_capability":"OP-01","_authority":ga,"_decision":"REVIEWED","_note":"revisión"})
rec("R-01","Revisión de versión reemplazada rechazada",c>=400 and "EPAR_REVIEW_INVALID" in json.dumps(bad),bad)
c,rv=rpc("a","review_professional_assessment",{"_version":va2,"_organization":OA,"_assessment":AA,"_capability":"OP-01","_authority":ga,"_decision":"CHANGES_REQUESTED","_note":"Revisión QA sintética"})
rec("R-02","Revisión de versión vigente registrada",c==200,rv)
c,rvb=rpc("b","review_professional_assessment",{"_version":vb1,"_organization":OB,"_assessment":AB,"_capability":"OP-01","_authority":gb,"_decision":"REVIEWED","_note":"Revisión QA B"})
rec("R-03","QA B revisa su abstención",c==200,rvb)
S["reviewNote"]="La revisión fue hecha por el mismo evaluador: el contrato no exige un segundo profesional distinto."
# bilateral
for k,org,vid,oth in [("a",OB,vb1,"B"),("b",OA,va1,"A")]:
  c,rows=get(k,f"professional_assessments?select=id&organization_id=eq.{org}")
  c2,rows2=get(k,f"professional_assessments?select=id&id=eq.{vid}")
  c3,rows3=get(k,f"professional_authorities?select=id&organization_id=eq.{org}")
  c4,rows4=get(k,f"professional_assessment_reviews?select=id&organization_id=eq.{org}")
  rec(f"I-{k.upper()}1",f"QA {k.upper()} no lee evaluaciones/designaciones/revisiones de org {oth}",rows==[] and rows2==[] and rows3==[] and rows4==[],{"filtro":len(rows),"idor":len(rows2),"auth":len(rows3),"rev":len(rows4)})
c,bad=rpc("a","register_professional_assessment",{"_organization":OB,"_assessment":AB,"_capability":"OP-01","_body":dict(base,authorityId=ga,state="INSUFFICIENT_INFORMATION",responseIds=[])})
rec("I-A2","QA A no registra en org B con su autoridad",c>=400 and "EPAR_AUTHORITY_DENIED" in json.dumps(bad),bad)
c,bad=rpc("b","register_professional_assessment",{"_organization":OA,"_assessment":AA,"_capability":"OP-01","_body":dict(base,authorityId=ga,state="INSUFFICIENT_INFORMATION",responseIds=[])})
rec("I-B2","QA B no usa la autoridad de QA A",c>=400 and "EPAR_AUTHORITY_DENIED" in json.dumps(bad),bad)
c,bad=rpc("a","register_professional_assessment",{"_organization":OA,"_assessment":AA,"_capability":"OP-01","_body":dict(base,authorityId=ga,state="SUBSTANTIATED",conclusion="x",responseIds=[],evidenceIds=eb[:1])})
rec("I-A3","QA A no referencia evidencia de org B",c>=400 and "EPAR_REFERENCE_FORBIDDEN" in json.dumps(bad),{"err":bad,"ref":eb[:1]})
c,bad=rpc("b","review_professional_assessment",{"_version":va2,"_organization":OA,"_assessment":AA,"_capability":"OP-01","_authority":gb,"_decision":"REVIEWED","_note":"x"})
rec("I-B3","QA B no revisa evaluación de org A",c>=400,bad)
for k in ["a","b"]:
  r=requests.patch(f"{U}/rest/v1/professional_assessments?id=eq.{va1}",headers=dict(H(k),Prefer="return=representation"),json={"conclusion":"alterada"})
  rec(f"I-{k.upper()}4",f"QA {k.upper()} no puede modificar evaluaciones directamente",r.status_code>=400 or r.json()==[],[r.status_code,r.text[:120]])
# scope
c,bad=rpc("a","register_professional_assessment",{"_organization":OA,"_assessment":AA,"_capability":"OP-02","_body":dict(base,authorityId=ga,state="INSUFFICIENT_INFORMATION",responseIds=[])})
rec("S-01","Autoridad OP-01 no habilita OP-02",c>=400 and "EPAR_AUTHORITY_DENIED" in json.dumps(bad),bad)
c,bad=rpc("a","register_professional_assessment",{"_organization":OA,"_assessment":AA,"_capability":"OP-01","_body":dict(base,authorityId=gf,state="INSUFFICIENT_INFORMATION",responseIds=[])})
rec("S-02","Autoridad aún no vigente (futura) rechazada",c>=400 and "EPAR_AUTHORITY_DENIED" in json.dumps(bad),bad)
c,bad=rpc("gov","register_professional_assessment",{"_organization":OA,"_assessment":AA,"_capability":"OP-01","_body":dict(base,authorityId=ga,state="INSUFFICIENT_INFORMATION",responseIds=[])})
rec("S-03","La cuenta institucional no puede evaluar",c>=400 and "EPAR_AUTHORITY_DENIED" in json.dumps(bad),bad)
c,ok=rpc("a","register_professional_assessment",{"_organization":OA,"_assessment":AA,"_capability":"OP-01","_body":dict(base,authorityId=ge,state="NOT_APPLICABLE",responseIds=[])})
rec("E-01","Autoridad corta funciona antes de expirar",c==200,ok)
wait=(now+dt.timedelta(seconds=80)-dt.datetime.now(dt.timezone.utc)).total_seconds()
if wait>0: time.sleep(wait)
c,bad=rpc("a","register_professional_assessment",{"_organization":OA,"_assessment":AA,"_capability":"OP-01","_body":dict(base,authorityId=ge,state="NOT_APPLICABLE",responseIds=[])})
rec("E-02","Autoridad expirada rechazada",c>=400 and "EPAR_AUTHORITY_DENIED" in json.dumps(bad),bad)
# revocation
c,bad=rpc("a","revoke_professional_authority",{"_authority":ga,"_note":"auto"})
rec("V-01","QA A no puede revocar autoridades",c>=400 and "EPAR_GOVERNANCE_DENIED" in json.dumps(bad),bad)
rv={}
for n,g in [("A",ga),("B",gb),("futura",gf),("corta",ge)]+[("run1-"+str(i),o) for i,o in enumerate(OLD)]:
  c,x=rpc("gov","revoke_professional_authority",{"_authority":g,"_note":"Cierre B02-QA · DEC-052"}); rv[n]=[c,x]
rec("V-02","Gobierno revoca las 8 designaciones QA (4 de esta corrida + 4 de la corrida interrumpida)",all(v[0]==200 for v in rv.values()),rv)
c,bad=rpc("a","register_professional_assessment",{"_organization":OA,"_assessment":AA,"_capability":"OP-01","_body":dict(base,authorityId=ga,state="INSUFFICIENT_INFORMATION",responseIds=[])})
c2,bad2=rpc("b","register_professional_assessment",{"_organization":OB,"_assessment":AB,"_capability":"OP-01","_body":dict(base,authorityId=gb,state="INSUFFICIENT_INFORMATION",responseIds=[])})
rec("V-03","Tras revocación QA A y QA B no pueden evaluar",c>=400 and c2>=400 and "EPAR_AUTHORITY_DENIED" in json.dumps([bad,bad2]),[bad,bad2])
c,rows=get("a",f"professional_assessments?select=id&organization_id=eq.{OA}")
rec("V-04","Historial conservado tras revocación",c==200 and len(rows)>=3,len(rows))
json.dump({"results":R,"ids":{"ga":ga,"gb":gb,"gf":gf,"ge":ge,"va1":va1,"va2":va2,"vb1":vb1},"S":S},open("/tmp/b02qa/results.json","w"),indent=1,ensure_ascii=False)
