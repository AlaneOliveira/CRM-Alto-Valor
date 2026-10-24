import pandas as pd, json, numpy as np
P='docs/anac-data/processed/'
c=pd.read_csv(P+'crm_customer_360_mvp.csv',sep=';',encoding='utf-8-sig')
f=pd.read_csv(P+'crm_flights_mvp.csv',sep=';',encoding='utf-8-sig')
f['route']=f.origin_icao+'-'+f.destination_icao
top=f.groupby('customer_id').route.agg(lambda s:s.value_counts().index[0]).to_dict()
def pct(s): return s.rank(pct=True,method='max')*100
sp=pct(c.spend_12m_brl); fq=pct(c.flights_12m)
rec=(100-c.recency_days/365*100).clip(0,100)
ts={'Basico':20,'Topazio':45,'Safira':72,'Diamante':100}
la=(c.clube_azul_subscriber*35+c.azul_itau_card*35+np.minimum(c.points_balance/30000*30,30)).clip(0,100)
gr=((c.flights_3m-c.flights_previous_3m)/np.maximum(1,c.flights_previous_3m))
gs=(50+gr*35).clip(0,100)
rows=[]
for i,r in c.iterrows():
    vc=[['Gasto 12m',30,sp[i]],['Frequência 12m',25,fq[i]],['Recência',15,rec[i]],['Tier',15,ts[r.tier_current]],['Ativos de fidelidade',10,la[i]],['Tendência',5,gs[i]]]
    hc=[['NPS',25,r.latest_nps*10],['Pontualidade',25,r.on_time_rate_12m*100],['Sem cancelamento',15,(1-r.cancellation_rate_12m)*100],['Engajamento',15,r.campaign_engagement_rate*100],['Resolução de reclamações',10,r.complaint_resolution_rate*100 if r.complaints_12m else 100],['Tendência',10,gs[i]]]
    rows.append(dict(id=r.customer_id,seg=r.synthetic_segment,tier=r.tier_current,city=r.home_city,uf=r.home_state,icao=r.home_airport_icao,
      club=int(r.clube_azul_subscriber),card=int(r.azul_itau_card),pts=int(r.points_balance),f3=int(r.flights_3m),f12=int(r.flights_12m),fp=int(r.flights_previous_3m),
      sp=round(r.spend_12m_brl),rec=int(r.recency_days),ot=r.on_time_rate_12m,cx=int(r.cancelled_flights_12m),dl=r.average_departure_delay_minutes,
      eng=r.campaign_engagement_rate,nps=int(r.latest_nps),V=r.customer_value_score,H=r.relationship_health_score,C=r.churn_risk_score,
      nbe=r.next_best_experience,why=r.next_best_experience_reason,ch=r.recommended_channel,cost=r.estimated_action_cost_brl,up=r.expected_retention_uplift_pct,
      route=top.get(r.customer_id,''),vc=[[a,b,round(x)] for a,b,x in vc],hc=[[a,b,round(x)] for a,b,x in hc]))
g=f.groupby('route').agg(n=('route','size'),canc=('cancelled','mean'),dl=('departure_delay_minutes','mean'),biz=('trip_purpose',lambda s:(s=='business').mean()),paid=('fare_paid_brl','mean'),ref=('fare_reference_brl','mean')).sort_values('n',ascending=False).head(12).reset_index()
routes=[dict(r=a.route,n=int(a.n),canc=round(a.canc,4),dl=round(a.dl,1),biz=round(a.biz,3),paid=round(a.paid),ref=round(a.ref)) for a in g.itertuples()]
json.dump(dict(c=rows,routes=routes,ref='2026-09-30'),open('prototype/data.json','w'),ensure_ascii=False,separators=(',',':'))
import os;print(os.path.getsize('prototype/data.json'))
