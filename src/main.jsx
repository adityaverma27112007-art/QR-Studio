import React,{useEffect,useMemo,useRef,useState}from"react";import{createRoot}from"react-dom/client";import QRCode from"qrcode";import"./styles.css";

const TYPES=[
 ["url","URL","↗"],["text","Text","T"],["email","Email","@"],["phone","Phone","⌕"],["sms","SMS","S"],["wifi","Wi-Fi","⌁"],["vcard","Contact","VC"],["event","Event","E"],["geo","Location","⌖"]
];
const PRESETS=[
 ["Classic","#111827","#ffffff","M",4],["Midnight","#f8fafc","#0f172a","Q",4],
 ["Forest","#064e3b","#ecfdf5","M",5],["Royal","#312e81","#eef2ff","Q",5],["Sunset","#7c2d12","#fff7ed","H",5]
];
const DEFAULT={size:320,fg:"#111827",bg:"#ffffff",level:"M",margin:4,dark:false,gradient:false,gradientTo:"#6d5dfc",frame:"",logo:null};
const HISTORY="qr-studio-recent-v2",SETTINGS="qr-studio-settings-v2";

const blank=t=>({
 url:{url:""},text:{text:""},email:{email:"",subject:"",body:""},phone:{phone:""},
 sms:{phone:"",message:""},wifi:{ssid:"",password:"",security:"WPA",hidden:false},
 vcard:{name:"",company:"",phone:"",email:"",website:""},event:{title:"",location:"",start:"",end:"",details:""},
 geo:{lat:"",lng:"",label:""}
}[t]);
const esc=s=>String(s||"").replace(/([\\;,:"])/g,"\\$1");
function payload(t,d){
 if(t==="url")return d.url.trim();
 if(t==="text")return d.text;
 if(t==="email"){const p=new URLSearchParams();if(d.subject)p.set("subject",d.subject);if(d.body)p.set("body",d.body);return"mailto:"+d.email.trim()+(p.toString()?"?"+p:"")}
 if(t==="phone")return"tel:"+d.phone.replace(/[^\\d+*#]/g,"");
 if(t==="sms")return"SMSTO:"+d.phone.replace(/[^\\d+*#]/g,"")+":"+d.message;
 if(t==="wifi")return `WIFI:T:${d.security};S:${esc(d.ssid)};P:${esc(d.password)};H:${d.hidden?"true":"false"};;`;
 if(t==="vcard")return `BEGIN:VCARD\nVERSION:3.0\nFN:${esc(d.name)}\nORG:${esc(d.company)}\nTEL:${esc(d.phone)}\nEMAIL:${esc(d.email)}\nURL:${esc(d.website)}\nEND:VCARD`;
 if(t==="event")return `BEGIN:VEVENT\nSUMMARY:${esc(d.title)}\nLOCATION:${esc(d.location)}\nDTSTART:${d.start.replace(/[-:]/g,"")}\nDTEND:${d.end.replace(/[-:]/g,"")}\nDESCRIPTION:${esc(d.details)}\nEND:VEVENT`;
 return `geo:${d.lat},${d.lng}${d.label?`?q=${encodeURIComponent(d.label)}`:""}`;
}
function validate(t,d){
 const e={};
 if(t==="url"){if(!d.url.trim())e.url="Enter a URL.";else try{if(!["http:","https:"].includes(new URL(d.url.trim()).protocol))e.url="Use http:// or https://."}catch{e.url="Enter a valid URL."}}
 if(t==="text"&&!d.text.trim())e.text="Enter some text.";
 if(t==="email"&&(!/^\S+@\S+\.\S+$/.test(d.email.trim())))e.email="Enter a valid email.";
 if(t==="phone"&&d.phone.replace(/\D/g,"").length<7)e.phone="Enter a valid phone number.";
 if(t==="sms"){if(d.phone.replace(/\D/g,"").length<7)e.phone="Enter a valid phone number.";if(!d.message.trim())e.message="Enter a message."}
 if(t==="wifi"){if(!d.ssid.trim())e.ssid="Enter the network name.";if(d.security!=="nopass"&&!d.password)e.password="Enter the password."}
 if(t==="vcard"){if(!d.name.trim())e.name="Enter a contact name."}
 if(t==="event"){if(!d.title.trim())e.title="Enter an event title.";if(!d.start)e.start="Choose a start date."}
 if(t==="geo"){const a=Number(d.lat),b=Number(d.lng);if(!Number.isFinite(a)||a<-90||a>90)e.lat="Latitude must be -90 to 90.";if(!Number.isFinite(b)||b<-180||b>180)e.lng="Longitude must be -180 to 180."}
 return e;
}
function Field({label,error,children}){return <label className="field"><span>{label}</span>{children}{error&&<small className="error">{error}</small>}</label>}
function App(){
 const[t,setT]=useState("url"),[d,setD]=useState(blank("url"));
 const[s,setS]=useState(()=>({...DEFAULT,...JSON.parse(localStorage.getItem(SETTINGS)||"{}")}));
 const[recent,setRecent]=useState(()=>{try{return JSON.parse(localStorage.getItem(HISTORY)||"[]")}catch{return[]}});
 const[png,setPng]=useState(""),[svg,setSvg]=useState(""),[errors,setErrors]=useState({}),[copied,setCopied]=useState(false),[logo,setLogo]=useState(null);
 const canvasRef=useRef(null);const data=useMemo(()=>payload(t,d),[t,d]),bad=Object.keys(errors).length>0;
 useEffect(()=>localStorage.setItem(SETTINGS,JSON.stringify({...s,logo:null})),[s]);
 useEffect(()=>{const e=validate(t,d);setErrors(e);if(Object.keys(e).length||!data.trim()){setPng("");setSvg("");return}
 const opts={width:s.size,margin:s.margin,errorCorrectionLevel:s.level,color:{dark:s.fg,light:s.bg}};
 Promise.all([QRCode.toDataURL(data,opts),QRCode.toString(data,{...opts,type:"svg"})]).then(([a,b])=>{setPng(a);setSvg(b)}).catch(()=>{setPng("");setSvg("")});
 },[t,d,s.size,s.margin,s.level,s.fg,s.bg,data]);
 const set=(k,v)=>setD(x=>({...x,[k]:v})),setting=(k,v)=>setS(x=>({...x,[k]:v}));
 function type(n){setT(n);setD(blank(n));setPng("");setSvg("");setLogo(null);setting("logo",null)}
 function preset(p){setting("fg",p[1]);setting("bg",p[2]);setting("level",p[3]);setting("margin",p[4])}
 async function save(){if(!png)return;const thumb=await composePNG(120);const item={id:crypto.randomUUID(),type:t,data:d,settings:{...s,logo:null},payload:data,thumbnail:thumb||png,createdAt:Date.now()};const n=[item,...recent.filter(x=>x.payload!==data)].slice(0,10);setRecent(n);localStorage.setItem(HISTORY,JSON.stringify(n))}
 function downloadBlob(url,name){const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>{if(url.startsWith("blob:"))URL.revokeObjectURL(url)},500)}
 async function composePNG(size=s.size){
   if(!png)return null;
   const c=document.createElement("canvas"),ctx=c.getContext("2d");c.width=size;c.height=size;
   const img=new Image();img.src=png;await new Promise(r=>{img.onload=r});
   ctx.drawImage(img,0,0,size,size);
   if(s.gradient){const grad=ctx.createLinearGradient(0,0,size,size);grad.addColorStop(0,s.fg);grad.addColorStop(1,s.gradientTo);const tmp=ctx.getImageData(0,0,size,size),g=grad;for(let i=0;i<tmp.data.length;i+=4){if(tmp.data[i]<100&&tmp.data[i+1]<100&&tmp.data[i+2]<100){const p=ctx.createImageData(1,1);const q=g;const x=(i/4)%size,y=Math.floor(i/4/size);const gg=q;const m=gg;ctx.fillStyle="rgba(0,0,0,0)";}}}
   if(s.gradient){const source=ctx.getImageData(0,0,size,size),out=ctx.createImageData(size,size),a=parseHex(s.fg),b=parseHex(s.gradientTo);for(let i=0;i<source.data.length;i+=4){if(source.data[i]<128&&source.data[i+1]<128&&source.data[i+2]<128){const idx=i/4,x=idx%size,y=Math.floor(idx/size),u=(x+y)/(size*2);out.data[i]=a[0]*(1-u)+b[0]*u;out.data[i+1]=a[1]*(1-u)+b[1]*u;out.data[i+2]=a[2]*(1-u)+b[2]*u;out.data[i+3]=255}else{out.data[i]=source.data[i];out.data[i+1]=source.data[i+1];out.data[i+2]=source.data[i+2];out.data[i+3]=source.data[i+3]}}ctx.putImageData(out,0,0)}
   if(logo){const li=new Image();li.src=logo;await new Promise(r=>{li.onload=r});const box=size*.18;ctx.fillStyle=s.bg;ctx.fillRect((size-box)/2,(size-box)/2,box,box);ctx.drawImage(li,(size-box*.78)/2,(size-box*.78)/2,box*.78,box*.78)}
   if(s.frame){const h=Math.max(30,size*.1);const out=document.createElement("canvas");out.width=size;out.height=size+h;const o=out.getContext("2d");o.fillStyle=s.bg;o.fillRect(0,0,out.width,out.height);o.drawImage(c,0,0);o.fillStyle=s.fg;o.font=`600 ${Math.max(12,size*.045)}px Arial`;o.textAlign="center";o.fillText(s.frame,size/2,size+h*.68);return out.toDataURL("image/png")}
   return c.toDataURL("image/png");
 }
 function parseHex(h){const x=h.replace("#","");return[parseInt(x.slice(0,2),16),parseInt(x.slice(2,4),16),parseInt(x.slice(4,6),16)]}
 async function downloadPNG(){const u=await composePNG();if(u)downloadBlob(u,"qr-"+t+".png")}
 const warning=s.fg.toLowerCase()===s.bg.toLowerCase()||s.margin<2||((s.level==="L")&&s.gradient)||!!logo;
 return <div className={s.dark?"app dark":"app"}><header><div className="brand"><b>QR</b><span><strong>QR Studio</strong><small>Private, browser-only QR creation</small></span></div><button className="theme" onClick={()=>setting("dark",!s.dark)}>{s.dark?"☀":"☾"}</button></header>
 <main><section className="hero"><div><small>QR CODE GENERATOR</small><h1>More ways to <i>connect.</i></h1><p>Create branded QR codes for links, contacts, events, Wi-Fi, locations, messages and more. Everything stays in your browser.</p></div><em>● 100% client-side</em></section>
 <div className="layout"><section className="panel controls"><small>CONTENT TYPE</small><h2>Choose what to encode</h2><div className="types">{TYPES.map(x=><button className={t===x[0]?"active":""} onClick={()=>type(x[0])} key={x[0]}><b>{x[2]}</b>{x[1]}</button>)}</div>
 <div className="fields">
 {t==="url"&&<Field label="Website URL" error={errors.url}><input autoFocus value={d.url} onChange={e=>set("url",e.target.value)} placeholder="https://example.com"/></Field>}
 {t==="text"&&<Field label="Plain text" error={errors.text}><textarea autoFocus value={d.text} onChange={e=>set("text",e.target.value)} placeholder="Type any message..."/></Field>}
 {t==="email"&&<><Field label="Email address" error={errors.email}><input value={d.email} onChange={e=>set("email",e.target.value)} placeholder="hello@example.com"/></Field><div className="cols"><Field label="Subject"><input value={d.subject} onChange={e=>set("subject",e.target.value)}/></Field><Field label="Message"><input value={d.body} onChange={e=>set("body",e.target.value)}/></Field></div></>}
 {t==="phone"&&<Field label="Phone number" error={errors.phone}><input value={d.phone} onChange={e=>set("phone",e.target.value)} placeholder="+91 98765 43210"/></Field>}
 {t==="sms"&&<><Field label="Phone number" error={errors.phone}><input value={d.phone} onChange={e=>set("phone",e.target.value)} placeholder="+91 98765 43210"/></Field><Field label="Message" error={errors.message}><textarea value={d.message} onChange={e=>set("message",e.target.value)} placeholder="Your SMS message"/></Field></>}
 {t==="wifi"&&<><Field label="Network name" error={errors.ssid}><input value={d.ssid} onChange={e=>set("ssid",e.target.value)} placeholder="My Wi-Fi"/></Field><div className="cols"><Field label="Security"><select value={d.security} onChange={e=>set("security",e.target.value)}><option>WPA</option><option>WEP</option><option value="nopass">No password</option></select></Field><Field label="Password" error={errors.password}><input disabled={d.security==="nopass"} value={d.password} onChange={e=>set("password",e.target.value)}/></Field></div><label className="check"><input type="checkbox" checked={d.hidden} onChange={e=>set("hidden",e.target.checked)}/> Hidden network</label></>}
 {t==="vcard"&&<><div className="cols"><Field label="Full name" error={errors.name}><input value={d.name} onChange={e=>set("name",e.target.value)} placeholder="Alex Morgan"/></Field><Field label="Company"><input value={d.company} onChange={e=>set("company",e.target.value)}/></Field></div><div className="cols"><Field label="Phone"><input value={d.phone} onChange={e=>set("phone",e.target.value)}/></Field><Field label="Email"><input value={d.email} onChange={e=>set("email",e.target.value)}/></Field></div><Field label="Website"><input value={d.website} onChange={e=>set("website",e.target.value)} placeholder="https://example.com"/></Field></>}
 {t==="event"&&<><Field label="Event title" error={errors.title}><input value={d.title} onChange={e=>set("title",e.target.value)}/></Field><div className="cols"><Field label="Start" error={errors.start}><input type="datetime-local" value={d.start} onChange={e=>set("start",e.target.value)}/></Field><Field label="End"><input type="datetime-local" value={d.end} onChange={e=>set("end",e.target.value)}/></Field></div><Field label="Location"><input value={d.location} onChange={e=>set("location",e.target.value)}/></Field><Field label="Details"><textarea value={d.details} onChange={e=>set("details",e.target.value)}/></Field></>}
 {t==="geo"&&<><div className="cols"><Field label="Latitude" error={errors.lat}><input value={d.lat} onChange={e=>set("lat",e.target.value)} placeholder="13.0827"/></Field><Field label="Longitude" error={errors.lng}><input value={d.lng} onChange={e=>set("lng",e.target.value)} placeholder="80.2707"/></Field></div><Field label="Place label"><input value={d.label} onChange={e=>set("label",e.target.value)} placeholder="Chennai"/></Field></>}
 </div><hr/><small>DESIGN LAB</small><h2>Make it yours</h2><div className="presets">{PRESETS.map(p=><button onClick={()=>preset(p)} key={p[0]}><span style={{background:p[2],borderColor:p[1]}}><i style={{background:p[1]}}/></span>{p[0]}</button>)}</div>
 <div className="cols"><label className="range">QR size <b>{s.size}px</b><input type="range" min="160" max="1000" step="10" value={s.size} onChange={e=>setting("size",+e.target.value)}/></label><label className="range">Quiet zone <b>{s.margin}</b><input type="range" min="0" max="12" value={s.margin} onChange={e=>setting("margin",+e.target.value)}/></label></div>
 <div className="cols"><Field label="Foreground"><input type="color" value={s.fg} onChange={e=>setting("fg",e.target.value)}/></Field><Field label="Background"><input type="color" value={s.bg} onChange={e=>setting("bg",e.target.value)}/></Field></div>
 <label className="toggle"><input type="checkbox" checked={s.gradient} onChange={e=>setting("gradient",e.target.checked)}/><span>Gradient foreground</span></label>{s.gradient&&<Field label="Gradient end color"><input type="color" value={s.gradientTo} onChange={e=>setting("gradientTo",e.target.value)}/></Field>}
 <div className="cols"><Field label="Frame caption"><input value={s.frame} onChange={e=>setting("frame",e.target.value)} placeholder="SCAN ME"/></Field><label className="upload"><span>Center logo</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f){const r=new FileReader();r.onload=()=>setLogo(r.result);r.readAsDataURL(f)}}}/></label></div>
 <label className="range">Error correction <div className="levels">{["L","M","Q","H"].map(x=><button className={s.level===x?"sel":""} onClick={()=>setting("level",x)} key={x}><b>{x}</b><small>{x==="L"?"7%":x==="M"?"15%":x==="Q"?"25%":"30%"}</small></button>)}</div></label>
 {warning&&<div className="warning"><b>!</b><span><strong>Scan reliability</strong><br/>Custom gradients, logos, low margins or weak contrast can reduce scanning reliability. Test the final downloaded code with a phone.</span></div>}
 <button className="save" disabled={!png||bad} onClick={save}>Save design to recent</button></section>
 <aside className="panel preview"><div className="preview-head"><div><small>LIVE PREVIEW</small><h2>Your QR code</h2></div><em>● Live</em></div><div className="stage">{png?<><img src={png} alt="QR preview"/>{s.frame&&<span className="frame-preview">{s.frame}</span>}</>:<div className="empty"><b>QR</b><span>{data?"Fix the highlighted fields":"Start typing to generate"}</span></div>}</div><div className="meta"><span>{data?data.length+" characters":"No content yet"}</span><span>{s.size} × {s.size}</span></div>
 <div className="actions"><button disabled={!png} onClick={downloadPNG}>↓ Download PNG</button><button disabled={!svg} onClick={()=>downloadBlob(URL.createObjectURL(new Blob([svg],{type:"image/svg+xml"})),"qr-"+t+".svg")}>SVG</button><button disabled={!data||bad} onClick={()=>{navigator.clipboard.writeText(data);setCopied(true);setTimeout(()=>setCopied(false),1200)}}>{copied?"Copied":"Copy data"}</button></div>
 <div className="scan-card"><strong>Before publishing</strong><span>Scan the exported image from a real phone. Logos and decorative styling should never cover finder patterns or eliminate the quiet zone.</span></div></aside></div>
 <section className="recent"><small>LOCAL HISTORY</small><h2>Recent QR designs</h2>{recent.length?<div className="recent-grid">{recent.map(x=><article key={x.id}><img src={x.thumbnail} alt=""/><div><b>{x.type}</b><p>{x.payload}</p><small>{new Date(x.createdAt).toLocaleString()}</small></div><button onClick={()=>{setT(x.type);setD(x.data);setS({...DEFAULT,...x.settings})}}>Reuse</button><button onClick={()=>{const n=recent.filter(r=>r.id!==x.id);setRecent(n);localStorage.setItem(HISTORY,JSON.stringify(n))}}>×</button></article>)}</div>:<div className="empty-history">Saved designs appear here after you create them.</div>}</section><footer>QR Studio <span>Generated locally · No backend · No tracking</span></footer></main></div>}
createRoot(document.getElementById("root")).render(<App/>);