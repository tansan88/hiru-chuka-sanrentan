const U='http://localhost:'+(process.env.EMU_PORT||8790)+'/';
const A=async(a,o={})=>(await fetch(U,{method:'POST',body:JSON.stringify(Object.assign({action:a},o))})).json();
const X=async c=>(await (await fetch(U+'__exec',{method:'POST',body:c})).json());
let pass=0,fail=0;const ok=(c,m,x)=>{if(c)pass++;else{fail++;console.log('FAIL',m,JSON.stringify(x||''))}};
(async()=>{
 const h=await A('register',{nick:'H',pass:'0000'});await X("SS.getSheetByName('参加者').data.forEach(r=>{if(r[1]==='H')r[4]=true})");
 const g=(await A('register',{nick:'g',pass:'1111'})).token;
 let s=await A('state',{token:g});
 ok(s.me.canRefill===false && s.me.refillPt.quiz===5000 && s.me.refillPt.review===15000,'state初期',s.me);
 let r=await A('quizStart',{token:g}); ok(!r.ok && /100pt以上/.test(r.error),'持ち点ありでクイズ不可',r);
 r=await A('refill',{token:g,method:'quiz',score:3}); ok(!r.ok,'持ち点ありで補充不可',r);
 // 持ち点を0にする: 補充ptを-10000
 await X("SS.getSheetByName('参加者').data.forEach(r=>{if(r[1]==='g')r[5]=-10000})");
 s=await A('state',{token:g}); ok(s.me.balance===0 && s.me.canRefill && s.me.reviewed===false,'0pt',s.me);
 r=await A('quizStart',{token:g}); ok(r.ok && r.questions.length===3 && r.pt===5000,'クイズ開始',r);
 if(r.ok){ const q=r.questions; ok(q.every(x=>x.choices.length===4 && x.answer>=0 && x.answer<4 && x.q && x.note),'問題の形',q[0]);
   ok(new Set(q.map(x=>x.id)).size===3,'重複なし',q.map(x=>x.id)); }
 const d=await X("return SS.getSheetByName('クイズ').data.length"); ok(d.r===101,'クイズシート100問',d);
 r=await A('refill',{token:g,method:'quiz',score:0}); ok(r.ok && r.pt===5000 && r.balance===5000,'クイズ補充(全問はずれ)',r);
 s=await A('state',{token:g}); ok(s.me.balance===5000 && !s.me.canRefill,'補充後',s.me);
 r=await A('refill',{token:g,method:'quiz',score:3}); ok(!r.ok,'連続補充不可',r);
 // レビュー（初回）
 await X("SS.getSheetByName('参加者').data.forEach(r=>{if(r[1]==='g')r[5]=-9950})");
 s=await A('state',{token:g}); ok(s.me.balance===50 && s.me.canRefill,'50pt',s.me);
 r=await A('refill',{token:g,method:'review',answers:{understood:'すぐ分かった',body:'短い',bug:'なかった'}}); ok(!r.ok&&/20文字/.test(r.error),'短すぎ',r);
 r=await A('refill',{token:g,method:'review',answers:{understood:'すぐ分かった',body:'あいうえおかきくけこさしすせそたちつてと',bug:'あった',bugText:'  '}}); ok(!r.ok&&/内容/.test(r.error),'不具合の内容必須',r);
 r=await A('refill',{token:g,method:'review',answers:{understood:'ちがう',body:'あいうえおかきくけこさしすせそたちつてと',bug:'なかった'}}); ok(!r.ok,'選択肢外',r);
 r=await A('refill',{token:g,method:'review',answers:{understood:'少し迷った',body:'=1+1 あいうえおかきくけこさしすせそたちつてと',bug:'あった',bugText:'文字を大きくしたら崩れた',note:'TRUE'},device:'Mozilla/5.0 (Linux; Android 14)'}); ok(r.ok && r.pt===7500 && r.balance===7550,'初回レビュー（今週2回目なので半分）',r);
 const rv=await X("return SS.getSheetByName('レビュー').data[1]"); ok(rv.r && rv.r[3]==='初回' && rv.r[6]==="=1+1 あいうえおかきくけこさしすせそたちつてと" && rv.r[10]==='TRUE' && rv.r.length===11 && !/Android/.test(rv.r.join()),'レビュー行(文字のまま・端末は記録しない)',rv);
 // 2回目
 await X("SS.getSheetByName('参加者').data.forEach(r=>{if(r[1]==='g')r[5]=-10000})");
 s=await A('state',{token:g}); ok(s.me.balance===0 && s.me.reviewed===true,'2回目前',s.me);
 r=await A('refill',{token:g,method:'review',answers:{understood:'すぐ分かった',body:'あいうえおかきくけこさしすせそたちつてと',bug:'なかった'}}); ok(!r.ok,'2回目はテーマ必須',r);
 r=await A('refill',{token:g,method:'review',answers:{topic:'面白かった瞬間',balance:'ちょうどいい',body:'大穴に張った木曜だけ当たって配当が増えたとき',bug:'なかった',bugText:'無視される'}}); ok(r.ok && r.pt===3000 && r.balance===3000,'2回目レビュー（今週3回目なので2割）',r);
 const rv2=await X("return SS.getSheetByName('レビュー').data[2]"); ok(rv2.r[3]==='2回目以降' && rv2.r[5]==='面白かった瞬間' && rv2.r[7]==='ちょうどいい' && rv2.r[9]==='','2回目の行',rv2);
 // 設定で額を変える
 await X("SS.getSheetByName('設定').data.push(['クイズの補充pt',3000,''])");
 await X("SS.getSheetByName('参加者').data.forEach(r=>{if(r[1]==='g')r[5]=-35000})");
 r=await A('refill',{token:g,method:'quiz',score:2}); ok(r.ok && r.pt===600,'設定の補充額（3,000ptの2割）',r);
 r=await A('refill',{token:g,method:'xxx'}); ok(!r.ok,'方法不正',r);
 const hs=await A('hostState',{token:h.token}); ok(hs.ok && hs.refills.length===4 && hs.refills[0].method==='クイズ（2/3）・今週4回目','ホストの補充一覧',hs.refills);
 const sh=await X("return SS.getSheetByName('参加者').data.find(r=>r[1]==='g')[5]"); ok(sh.r===-35000+600,'補充pt列',sh);
 // クイズの「使う」を外すと出ない
 await X("const q=SS.getSheetByName('クイズ').data; for(let i=1;i<q.length;i++) q[i][10]= i<=3");
 await X("SS.getSheetByName('参加者').data.forEach(r=>{if(r[1]==='g')r[5]=-50000})");
 r=await A('quizStart',{token:g}); ok(r.ok && r.questions.map(x=>x.id).sort().join()==='1,2,3','使うの問題だけ',r.questions&&r.questions.map(x=>x.id));
 await X("const q=SS.getSheetByName('クイズ').data; q[1][10]=false");
 r=await A('quizStart',{token:g}); ok(!r.ok && /足りません/.test(r.error),'問題不足',r);
 console.log('PASS',pass,'FAIL',fail);
})();
