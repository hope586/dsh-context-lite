import {randomUUID,createHash} from 'node:crypto';
const fingerprint=actor=>createHash('sha256').update(JSON.stringify(actor)).digest('hex').slice(0,16);
const usedActors=row=>new Set([...Object.values(row.events),...(row.evidence||[]).map(e=>e.record)].flatMap(v=>[v.actor,...(v.contributors||[]).map(c=>c.actor)]));
const pruneActors=row=>{const used=usedActors(row);for(const key of Object.keys(row.actors))if(!used.has(key))delete row.actors[key];};
/** Bounded metadata only. No prompt, tool arguments, body or stack is stored. */
export class OriginStore {
  constructor({maxSessions=64,maxRecords=2000}={}) {
    this.maxSessions=maxSessions;this.maxRecords=maxRecords;this.sessions=new Map();
    this.dirty=new Set();this.revision=0;this.table=null;this.timer=null;this.writes=Promise.resolve();
    this.storageError=false;this.closed=false;
    this.captureRunId=randomUUID();this.startedAt=Date.now();
  }
  session(id) {
    let value=this.sessions.get(id);
    if(!value){value=structuredClone(this.table?.get(id)||{actors:{},events:{},dropped:0});this.sessions.set(id,value);}
    else {this.sessions.delete(id);this.sessions.set(id,value);}
    while(this.sessions.size>this.maxSessions){const key=this.sessions.keys().next().value;if(this.dirty.has(key))this.enqueue(key);this.sessions.delete(key);}
    return value;
  }
  record(sessionId,seq,origin) {
    if(this.closed||!sessionId||!Number.isInteger(seq))return;
    const row=this.session(sessionId),{producer,contributors,...facts}=origin;
    const putActor=actor=>{const base=`${actor.type}:${actor.id}`;
      // A later plugin version/name must not rewrite earlier evidence identity.
      const key=!row.actors[base]||JSON.stringify(row.actors[base])===JSON.stringify(actor)?base:`${base}@${fingerprint(actor)}`;
      row.actors[key]={...actor};return key;};
    const value={...facts,...(producer?{actor:putActor(producer)}:{}),...(contributors?.length?{contributors:contributors.map(c=>{const {producer,...rest}=c;return {...rest,...(producer?{actor:putActor(producer)}:{})};})}:{})};
    if(JSON.stringify(row.events[seq])===JSON.stringify(value))return;
    row.events[seq]=value;row.updatedAt=Date.now();
    // Accepted evidence revisions are immutable within the declared retention
    // window. The events map remains a latest-value compatibility projection.
    row.evidence??=[];
    row.evidence.push({seq,observationId:randomUUID(),captureRunId:this.captureRunId,observedAt:row.updatedAt,record:structuredClone(value)});
    while(row.evidence.length>this.maxRecords){row.evidence.shift();row.droppedEvidence=(row.droppedEvidence||0)+1;}
    const seqs=Object.keys(row.events);
    while(seqs.length>this.maxRecords){delete row.events[seqs.shift()];row.dropped++;}
    pruneActors(row);
    this.revision++;this.dirty.add(sessionId);this.schedule();
  }
  originFor(sessionId,seq) {
    const row=this.session(sessionId),value=row.events[seq];if(!value)return undefined;
    const {actor,contributors,...rest}=value;
    return {...rest,...(actor?{producer:row.actors[actor]}:{}),...(contributors?{contributors:contributors.map(({actor,...c})=>({...c,...(actor?{producer:row.actors[actor]}:{})}))}:{})};
  }
  inspect(id) {const value=this.session(id);return {version:1,...structuredClone(value)};}
  attach(table) {
    this.table=table;
    for(const [id,row] of this.sessions){const old=table.get(id);if(old){
      const remap=new Map();
      for(const [key,actor] of Object.entries(row.actors))if(old.actors[key]&&JSON.stringify(old.actors[key])!==JSON.stringify(actor)){
        const next=`${actor.type}:${actor.id}@${fingerprint(actor)}`;remap.set(key,next);row.actors[next]=actor;delete row.actors[key];
      }
      const rewrite=record=>{if(remap.has(record.actor))record.actor=remap.get(record.actor);for(const c of record.contributors||[])if(remap.has(c.actor))c.actor=remap.get(c.actor);};
      for(const record of Object.values(row.events))rewrite(record);for(const entry of row.evidence||[])rewrite(entry.record);
      const evidence=[...new Map([...(old.evidence||[]),...(row.evidence||[])].map(e=>[e.observationId,e])).values()].sort((a,b)=>a.observedAt-b.observedAt);
      const removed=Math.max(0,evidence.length-this.maxRecords);
      const events={...old.events,...row.events},seqs=Object.keys(events),trimmed=Math.max(0,seqs.length-this.maxRecords);
      for(const seq of seqs.slice(0,trimmed))delete events[seq];
      const merged={actors:{...old.actors,...row.actors},events,evidence:evidence.slice(-this.maxRecords),dropped:Math.max(old.dropped||0,row.dropped||0)+trimmed,droppedEvidence:Math.max(old.droppedEvidence||0,row.droppedEvidence||0)+removed,updatedAt:Math.max(old.updatedAt||0,row.updatedAt||0)};pruneActors(merged);this.sessions.set(id,merged);
    }}
    this.revision++;
    this.schedule();
  }
  schedule() {if(!this.table||this.timer||this.closed)return;this.timer=setTimeout(()=>{this.timer=null;void this.flush();},100);this.timer.unref?.();}
  enqueue(id) {
    const row=this.sessions.get(id);if(!this.table||!row||!this.dirty.delete(id))return;
    const table=this.table,value=structuredClone(row);
    this.writes=this.writes.then(async()=>{
      await table.put(id,value);
      // This is our own metadata table, never the host's session or message log.
      if(table.entries&&table.delete){const rows=[...table.entries()].sort((a,b)=>(a[1].updatedAt||0)-(b[1].updatedAt||0));
        while(rows.length>this.maxSessions){const [key]=rows.shift();await table.delete(key);if(!this.dirty.has(key))this.sessions.delete(key);}
      }
    }).catch(()=>{this.storageError=true;});
  }
  async flush() {clearTimeout(this.timer);this.timer=null;for(const id of [...this.dirty])this.enqueue(id);await this.writes;}
  async close() {this.closed=true;await this.flush();this.sessions.clear();this.dirty.clear();this.table=null;}
}
