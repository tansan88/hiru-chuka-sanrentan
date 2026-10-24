const U='http://localhost:'+(process.env.EMU_PORT||8790)+'/';
const A=async(a,o={})=>(await fetch(U,{method:'POST',body:JSON.stringify(Object.assign({action:a},o))})).json();
const X=async c=>(await (await fetch(U+'__exec',{method:'POST',body:c})).json()).r;
const res=[];const chk=(name,ok,detail)=>{res.push([ok?'OK':'NG',name,detail||'']);};
(async()=>{
 const h=await A('register',{nick:'H',pass:'0000'});await X("SS.getSheetByName('参加者').data.forEach(r=>{if(r[1]==='H')r[4]=true})");
 const hs=await A('hostState',{token:h.token});
 await A('saveWeek',{token:h.token,weekId:hs.suggest,raceName:'r',mumble:'',deadline:new Date(Date.now()+86400e3).toISOString(),menus:['a','b','c'].map((n,i)=>({waku:i+1,name:n})),publish:true});
 const g=(await A('register',{nick:'g',pass:'1111'})).token;
 const g2=(await A('register',{nick:'g2',pass:'2222'})).token;
 await A('predict',{token:g2,weekId:hs.suggest,picks:{火:1,水:2,木:3},bet:500});
 // ホスト専用操作をゲストで
 for(const [a,o] of [['hostState',{}],['saveWeek',{weekId:hs.suggest,raceName:'x',deadline:new Date().toISOString(),menus:[{waku:1,name:'x'},{waku:2,name:'y'}],publish:true}],['registerDay',{weekId:hs.suggest,day:'火',waku:1}],['settle',{weekId:hs.suggest}]]){
   const r=await A(a,Object.assign({token:g},o)); chk('ゲストで '+a,!r.ok&&/ホストだけ/.test(r.error),r.error);
 }
 // トークンなし・偽トークン
 for(const t of [undefined,'','xxxx',null]){ const r=await A('state',{token:t}); chk('偽トークン state '+JSON.stringify(t),!r.ok,r.error); }
 const r0=await A('saveWeek',{token:'nope',weekId:hs.suggest}); chk('偽トークン saveWeek',!r0.ok,r0.error);
 // ホスト権限の自己付与（registerに host:true など）
 const g3=(await A('register',{nick:'g3',pass:'3333',host:true,isHost:true})).token; const s3=await A('state',{token:g3}); chk('登録時にホストを名乗れない',s3.me.isHost===false);
 // 他人の予想・ハッシュが漏れないか
 const st=await A('state',{token:g}); const js=JSON.stringify(st);
 chk('stateに他人の予想がない',!/"g2"/.test(js)&&!js.includes('"bet":500'),'');
 const users=await X("return SS.getSheetByName('参加者').data.slice(1).map(r=>[r[2],r[3],r[7]])"); const leak=users.flat().filter(v=>v&&String(v).length>8&&js.includes(String(v)));
 chk('stateにパスワードのハッシュ・ソルト・他人の鍵がない',leak.length===0,leak.join(','));
 const hst=JSON.stringify(await A('hostState',{token:h.token})); chk('hostStateにハッシュ・鍵がない',users.flat().filter(v=>v&&String(v).length>8&&hst.includes(String(v))).length===0);
 // 他人になりすまして予想（tokenはサーバーで照合、uid指定は無視されるか）
 const st2=await X("return SS.getSheetByName('参加者').data.find(r=>r[1]==='g2')[0]");
 await A('predict',{token:g,weekId:hs.suggest,picks:{火:1,水:1,木:1},bet:100,uid:st2,id:st2,参加者ID:st2});
 const p2=await X("return SS.getSheetByName('予想').data.filter(r=>r[2]==='g2').map(r=>r[6])"); chk('他人の予想を書き換えられない',JSON.stringify(p2)==='[500]',JSON.stringify(p2));
 // 担当ホストは予想不可
 const rh=await A('predict',{token:h.token,weekId:hs.suggest,picks:{火:1,水:1,木:1},bet:100}); chk('担当ホストは予想できない',!rh.ok,rh.error);
 // 持ち点を超える・マイナス・小数
 for(const b of [-100,0,150,99999999,'1e3','100; DROP']){ const r=await A('predict',{token:g,weekId:hs.suggest,picks:{火:1,水:1,木:1},bet:b}); chk('不正なpt '+b,!r.ok||b==='1e3',r.error||'ok'); }
 // 存在しない枠
 const rw=await A('predict',{token:g,weekId:hs.suggest,picks:{火:9,水:1,木:1},bet:100}); chk('存在しない枠',!rw.ok,rw.error);
 // 不明な操作・内部関数
 for(const a of ['__proto__','constructor','toString','初期設定','backup_']){ const r=await A(a,{token:g}); chk('不明な操作 '+a,!r.ok,r.error); }
 // 持ち点ありで補充
 const rr=await A('refill',{token:g,method:'quiz',score:3}); chk('持ち点ありで補充不可',!rr.ok,rr.error);
 // 数式・スクリプト文字列の保存
 const evil='=IMAGE("x")';
 const ge=await A('register',{nick:evil,pass:'4444'}); const cell=await X("return SS.getSheetByName('参加者').data.find(r=>String(r[1]).includes('IMAGE'))[1]");
 chk('ニックネームの数式が文字のまま',ge.ok&&cell===evil,String(cell));
 const nick2='<img src=x onerror=alert(1)>'; const gx=(await A('register',{nick:nick2.slice(0,16),pass:'5555'})); chk('16文字超は弾く or 切る',gx.ok||/16文字/.test(gx.error),gx.error||'');
 console.log(res.map(r=>r.join(' | ')).join('\n')); console.log('NG',res.filter(r=>r[0]==='NG').length,'/',res.length);
})();
