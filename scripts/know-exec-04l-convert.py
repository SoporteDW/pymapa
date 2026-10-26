import openpyxl,json,hashlib
p='/mnt/user-uploads/PYMAPA_KNOW-EXEC-04-L_Matriz_Consolidada_DG_PC.xlsx'
sha=hashlib.sha256(open(p,'rb').read()).hexdigest()
wb=openpyxl.load_workbook(p,data_only=True)
rows=lambda n:list(wb[n].iter_rows(min_row=2,values_only=True))
L1={r[2]:r for r in rows('L1_Matriz_consolidada')}
L3={r[1]:r for r in rows('L3_Referencias_HF')}
L5={}
for r in rows('L5_Excepciones'): L5.setdefault(r[1],[]).append(f"{r[2]}: {r[3]} ({r[5]})")
caps=sorted({r[0] for r in L1.values()})
S1=[]
for c,obj,tipo,txt,loc,est in rows('L2_Reglas_y_guardrails'):
  g='GUARDRAIL' in tipo; m=L1.get(obj)
  S1.append({"Capacidad":c,"Regla K4":obj,"Tipo de objeto":"Guardrail" if g else "Regla diagnóstica",
   "Título histórico":(m[4] if m else obj),"Texto histórico íntegro (K4)":txt or "",
   "CE relacionada":"No identificada (matriz: "+m[8]+")" if m else None,"VA relacionada":"No identificada (matriz: "+m[9]+")" if m else None,
   "Familia HF referida":m[10] if m else None,
   "Guardrails / restricciones":(m[14] if m else est),
   "Excepción agrupada":None if g else "MAP-VA-CE",
   "Excepción particular":None if g else " | ".join([f"Preparación: {m[15]}",f"Requerido: {m[16]}"]+L5.get(obj,[])),
   "Autoridad":m[17] if m else "Conocimiento","Localizador":loc})
S2=[{"Capacidad":r[0],"Regla":r[1],"Familia HF histórica":r[2],"Binding ejecutable aprobado":"NO","Emisión automática aprobada":r[5]} for r in L3.values()]
al=", ".join(caps)
S3=[{"Patrón":"MAP-VA-CE","Alcance":al,"Excepción común":"Relación individual R–VA/CE no explícita en cuerpo de regla; no completar por proximidad","Autoridad":"Conocimiento"},
    {"Patrón":"MAP-HF","Alcance":al,"Excepción común":"Sin referencia directa HF verificada; no inventar binding","Autoridad":"Conocimiento"},
    {"Patrón":"DS-04","Alcance":"DG-01","Excepción común":"DS-04: vínculo R-DG01-01 → HF-DG01-01 NO aprobado; prohibido mapear automáticamente","Autoridad":"Fase 2 / Conocimiento"},
    {"Patrón":"ACQ-RQ","Alcance":al,"Excepción común":"Pregunta–variable declarada en pack; relación regla–pregunta de adquisición NO aprobada","Autoridad":"Conocimiento"}]
fam=[dict(zip(["Capacidad","HF","Texto","Localizador","Relación","Emisión"],r)) for r in rows('L3b_Familias_HF_K4')]
json.dump({"inputId":"KNOW-EXEC-04-L","lote":"LOTE-2","sourceFile":p.split('/')[-1],"sourceSha256":sha,
 "dictamen":"APTO CON RESERVAS · candidato documental · sin autorización de ejecución",
 "S1":S1,"S2":S2,"S3":S3,"hfFamiliesDocumental":fam},open('knowledge/staging/_inputs/KNOW-EXEC-04-L.lote2.json','w'),ensure_ascii=False,indent=2)
print(len(S1),len(S2),len(fam),sha)
