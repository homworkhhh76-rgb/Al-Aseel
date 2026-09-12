// Private media service. Deploy as a Cloudflare Worker and bind your R2 bucket as MEDIA_BUCKET.
// Keep credentials in the Worker/R2 binding or secret variables; never expose them in index.html.
const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type,X-Upload-Secret'
};
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{...cors,'Content-Type':'application/json;charset=utf-8'}});
const clean=v=>String(v||'').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80);
export default {
  async fetch(request,env){
    const u=new URL(request.url);
    const p=u.pathname.replace(/^\/media-api(?=\/|$)/,'');
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
    if(p==='/upload'&&request.method==='POST'){
      if(env.UPLOAD_SECRET && request.headers.get('X-Upload-Secret')!==env.UPLOAD_SECRET) return json({error:'unauthorized'},401);
      const fd=await request.formData();
      const file=fd.get('file');
      if(!(file instanceof File)) return json({error:'file required'},400);
      if(file.size>120*1024) return json({error:'file too large'},413);
      const company=clean(fd.get('companyId')||'company');
      const key=`${company}/${Date.now()}-${crypto.randomUUID()}.webp`;
      await env.MEDIA_BUCKET.put(key,file.stream(),{httpMetadata:{contentType:file.type||'image/webp',cacheControl:'public, max-age=31536000, immutable'}});
      const base=(env.MEDIA_PUBLIC_BASE||`${u.origin}/media-api/media`).replace(/\/$/,'');
      return json({url:`${base}/${key}`});
    }
    if(p.startsWith('/media/')&&request.method==='GET'){
      const key=decodeURIComponent(p.slice('/media/'.length));
      const obj=await env.MEDIA_BUCKET.get(key);
      if(!obj)return new Response('Not found',{status:404,headers:cors});
      const h=new Headers(cors);obj.writeHttpMetadata(h);h.set('etag',obj.httpEtag);h.set('Cache-Control','public, max-age=31536000, immutable');
      return new Response(obj.body,{headers:h});
    }
    return new Response('media service',{status:200,headers:cors});
  }
};
