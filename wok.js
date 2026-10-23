/* 読み込み中の中華鍋（真横から見た鍋を振って、具が跳ねる） */
(function(){
const BASE='assets/wok/';
const NAMES=['wok','flame','negi','shrimp'];
const IMG={};let loaded=0;
NAMES.forEach(n=>{const i=new Image();i.onload=()=>{loaded++};i.src=BASE+n+'.png';IMG[n]=i});
function tint(img,col){const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d');x.drawImage(img,0,0);x.globalCompositeOperation='source-in';x.fillStyle=col;x.fillRect(0,0,c.width,c.height);return c}
const rnd=(a,b)=>a+Math.random()*(b-a);
const ease=x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
const FOOD=['negi','shrimp','negi','shrimp','negi','negi','shrimp','negi','negi'];
const SIZE={egg:22,negi:16,shrimp:30};

const W=320,H=220;
const WOK={w:220,ox:40,oy:80,px:5,py:14,cx:145,rimY:34,rx:70};// 鍋の画像内の位置（描画サイズ換算）
const T=1.25;

function pose(p){// 鍋の動き：引く → 前に突き出してあおる → 戻る
  let dx=0,dy=0,rot=0;
  if(p<.3){const e=ease(p/.3);dx=-10*e;rot=.06*e}
  else if(p<.45){const e=ease((p-.3)/.15);dx=-10+24*e;dy=-10*e;rot=.06-.18*e}
  else{const e=ease((p-.45)/.55);dx=14*(1-e);dy=-10*(1-e);rot=-.12*(1-e)}
  return{dx,dy,rot};
}
function wokPoint(ps,x,y){// 鍋の画像内の点 → 画面上の点
  const X=WOK.ox+x-(WOK.ox+WOK.px),Y=WOK.oy+y-(WOK.oy+WOK.py);
  const c=Math.cos(ps.rot),s=Math.sin(ps.rot);
  return[WOK.ox+WOK.px+X*c-Y*s+ps.dx,WOK.oy+WOK.py+X*s+Y*c+ps.dy];
}
function grain(c,b){// パラパラのご飯粒（白い粒に黒い輪郭）
  c.save();c.translate(b.x,b.y);c.rotate(b.rot);c.beginPath();c.ellipse(0,0,4.3*b.k,2.5*b.k,0,0,Math.PI*2);
  c.fillStyle=b.egg?'#F7C23A':'#FBF3DC';c.fill();c.lineWidth=1.5;c.strokeStyle='#1E2622';c.stroke();c.restore()}
function drawItem(c,b){if(b.type==='grain')return grain(c,b);const im=IMG[b.type];if(!im.complete)return;const w=b.size,h=w*im.naturalHeight/im.naturalWidth;c.save();c.translate(b.x,b.y);c.rotate(b.rot);c.drawImage(im,-w/2,-h/2,w,h);c.restore()}

function make(){
  const S={parts:[],lp:0};
  return(c,t,dt)=>{
    c.clearRect(0,0,W,H);
    if(loaded<NAMES.length)return;
    const p=(t%T)/T,ps=pose(p);
    const [rcx,rcy]=wokPoint(ps,WOK.cx,WOK.rimY);
    // 炎（鍋の下でゆらめく）
    const fl=IMG.flame,fw=96,fh=fw*fl.naturalHeight/fl.naturalWidth;
    const sy=1+.08*Math.sin(t*17)+.05*Math.sin(t*29),sk=.06*Math.sin(t*11);
    c.save();c.translate(185,216);c.transform(1,0,sk,1,0,0);c.scale(1,sy);c.drawImage(fl,-fw/2,-fh,fw,fh);c.restore();
    // 具（鍋より先に描くので、ふちより下に落ちると鍋に隠れる）
    // 鍋の中の具：あおる直前に奥（右）へ寄り、跳んでいる間は鍋の中が空になる
    const inAir=p>.42&&p<.93;
    const slide=p<.25?0:p<.42?ease((p-.25)/.17):0;
    if(!S.bed)S.bed=Array.from({length:20},(_,i)=>({ox:rnd(-40,36),oy:rnd(1,6),rot:rnd(0,6),k:rnd(.85,1.1),egg:false}));
    if(!inAir){
      S.bed.forEach((g,i)=>grain(c,{x:rcx+g.ox+22*slide,y:rcy+g.oy-5*slide+1*Math.sin(t*10+i),rot:g.rot+ps.rot,k:g.k,egg:g.egg}));
      [[-12,'shrimp',-.3],[14,'negi',.4],[34,'negi',0]].forEach(([ox,type,r],i)=>drawItem(c,{x:rcx+ox+22*slide,y:rcy+8-5*slide+1.2*Math.sin(t*9+i),rot:r+ps.rot,type,size:SIZE[type]}));
    }
    // あおった瞬間：奥のふちから、ひとかたまりのまま手前へ円を描いて戻ってくる
    if(S.lp<.42&&p>=.42){
      const spin=-rnd(6,9);
      // 落ちる場所が必ず鍋の内側（手前寄り）になるよう、横の速さを逆算する
      const add=(o)=>{const x=rcx+rnd(16,54),vy=-rnd(265,320),tf=-2*vy/900+.02,land=rcx+rnd(-40,16);
        S.parts.push(Object.assign({x,y:rcy-rnd(0,10),vx:(land-x)/tf,vy,rot:rnd(0,6),vr:spin+rnd(-3,3),wait:rnd(0,.13)},o))};
      for(let i=0;i<100;i++)add({type:'grain',k:rnd(.8,1.15),egg:false});
      FOOD.forEach(type=>add({type,size:SIZE[type]*rnd(.85,1.1)}));
    }
    S.lp=p;
    S.parts=S.parts.filter(b=>{
      if(b.wait>0){b.wait-=dt;return true}
      b.vy+=900*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.rot+=b.vr*dt;
      if(b.vy>0&&b.y>=rcy+8)return false;// 鍋の中に戻った
      drawItem(c,b);return true});
    // 鍋
    c.save();c.translate(ps.dx,ps.dy);c.translate(WOK.ox+WOK.px,WOK.oy+WOK.py);c.rotate(ps.rot);c.translate(-(WOK.ox+WOK.px),-(WOK.oy+WOK.py));
    const ww=WOK.w,wh=ww*IMG.wok.naturalHeight/IMG.wok.naturalWidth;
    c.drawImage(IMG.wok,WOK.ox,WOK.oy,ww,wh);
    c.restore();
  };
}
window.startWok=function(cv){
  const c=cv.getContext('2d');const dpr=Math.min(2,window.devicePixelRatio||1);cv.width=W*dpr;cv.height=H*dpr;
  const fn=make();let run=true,last=performance.now();const t0=last;
  const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const loop=now=>{if(!run)return;const dt=Math.min(1/30,(now-last)/1000);last=now;c.setTransform(dpr,0,0,dpr,0,0);fn(c,still?.2:(now-t0)/1000,still?0:dt);requestAnimationFrame(loop)};
  requestAnimationFrame(loop);return()=>{run=false};
};
})();
