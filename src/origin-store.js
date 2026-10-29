/** Bounded metadata only. No prompt, tool arguments, body or stack is stored. */
export class OriginStore {
  constructor({maxSessions=64,maxRecords=2000}={}) {
    this.maxSessions=maxSessions;this.maxRecords=maxRecords;this.sessions=new Map();
    this.dirty=new Set();this.revision=0;this.table=null;this.timer=null;this.writes=Promise.resolve();
    this.storageError=false;this.closed=false;
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
    const putActor=actor=>{const key=`${actor.type}:${actor.id}`;row.actors[key]={...actor};return key;};
    const value={...facts,...(producer?{actor:putActor(producer)}:{}),...(contributors?.length?{contributors:contributors.map(c=>{const {producer,...rest}=c;return {...rest,...(producer?{actor:putActor(producer)}:{})};})}:{})};
    if(JSON.stringify(row.events[seq])===JSON.stringify(value))return;
    row.events[seq]=value;row.updatedAt=Date.now();
    const seqs=Object.keys(row.events);
    while(seqs.length>this.maxRecords){delete row.events[seqs.shift()];row.dropped++;}
    const used=new Set(Object.values(row.events).flatMap(v=>[v.actor,...(v.contributors||[]).map(c=>c.actor)]));
    for(const key of Object.keys(row.actors))if(!used.has(key))delete row.actors[key];
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
    for(const [id,row] of this.sessions){const old=table.get(id);if(old)this.sessions.set(id,{actors:{...old.actors,...row.actors},events:{...old.events,...row.events},dropped:Math.max(old.dropped||0,row.dropped||0),updatedAt:Math.max(old.updatedAt||0,row.updatedAt||0)});}
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
