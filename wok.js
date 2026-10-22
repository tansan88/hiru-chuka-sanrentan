/* 読み込み中の中華鍋（横から見た鍋振り） */
(function(){
const TAU=Math.PI*2;
const rnd=(a,b)=>a+Math.random()*(b-a);
const ease=x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
const nz=(i,t)=>Math.sin(t*13+i*1.7)*.5+Math.sin(t*7.3+i*3.1)*.5;
const COL={rice:['#FFF7DF','#DCC995'],egg:['#F5C531','#D29E10'],green:['#4C9A3F','#367A2C'],pink:['#DE8384','#B9606A']};
const pick=()=>{const r=Math.random();return r<.68?'rice':r<.81?'egg':r<.92?'green':'pink'};
function bit(c,b,s=1){c.save();c.translate(b.x,b.y);c.rotate(b.rot);c.scale(s,s);const k=COL[b.type];c.fillStyle=k[0];c.strokeStyle=k[1];c.lineWidth=.7;c.beginPath();
  if(b.type==='rice')c.ellipse(0,0,2.5,1.5,0,0,TAU);else if(b.type==='egg')c.ellipse(0,0,2.9,2.2,.4,0,TAU);else if(b.type==='green')c.arc(0,0,1.7,0,TAU);else c.rect(-2.5,-1.6,5,3.2);
  c.fill();c.stroke();c.restore()}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function flame(c,x,base,h,w,sway,a=1){const g=c.createLinearGradient(0,base,0,base-h);g.addColorStop(0,`rgba(70,110,255,${.85*a})`);g.addColorStop(.22,`rgba(150,190,255,${.6*a})`);g.addColorStop(.32,`rgba(255,200,70,${.95*a})`);g.addColorStop(.7,`rgba(255,110,30,${.75*a})`);g.addColorStop(1,'rgba(255,70,20,0)');
  c.fillStyle=g;c.beginPath();c.moveTo(x-w,base);c.quadraticCurveTo(x-w*.7+sway*.4,base-h*.55,x+sway,base-h);c.quadraticCurveTo(x+w*.7+sway*.4,base-h*.55,x+w,base);c.closePath();c.fill()}

/* 鍋本体（横から） */
function drawWokSide(c,cx,ry,R,D,px,py,opt={}){
  c.lineCap='round';
  c.strokeStyle='#3A403D';c.lineWidth=8;c.beginPath();c.moveTo(cx-R+6,ry+3);c.lineTo(cx-R-26,ry+7);c.stroke();
  const wood=c.createLinearGradient(px,py-5,px,py+5);wood.addColorStop(0,'#B98250');wood.addColorStop(.5,'#9A6A3A');wood.addColorStop(1,'#71461F');
  c.strokeStyle=opt.dark?'#1a1310':wood;c.lineWidth=11;c.beginPath();c.moveTo(cx-R-24,ry+7);c.lineTo(px,py);c.stroke();
  c.beginPath();c.ellipse(cx,ry,R,D,0,0,Math.PI);c.closePath();
  const g=c.createRadialGradient(cx-R*.3,ry+D*.2,6,cx,ry+D*.3,R*1.05);
  if(opt.dark){g.addColorStop(0,'#2a211c');g.addColorStop(1,'#060504')}else{g.addColorStop(0,'#77817D');g.addColorStop(.45,'#323937');g.addColorStop(1,'#121615')}
  c.fillStyle=g;c.fill();
  const heat=c.createRadialGradient(cx,ry+D,4,cx,ry+D,R*.9);heat.addColorStop(0,`rgba(255,120,40,${opt.dark?.5:.3})`);heat.addColorStop(1,'rgba(255,120,40,0)');c.fillStyle=heat;c.fill();
  c.strokeStyle=opt.dark?'rgba(255,150,70,.35)':'rgba(255,255,255,.16)';c.lineWidth=3;c.beginPath();c.ellipse(cx,ry,R-10,D-10,0,.2,1.05);c.stroke();
  c.beginPath();c.ellipse(cx,ry,R,8,0,0,TAU);c.fillStyle=opt.dark?'#0b0807':'#181C1B';c.fill();c.strokeStyle=opt.dark?'rgba(255,150,70,.8)':'#8E9894';c.lineWidth=1.8;c.stroke();
}

const loaders={};
/* 1 横から見た鍋振り */
loaders.w1=()=>{const S={parts:[],steam:[],lp:0,bed:[],st:0};
  for(let i=0;i<110;i++)S.bed.push({u:rnd(-1,1),v:Math.random(),type:pick(),rot:rnd(0,3)});
  return (c,t,dt)=>{const W=320,H=220;
    const bg=c.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#FFF9EF');bg.addColorStop(1,'#F3E6D2');c.fillStyle=bg;c.fillRect(0,0,W,H);
    c.fillStyle='rgba(120,90,60,.08)';c.beginPath();c.ellipse(170,214,120,8,0,0,TAU);c.fill();
    const P=1.3,p=(t%P)/P;let ang,dx;
    if(p<.35){const k=ease(p/.35);ang=.1*k;dx=-6*k}else if(p<.48){const k=ease((p-.35)/.13);ang=.1-.42*k;dx=-6+14*k}else{const k=ease((p-.48)/.52);ang=-.32*(1-k);dx=8*(1-k)}
    const boost=p>.36&&p<.66?Math.sin((p-.36)/.3*Math.PI):0;
    for(let i=0;i<9;i++){const x=126+i*11;flame(c,x,200,30+12*nz(i,t)+42*boost*(1-Math.abs(i-4)/5.5),9,6*nz(i+5,t*1.3))}
    c.fillStyle='#2A2F2D';rr(c,100,197,140,9,3);c.fill();c.fillStyle='#1B1F1E';rr(c,72,205,196,10,3);c.fill();
    const cx=170,ry=116,R=78,D=40,px=34,py=126;
    const tf=(x,y)=>{const co=Math.cos(ang),si=Math.sin(ang),X=x-px,Y=y-py;return[px+X*co-Y*si+dx,py+X*si+Y*co]};
    if(S.lp<.42&&p>=.42){for(let i=0;i<46;i++){const u=rnd(.2,.85),[x,y]=tf(cx+R*u,ry+rnd(-2,3));S.parts.push({x,y,vx:-rnd(40,150)*u,vy:-rnd(240,380),rot:rnd(0,6),vr:rnd(-12,12),type:pick()})}}
    S.lp=p;
    c.save();c.translate(dx,0);c.translate(px,py);c.rotate(ang);c.translate(-px,-py);
    drawWokSide(c,cx,ry,R,D,px,py);
    c.beginPath();c.ellipse(cx,ry+1,R*.78*(1-boost*.25),5.5,0,0,TAU);c.fillStyle='#EED28A';c.fill();
    S.bed.forEach((b,i)=>{if(boost>.3&&i%3===0)return;bit(c,{x:cx+b.u*R*.72*(1-boost*.25),y:ry+1+(b.v-.5)*7,rot:b.rot,type:b.type},.95)});
    c.restore();
    S.st+=dt;if(S.st>.12){S.st=0;S.steam.push({x:cx+rnd(-50,50),y:ry-4,r:rnd(5,9),a:.22,vx:rnd(-8,8)})}
    S.steam=S.steam.filter(s=>{s.y-=28*dt;s.x+=s.vx*dt;s.r+=10*dt;s.a-=.12*dt;if(s.a<=0)return false;const g=c.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r);g.addColorStop(0,`rgba(255,255,255,${s.a})`);g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.beginPath();c.arc(s.x,s.y,s.r,0,TAU);c.fill();return true});
    S.parts=S.parts.filter(b=>{b.vy+=900*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.rot+=b.vr*dt;if(b.vy>0&&b.y>=ry+3&&Math.abs(b.x-cx)<R*.8)return false;if(b.y>H+10)return false;bit(c,b,1.15);return true});
  }};
window.startWok=function(cv){
  const c=cv.getContext('2d');const dpr=Math.min(2,window.devicePixelRatio||1);cv.width=320*dpr;cv.height=220*dpr;
  const fn=loaders.w1();let run=true,last=performance.now();const t0=last;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){c.setTransform(dpr,0,0,dpr,0,0);for(let k=0;k<30;k++)fn(c,.55+k/60,1/60);return()=>{}}
  const loop=now=>{if(!run)return;const dt=Math.min(1/30,(now-last)/1000);last=now;c.setTransform(dpr,0,0,dpr,0,0);fn(c,(now-t0)/1000,dt);requestAnimationFrame(loop)};
  requestAnimationFrame(loop);return()=>{run=false};
};
})();
