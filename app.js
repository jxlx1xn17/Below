/* MagicGlass v3.0 — independent camera illusion, no dependencies or analytics.
   Digital camouflage is rendered over a REAL card; one hidden trigger reveals the actual camera image. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const canvas=$('stage'), ctx=canvas.getContext('2d',{alpha:false,desynchronized:true}), video=$('camera');
 const ranks=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
 const suitMap={S:'♠',H:'♥',D:'♦',C:'♣'};
 const textureCache=new Map();
 const analyser=document.createElement('canvas'), ac=analyser.getContext('2d',{willReadFrequently:true});
 let W=innerWidth,H=innerHeight,dpr=1,stream=null,stageMode='demo';
 let realRank='Q',realSuit='H',fakeRank='4',fakeSuit='C',customImage=null;
 let cameraFacing='user',mirrored=true,flashEnabled=false,shakeEnabled=false,followEnabled=true;
 let performing=false,calibrating=false,revealed=false,revealAt=0,calPoints=[],hasCalibration=false;
 let quad=defaultQuad(),trackTemplates=null,lastFrame=0,frameCount=0;
 let trackerFailures=0,trackerFrames=0;
 let shakeLock=0,toastTimer=null,secretTimer=null;
 const clamp=(x,a,b)=>Math.min(Math.max(x,a),b);
 const ease=x=>1-Math.pow(1-x,3);
 const isRed=s=>s==='H'||s==='D';
 function defaultQuad(){
   const height=Math.min(H*.46,W*.9*1.4),width=height*600/840;
   const mx=W*.5,my=H*.45;
   return [{x:(mx-width/2)/W,y:(my-height/2)/H},{x:(mx+width/2)/W,y:(my-height/2)/H},
           {x:(mx+width/2)/W,y:(my+height/2)/H},{x:(mx-width/2)/W,y:(my+height/2)/H}];
 }
 function coverParams(srcW,srcH,destW,destH){
   const scale=Math.max(destW/srcW,destH/srcH),w=srcW*scale,h=srcH*scale;
   return [(destW-w)/2,(destH-h)/2,w,h];
 }
 function showToast(message){
   const el=$('toast');el.textContent=message;el.classList.add('visible');
   clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2900);
 }
 function setStatus(mode){
   $('statusText').textContent=mode==='camera'?(cameraFacing==='user'?'SELFIE LIVE':'RÜCKKAMERA LIVE'):'DEMO';
   $('statusDot').style.background=mode==='camera'?'#80e7b5':'#ffdb89';
 }
 function resize(){
   W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,1.6);
   canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
   ctx.setTransform(dpr,0,0,dpr,0,0);
   analyser.width=240;analyser.height=Math.max(100,Math.round(H/W*240));
 }
 function poly(points,context=ctx){
   context.beginPath();context.moveTo(points[0].x*W,points[0].y*H);
   for(let i=1;i<4;i++)context.lineTo(points[i].x*W,points[i].y*H);
   context.closePath();
 }
  function makeCard(r='A',s='S',isBack=false){
    const key=`${r}_${s}_${isBack}`;
    if(textureCache.has(key))return textureCache.get(key);
    const c=document.createElement('canvas');c.width=600;c.height=840;
    const p=c.getContext('2d');
    p.fillStyle='#fdfbf5';p.fillRect(0,0,600,840);
    p.save();p.strokeStyle='#a6aaa8';p.lineWidth=3;p.strokeRect(5,5,590,830);p.restore();
    if(isBack){
      p.fillStyle=s==='blue'?'#224d9a':'#a72a32';p.fillRect(20,20,560,800);
      p.strokeStyle='#f4e5c0';p.lineWidth=7;p.strokeRect(37,37,526,766);p.lineWidth=2;p.strokeRect(51,51,498,738);
      const cols=9,rows=13;
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
        const x=83+col*54,y=82+row*56;
        p.strokeStyle='#e8d7aa';p.lineWidth=1.5;
        p.beginPath();p.moveTo(x,y-20);p.lineTo(x+20,y);p.lineTo(x,y+20);p.lineTo(x-20,y);p.closePath();p.stroke();
        p.beginPath();p.arc(x,y,6,0,Math.PI*2);p.stroke();
      }
      p.fillStyle='#f0dfbc';p.beginPath();p.arc(300,420,79,0,Math.PI*2);p.fill();
      p.fillStyle=s==='blue'?'#224d9a':'#a72a32';p.font='bold 88px Georgia';p.textAlign='center';p.textBaseline='middle';p.fillText('✦',300,427);
      textureCache.set(key,c);return c;
    }
    const color=isRed(s)?'#c6242f':'#171e27',sym=suitMap[s];
    p.fillStyle=color;p.textAlign='center';p.textBaseline='middle';
    function corner(x,y,rot){
      p.save();p.translate(x,y);p.rotate(rot);
      p.font='bold 71px Georgia,serif';p.fillText(r,0,12);
      p.font='59px Georgia,serif';p.fillText(sym,0,78);p.restore();
    }
    corner(58,63,0);corner(542,777,Math.PI);
    if(['J','Q','K'].includes(r)){
      p.strokeStyle=color;p.lineWidth=4;p.strokeRect(114,161,372,518);
      p.fillStyle='#efdcad';p.fillRect(121,168,358,504);
      p.fillStyle='#385982';p.fillRect(133,181,334,478);
      p.save();p.translate(300,420);
      for(let i=0;i<9;i++){
        p.rotate(Math.PI/4.5);p.fillStyle=i%2?'#e4b35b':'#d6e2dc';
        p.beginPath();p.moveTo(0,-215);p.lineTo(38,-117);p.lineTo(0,-60);p.lineTo(-38,-117);p.closePath();p.fill();
      }
      p.fillStyle='#f6e7c7';p.beginPath();p.arc(0,0,120,0,Math.PI*2);p.fill();
      p.fillStyle=color;p.font='bold 186px Georgia';p.fillText(r,0,12);
      p.font='85px Georgia';p.fillText(sym,0,110);p.restore();
    } else if(r==='A'){
      p.font='330px Georgia,serif';p.fillText(sym,300,420);
    } else {
      const amount=Number(r),layouts={
        2:[[.5,.22],[.5,.78]],
        3:[[.5,.2],[.5,.5],[.5,.8]],
        4:[[.3,.23],[.7,.23],[.3,.77],[.7,.77]],
        5:[[.3,.22],[.7,.22],[.5,.5],[.3,.78],[.7,.78]],
        6:[[.3,.21],[.7,.21],[.3,.5],[.7,.5],[.3,.79],[.7,.79]],
        7:[[.3,.2],[.7,.2],[.5,.34],[.3,.5],[.7,.5],[.3,.8],[.7,.8]],
        8:[[.3,.2],[.7,.2],[.5,.33],[.3,.48],[.7,.48],[.5,.64],[.3,.8],[.7,.8]],
        9:[[.3,.18],[.7,.18],[.3,.38],[.7,.38],[.5,.5],[.3,.62],[.7,.62],[.3,.82],[.7,.82]],
        10:[[.3,.18],[.7,.18],[.5,.28],[.3,.38],[.7,.38],[.3,.62],[.7,.62],[.5,.72],[.3,.82],[.7,.82]]
      };
      p.font='112px Georgia,serif';
      for(const [x,y] of layouts[amount]||[])p.fillText(sym,120+x*360,105+y*630);
    }
    textureCache.set(key,c);return c;
  }
  function triangleImage(texture,src,dst,alpha){
    const [u0,v0,u1,v1,u2,v2]=src,[x0,y0,x1,y1,x2,y2]=dst;
    const det=(u0-u2)*(v1-v2)-(u1-u2)*(v0-v2);
    if(Math.abs(det)<1e-8)return;
    const a=((x0-x2)*(v1-v2)-(x1-x2)*(v0-v2))/det;
    const b=((y0-y2)*(v1-v2)-(y1-y2)*(v0-v2))/det;
    const c=((u0-u2)*(x1-x2)-(u1-u2)*(x0-x2))/det;
    const d=((u0-u2)*(y1-y2)-(u1-u2)*(y0-y2))/det;
    const e=x2-a*u2-c*v2,f=y2-b*u2-d*v2;
    ctx.save();ctx.globalAlpha=alpha;
    // Expand the triangle clip fractionally to avoid hairline seams at mesh edges.
    const cx=(x0+x1+x2)/3,cy=(y0+y1+y2)/3;
    const extrude=(x,y)=>{const d=Math.max(1,Math.hypot(x-cx,y-cy));return [x+(x-cx)*.8/d,y+(y-cy)*.8/d];};
    const p0=extrude(x0,y0),p1=extrude(x1,y1),p2=extrude(x2,y2);
    ctx.beginPath();ctx.moveTo(...p0);ctx.lineTo(...p1);ctx.lineTo(...p2);ctx.closePath();ctx.clip();
    ctx.transform(a,b,c,d,e,f);ctx.drawImage(texture,0,0);ctx.restore();
  }
  function projected(p,u,v){
    const topX=p[0].x*(1-u)+p[1].x*u,topY=p[0].y*(1-u)+p[1].y*u;
    const botX=p[3].x*(1-u)+p[2].x*u,botY=p[3].y*(1-u)+p[2].y*u;
    return [(topX*(1-v)+botX*v)*W,(topY*(1-v)+botY*v)*H];
  }
  function drawProjected(texture,points,alpha=1){
    if(alpha<=0.001||!texture)return;
    const X=3,Y=4,tw=texture.width,th=texture.height;
    for(let iy=0;iy<Y;iy++)for(let ix=0;ix<X;ix++){
      const u=ix/X,v=iy/Y,U=(ix+1)/X,V=(iy+1)/Y;
      const a=projected(points,u,v),b=projected(points,U,v),c=projected(points,U,V),d=projected(points,u,V);
      triangleImage(texture,[u*tw,v*th,U*tw,v*th,U*tw,V*th],[...a,...b,...c],alpha);
      triangleImage(texture,[u*tw,v*th,U*tw,V*th,u*tw,V*th],[...a,...c,...d],alpha);
    }
  }

 function drawCameraTo(target,tw,th){
   const [x,y,w,h]=coverParams(video.videoWidth,video.videoHeight,tw,th);
   target.save();
   if(cameraFacing==='user'&&mirrored){target.translate(tw,0);target.scale(-1,1);}
   target.drawImage(video,x,y,w,h);target.restore();
 }
 function drawDemo(){
   let g=ctx.createLinearGradient(0,0,W,H);
   g.addColorStop(0,'#394d47');g.addColorStop(1,'#142824');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
   ctx.globalAlpha=.07;ctx.strokeStyle='#d9f4e3';
   for(let x=-H;x<W+H;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+H*.25,H);ctx.stroke();}
   ctx.globalAlpha=1;
   ctx.save();ctx.filter='blur(15px)';ctx.fillStyle='#0007';
   poly(quad.map(p=>({x:p.x+.014,y:p.y+.015})));ctx.fill();ctx.restore();
   drawProjected(makeCard(realRank,realSuit),quad);
   if(!performing&&!calibrating){ctx.fillStyle='#fff9';ctx.font='600 11px sans-serif';ctx.textAlign='center';
      ctx.fillText('DEMO: PHYSISCH '+realRank+' '+suitMap[realSuit],W/2,Math.max(H*.16,96));}
 }
 function render(ts){
   requestAnimationFrame(render);
   if(lastFrame&&ts-lastFrame<30)return;
   lastFrame=ts;frameCount++;
   ctx.setTransform(dpr,0,0,dpr,0,0);
   if(stageMode==='camera'&&video.readyState>=2&&video.videoWidth>0){
     drawCameraTo(ctx,W,H);
     if(followEnabled&&trackTemplates&&!calibrating&&!revealed&&frameCount%2===0)trackCorners();
   }else drawDemo();
   let alpha=performing?(revealed?1-ease(clamp((ts-revealAt)/290,0,1)):1):1;
   if(calibrating)alpha=.55;
   drawProjected(customImage||makeCard(fakeRank,fakeSuit),quad,alpha);
   if(calibrating){
     ctx.lineWidth=2;ctx.strokeStyle='#a7f9d0';ctx.setLineDash([6,5]);poly(quad);ctx.stroke();ctx.setLineDash([]);
     quad.forEach((p,i)=>{ctx.beginPath();ctx.arc(p.x*W,p.y*H,5,0,Math.PI*2);ctx.fillStyle='#eafcf4';ctx.fill();});
     calPoints.forEach((p,i)=>{ctx.beginPath();ctx.arc(p.x*W,p.y*H,11,0,Math.PI*2);ctx.fillStyle='#8df6c2';ctx.fill();
       ctx.fillStyle='#072116';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(i+1,p.x*W,p.y*H);});
   }
   if(performing&&revealed&&flashEnabled){
     const t=(ts-revealAt)/340;
     $('flash').style.opacity=t>=0&&t<=1?String(.32*Math.sin(Math.PI*t)):'0';
   }else $('flash').style.opacity='0';
 }
 async function startCamera(){
   if(!navigator.mediaDevices?.getUserMedia){showToast('Kamera nur auf HTTPS oder localhost möglich.');return;}
   const btn=$('cameraBtn');btn.disabled=true;btn.textContent='Kamera wird gestartet …';
   const former=stream;
   if(former){former.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;}
   try{
     let s=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:cameraFacing},width:{ideal:1280},height:{ideal:720}}});
     stream=s;video.srcObject=s;await video.play();
     stageMode='camera';setStatus('camera');
     const active=s.getVideoTracks()[0]?.getSettings?.().facingMode;
     if(active==='user'||active==='environment')cameraFacing=active;
     btn.textContent='✓ Kamera läuft';$('switchCamera').textContent=cameraFacing==='user'?'↻ Zur Rückkamera wechseln':'↻ Zur Selfie-Kamera wechseln';
     $('cameraHint').textContent='Kamera aktiv. Im Bild werden keine Daten ins Internet übertragen.';
     trackTemplates=null;if(followEnabled&&hasCalibration)captureTemplates();showToast('Kamera bereit');
   }catch(e){
     btn.textContent='◎ Kamera starten';
     showToast(e.name==='NotAllowedError'?'Bitte den Kamerazugriff in Safari erlauben.':'Kamera konnte nicht gestartet werden: '+e.message);
   }finally{btn.disabled=false;}
 }
 function demoMode(){
   if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;}
   stageMode='demo';setStatus('demo');$('cameraBtn').textContent='◎ Selfie-Kamera starten';
   trackTemplates=null;showToast('Demokamera aktiv');
 }
 function trigger(){
   if(!performing||revealed)return;
   revealed=true;revealAt=performance.now();
   if(navigator.vibrate)navigator.vibrate(20);
 }
 function startPerformance(){
   if(calibrating)return;
   if(stageMode==='camera'&&!hasCalibration){showToast('Bitte zuerst die vier Kartenecken markieren.');return;}
   performing=true;revealed=false;revealAt=0;
   document.body.classList.add('performing');$('chrome').hidden=false;
   if(followEnabled)captureTemplates();
   $('toast').classList.remove('visible');
 }
 function stopPerformance(){
   performing=false;revealed=false;revealAt=0;
   document.body.classList.remove('performing');$('chrome').hidden=true;
   $('flash').style.opacity='0';
 }
 function startCalibration(){
   if(performing)return;
   calibrating=true;calPoints=[];
   document.body.classList.add('calibrating');$('calBar').hidden=false;updateCalText();
 }
 function updateCalText(){
   const names=['oben links','oben rechts','unten rechts','unten links'];
   $('calText').textContent=`Karten-Ecke ${calPoints.length+1}/4: ${names[calPoints.length]}`;
 }
 function endCalibration(){
   calibrating=false;document.body.classList.remove('calibrating');$('calBar').hidden=true;
   if(calPoints.length===4)hasCalibration=true;
   if(followEnabled&&hasCalibration)captureTemplates();
 }
 function chooseCorner(e){
   const rect=canvas.getBoundingClientRect();
   const x=clamp((e.clientX-rect.left)/rect.width,0,1),y=clamp((e.clientY-rect.top)/rect.height,0,1);
   calPoints.push({x,y});quad[calPoints.length-1]={x,y};
   if(calPoints.length===4){endCalibration();showToast('Karte ausgerichtet. Jetzt Vorführung starten.');}
   else updateCalText();
 }
 function readFrame(){
   if(stageMode!=='camera'||!video.videoWidth)return false;
   drawCameraTo(ac,analyser.width,analyser.height);return true;
 }
 function grayscale(imageData){
   const n=imageData.width*imageData.height,gray=new Uint8Array(n),raw=imageData.data;
   for(let i=0;i<n;i++)gray[i]=(raw[4*i]*3+raw[4*i+1]*6+raw[4*i+2])/10;
   return gray;
 }
 // Sparse video optical flow with perspective-consistent RANSAC. Tracks textured
 // features belonging to the physical card, not the rendered decoy image.
 const featureOffsets=[-4,-2,0,2,4];
 function inPoly(x,y,poly){
   let inside=false;
   for(let i=0,j=3;i<4;j=i++){
     const a=poly[i],b=poly[j];
     if((a.y>y)!==(b.y>y) && x < (b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
   }
   return inside;
 }
 function samplePatch(gray,w,h,x,y){
   if(x<5||y<5||x>=w-5||y>=h-5)return null;
   const vals=new Uint8Array(25);let n=0;
   for(const dy of featureOffsets)for(const dx of featureOffsets)vals[n++]=gray[(Math.round(y)+dy)*w+Math.round(x)+dx];
   return vals;
 }
 function featureCandidates(gray,w,h,points){
   const pix=points.map(p=>({x:p.x*w,y:p.y*h}));
   let x0=Math.max(7,Math.floor(Math.min(...pix.map(p=>p.x)))+2);
   let y0=Math.max(7,Math.floor(Math.min(...pix.map(p=>p.y)))+2);
   let x1=Math.min(w-8,Math.ceil(Math.max(...pix.map(p=>p.x)))-2);
   let y1=Math.min(h-8,Math.ceil(Math.max(...pix.map(p=>p.y)))-2);
   const features=[];
   for(let y=y0;y<y1;y+=4)for(let x=x0;x<x1;x+=4){
     if(!inPoly(x,y,pix))continue;
     // Corner-like details are more stable than featureless white card areas.
     let xx=0,yy=0,xy=0;
     for(let dy=-2;dy<=2;dy+=2)for(let dx=-2;dx<=2;dx+=2){
       const i=(y+dy)*w+x+dx;
       const gx=gray[i+1]-gray[i-1],gy=gray[i+w]-gray[i-w];
       xx+=gx*gx;yy+=gy*gy;xy+=gx*gy;
     }
     const det=xx*yy-xy*xy;
     const score=det/(xx+yy+1);
     if(score>70)features.push({x,y,score});
   }
   features.sort((a,b)=>b.score-a.score);
   const chosen=[];
   for(const f of features){
     if(chosen.every(p=>(p.x-f.x)**2+(p.y-f.y)**2>75)){
       chosen.push({x:f.x,y:f.y,patch:samplePatch(gray,w,h,f.x,f.y)});
       if(chosen.length>=42)break;
     }
   }
   return chosen;
 }
 function captureTemplates(){
   if(!readFrame()){trackTemplates=null;return;}
   const w=analyser.width,h=analyser.height,gray=grayscale(ac.getImageData(0,0,w,h));
   const features=featureCandidates(gray,w,h,quad);
   trackTemplates=features.length>=6?{features,gray,w,h}:null;
   trackerFailures=0;trackerFrames=0;
   if(!trackTemplates&&!performing)showToast('Zu wenig Kartenkontrast: gute Beleuchtung und sichtbare Kartendetails verwenden.');
 }
 function patchError(gray,w,x,y,template,best=Infinity){
   let sum=0,k=0;const px=Math.round(x),py=Math.round(y);
   for(const dy of featureOffsets)for(const dx of featureOffsets){
     sum+=Math.abs(gray[(py+dy)*w+px+dx]-template[k++]);
     if(sum>best)return sum;
   }
   return sum;
 }
 function coarseTranslation(gray,w,h,features){
   const subset=features.filter((_,i)=>i%Math.max(1,Math.floor(features.length/18))===0).slice(0,22);
   let bestScore=Infinity,tx=0,ty=0;
   for(let dy=-24;dy<=24;dy+=4)for(let dx=-24;dx<=24;dx+=4){
     const costs=[];
     for(const f of subset){
       const x=Math.round(f.x+dx),y=Math.round(f.y+dy);
       if(x<5||y<5||x>=w-5||y>=h-5)continue;
       costs.push(patchError(gray,w,x,y,f.patch)/25);
     }
     if(costs.length<6)continue;
     costs.sort((a,b)=>a-b);
     const n=Math.max(5,Math.floor(costs.length*.7));
     let total=0;for(let i=0;i<n;i++)total+=costs[i];
     const score=total/n;
     if(score<bestScore){bestScore=score;tx=dx;ty=dy;}
   }
   return {dx:tx,dy:ty,quality:bestScore};
 }
 function matchFeature(gray,w,h,feat,motion){
   let best=Infinity,bx=feat.x,by=feat.y;
   const cx=Math.round(feat.x+motion.dx),cy=Math.round(feat.y+motion.dy);
   for(let dy=-9;dy<=9;dy+=3)for(let dx=-9;dx<=9;dx+=3){
     const x=cx+dx,y=cy+dy;
     if(x<5||y<5||x>=w-5||y>=h-5)continue;
     const err=patchError(gray,w,x,y,feat.patch,best);
     if(err<best){best=err;bx=x;by=y;}
   }
   const ox=bx,oy=by;
   for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
     const x=ox+dx,y=oy+dy;
     if(x<5||y<5||x>=w-5||y>=h-5)continue;
     const err=patchError(gray,w,x,y,feat.patch,best);
     if(err<best){best=err;bx=x;by=y;}
   }
   return best/25<22?{x0:feat.x,y0:feat.y,x1:bx,y1:by,error:best/25}:null;
 }
 function linearSolve(matrix,vector){
   const n=vector.length,a=matrix.map((r,i)=>[...r,vector[i]]);
   for(let col=0;col<n;col++){
     let best=col;
     for(let row=col+1;row<n;row++)if(Math.abs(a[row][col])>Math.abs(a[best][col]))best=row;
     if(Math.abs(a[best][col])<1e-8)return null;
     [a[col],a[best]]=[a[best],a[col]];
     const inv=1/a[col][col];for(let j=col;j<=n;j++)a[col][j]*=inv;
     for(let i=0;i<n;i++)if(i!==col){
       const m=a[i][col];if(!m)continue;
       for(let j=col;j<=n;j++)a[i][j]-=m*a[col][j];
     }
   }
   return a.map(r=>r[n]);
 }
 function homography(matches){
   if(matches.length<4)return null;
   // Image coordinates are scaled to approximately [-1,1] for better conditioning.
   const rows=[],ys=[];
   for(const m of matches){
     const x=m.x0/120-1,y=m.y0/120-1,u=m.x1/120-1,v=m.y1/120-1;
     rows.push([x,y,1,0,0,0,-x*u,-y*u]);ys.push(u);
     rows.push([0,0,0,x,y,1,-x*v,-y*v]);ys.push(v);
   }
   const mat=Array.from({length:8},()=>new Array(8).fill(0)),vec=new Array(8).fill(0);
   for(let i=0;i<rows.length;i++)for(let j=0;j<8;j++){
     vec[j]+=rows[i][j]*ys[i];
     for(let k=0;k<8;k++)mat[j][k]+=rows[i][j]*rows[i][k];
   }
   return linearSolve(mat,vec);
 }
 function transfer(H,x,y){
   const xx=x/120-1,yy=y/120-1,d=H[6]*xx+H[7]*yy+1;
   if(!Number.isFinite(d)||Math.abs(d)<.08)return null;
   return {x:120*((H[0]*xx+H[1]*yy+H[2])/d+1),y:120*((H[3]*xx+H[4]*yy+H[5])/d+1)};
 }
 function estimateWarp(matches){
   if(matches.length<7)return null;
   let best=null,bestScore=-Infinity;
   // RANSAC rejects spurious points on fingers, the table, and moving shadows.
   for(let trial=0;trial<48;trial++){
     const picked=new Set();while(picked.size<4)picked.add(Math.floor(Math.random()*matches.length));
     const H=homography([...picked].map(i=>matches[i]));if(!H)continue;
     const inliers=[];let error=0;
     for(const m of matches){
       const p=transfer(H,m.x0,m.y0);
       if(!p)continue;
       const e=Math.hypot(p.x-m.x1,p.y-m.y1);
       if(e<3.6){inliers.push(m);error+=e;}
     }
     const score=inliers.length*10-error*.4;
     if(score>bestScore){best={H,inliers};bestScore=score;}
   }
   if(!best||best.inliers.length<Math.max(6,Math.ceil(matches.length*.45)))return null;
   const refined=homography(best.inliers)||best.H;
   return {H:refined,inliers:best.inliers};
 }
 function validQuad(q){
   if(q.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<-.3||p.y<-.3||p.x>1.3||p.y>1.3))return false;
   let twiceArea=0,sign=0;
   for(let i=0;i<4;i++){
     const a=q[i],b=q[(i+1)%4],c=q[(i+2)%4];
     twiceArea+=a.x*b.y-b.x*a.y;
     const cross=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);
     if(Math.abs(cross)<.0001)return false;
     if(sign&&Math.sign(cross)!==sign)return false;
     sign=Math.sign(cross);
   }
   return Math.abs(twiceArea)>.006&&Math.abs(twiceArea)<1.25;
 }
 function trackCorners(){
   if(!trackTemplates||!readFrame())return;
   const {w,h,features}=trackTemplates,gray=grayscale(ac.getImageData(0,0,w,h));
   const globalMotion=coarseTranslation(gray,w,h,features);
   const matches=[];
   for(const f of features){const m=matchFeature(gray,w,h,f,globalMotion);if(m)matches.push(m);}
   const result=estimateWarp(matches);
   if(!result){
     trackerFailures++;
     // Avoid a digital card visibly floating away when tracking is uncertain.
     if(trackerFailures>8){trackTemplates=null;if(!performing)showToast('Tracking verloren. Karte erneut ausrichten.');}
     return;
   }
   const newQuad=quad.map(p=>{const pp=transfer(result.H,p.x*w,p.y*h);return pp?{x:pp.x/w,y:pp.y/h}:null;});
   if(!validQuad(newQuad)){trackerFailures++;return;}
   trackerFailures=0;trackerFrames++;
   // Moderate smoothing for reduced flicker without anchoring to screen space.
   quad=quad.map((p,i)=>({x:p.x*.2+newQuad[i].x*.8,y:p.y*.2+newQuad[i].y*.8}));
   trackTemplates.features=result.inliers.map(m=>({x:m.x1,y:m.y1,patch:samplePatch(gray,w,h,m.x1,m.y1)})).filter(f=>f.patch);
   // Reacquire fresh salient points from the observed card while maintaining its identity.
   if(trackerFrames%8===0||trackTemplates.features.length<12){
     const fresh=featureCandidates(gray,w,h,quad);
     for(const f of fresh){
       if(trackTemplates.features.every(q=>(q.x-f.x)**2+(q.y-f.y)**2>80))trackTemplates.features.push(f);
       if(trackTemplates.features.length>=42)break;
     }
   }
 }
 function motion(e){
   if(!shakeEnabled||!performing||revealed)return;
   const a=e.accelerationIncludingGravity||e.acceleration;if(!a)return;
   const s=Math.hypot(a.x||0,a.y||0,a.z||0);
   if(s>22&&performance.now()-shakeLock>1600){shakeLock=performance.now();trigger();}
 }
 async function enableShake(on){
   if(!on){shakeEnabled=false;return;}
   if(!('DeviceMotionEvent' in window)){$('shakeToggle').checked=false;showToast('Kein Bewegungssensor verfügbar.');return;}
   if(typeof DeviceMotionEvent.requestPermission==='function'){
     try{if(await DeviceMotionEvent.requestPermission()!=='granted')throw Error('declined');}
     catch(e){$('shakeToggle').checked=false;showToast('Bewegungssensor nicht freigegeben.');return;}
   }
   shakeEnabled=true;showToast('Schütteln als Trigger aktiviert.');
 }
 function fillSelect(id,items,selected){
   const el=$(id);for(const [value,label] of items){const op=document.createElement('option');op.value=value;op.textContent=label;el.appendChild(op);}
   el.value=selected;
 }
 function init(){
   const rankItems=ranks.map(r=>[r,({A:'Ass',J:'Bube',Q:'Dame',K:'König'}[r]||r)]);
   const suitItems=[['S','♠ Pik'],['H','♥ Herz'],['D','♦ Karo'],['C','♣ Kreuz']];
   fillSelect('realRank',rankItems,realRank);fillSelect('realSuit',suitItems,realSuit);
   fillSelect('fakeRank',rankItems,fakeRank);fillSelect('fakeSuit',suitItems,fakeSuit);
   $('cameraBtn').addEventListener('click',startCamera);
   $('demoBtn').addEventListener('click',demoMode);
   $('switchCamera').addEventListener('click',()=>{cameraFacing=cameraFacing==='user'?'environment':'user';$('switchCamera').textContent=cameraFacing==='user'?'↻ Zur Rückkamera wechseln':'↻ Zur Selfie-Kamera wechseln';if(stageMode==='camera')startCamera();else showToast('Beim Start wird die andere Kamera verwendet.');});
   $('mirrorToggle').addEventListener('change',e=>{mirrored=e.target.checked;trackTemplates=null;hasCalibration=false;showToast('Kamera gespiegelt: Karte erneut kalibrieren.');});
   for(const id of ['realRank','realSuit','fakeRank','fakeSuit'])$(id).addEventListener('change',e=>{
     ({realRank:v=>realRank=v,realSuit:v=>realSuit=v,fakeRank:v=>fakeRank=v,fakeSuit:v=>fakeSuit=v})[id](e.target.value);
     if(id.startsWith('fake')){customImage=null;$('fakeUpload').value='';}
   });
   $('fakeUpload').addEventListener('change',e=>{
     const file=e.target.files?.[0];if(!file)return;
     if(!file.type.startsWith('image/')){showToast('Bitte ein Bild auswählen.');return;}
     const url=URL.createObjectURL(file),img=new Image();
     img.onload=()=>{
       const c=document.createElement('canvas');c.width=600;c.height=840;
       const p=c.getContext('2d'),scale=Math.max(600/img.naturalWidth,840/img.naturalHeight);
       const iw=img.naturalWidth*scale,ih=img.naturalHeight*scale;
       p.drawImage(img,(600-iw)/2,(840-ih)/2,iw,ih);customImage=c;
       URL.revokeObjectURL(url);showToast('Foto der Tarnkarte geladen.');
     };
     img.onerror=()=>{URL.revokeObjectURL(url);showToast('Bild konnte nicht geladen werden.');};img.src=url;
   });
   $('calibrateBtn').addEventListener('click',startCalibration);
   $('cancelCal').addEventListener('click',endCalibration);
   $('resetQuad').addEventListener('click',()=>{quad=defaultQuad();hasCalibration=false;trackTemplates=null;showToast('Kartenposition zurückgesetzt; bitte neu kalibrieren.');});
   $('trackToggle').addEventListener('change',e=>{followEnabled=e.target.checked;if(followEnabled){captureTemplates();showToast('Karten-Tracking aktiviert.');}else trackTemplates=null;});
   $('shakeToggle').addEventListener('change',e=>enableShake(e.target.checked));
   $('flashToggle').addEventListener('change',e=>flashEnabled=e.target.checked);
   $('performBtn').addEventListener('click',startPerformance);
   $('shutter').addEventListener('click',e=>{e.stopPropagation();trigger();});
   canvas.addEventListener('touchstart',e=>{if(performing&&e.touches.length===2){e.preventDefault();trigger();}},{passive:false});
   canvas.addEventListener('pointerup',e=>{if(calibrating)chooseCorner(e);else if(performing)trigger();});
   const zone=$('secretZone');
   zone.addEventListener('pointerdown',e=>{e.preventDefault();secretTimer=setTimeout(()=>{stopPerformance();secretTimer=null;},1000);});
   const clearSecret=()=>{if(secretTimer!==null)clearTimeout(secretTimer);secretTimer=null;};
   zone.addEventListener('pointerup',clearSecret);zone.addEventListener('pointercancel',clearSecret);zone.addEventListener('pointerleave',clearSecret);
   document.addEventListener('keydown',e=>{if(e.key==='Escape'&&performing)stopPerformance();else if((e.key===' '||e.key==='Enter')&&performing){e.preventDefault();trigger();}});
   window.addEventListener('devicemotion',motion);
   window.addEventListener('resize',()=>{resize();trackTemplates=null;hasCalibration=false;if(stageMode==='camera'&&!performing)showToast('Display geändert: bitte Karte neu kalibrieren.');});
   window.addEventListener('pagehide',()=>{if(stream)stream.getTracks().forEach(t=>t.stop());});
   resize();setStatus('demo');requestAnimationFrame(render);
   if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
 }
 init();
})();
