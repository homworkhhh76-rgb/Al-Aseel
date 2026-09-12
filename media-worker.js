// Cloudflare Worker gateway for R2 media.
// Bind an R2 bucket to this Worker as MEDIA_BUCKET.
// Optional variables: MEDIA_PUBLIC_BASE and UPLOAD_SECRET.
const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type,X-Upload-Secret'
};
export default {
  async fetch(request,env){
    const u=new URL(request.url);
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
    if(u.pathname==='/upload'&&request.method==='POST'){
      if(env.UPLOAD_SECRET && request.headers.get('X-Upload-Secret')!==env.UPLOAD_SECRET) return json({error:'unauthorized'},401);
      const fd=await request.formData(); const file=fd.get('file');
      if(!(file instanceof File)) return json({error:'file required'},400);
      if(file.size>120*1024) return json({error:'file too large'},413);
      const company=clean(fd.get('companyId')||'company');
      const key=`${company}/${Date.now()}-${crypto.randomUUID()}.webp`;
      await env.MEDIA_BUCKET.put(key,file.stream(),{httpMetadata:{contentType:file.type||'image/webp',cacheControl:'public, max-age=31536000, immutable'}});
      const base=(env.MEDIA_PUBLIC_BASE||`${u.origin}/media`).replace(/\/$/,'');
      return json({url:`${base}/${key}`});
    }
    if(u.pathname.startsWith('/media/')&&request.method==='GET'){
      const key=decodeURIComponent(u.pathname.slice('/media/'.length));
      const obj=await env.MEDIA_BUCKET.get(key); if(!obj)return new Response('Not found',{status:404,headers:cors});
      const h=new Headers(cors); obj.writeHttpMetadata(h); h.set('etag',obj.httpEtag); h.set('Cache-Control','public, max-age=31536000, immutable');
      return new Response(obj.body,{headers:h});
    }
    return new Response('R2 media gateway',{status:200,headers:cors});
  }
};
function clean(v){return String(v).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80)}
function json(v,status=200){return new Response(JSON.stringify(v),{status,headers:{...cors,'Content-Type':'application/json;charset=utf-8'}})}
