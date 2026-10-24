const U='http://localhost:'+(process.env.EMU_PORT||8790)+'/';
const A=async(action,o={})=>{const r=await fetch(U,{method:'POST',body:JSON.stringify(Object.assign({action},o))});return r.json()};
const X=async(code)=>{const r=await fetch(U+'__exec',{method:'POST',body:code});return (await r.json()).r};
let pass=0,fail=0;const out=[];
const ok=(name,cond,info)=>{if(cond){pass++}else{fail++;out.push('FAIL '+name+' '+JSON.stringify(info||'').slice(0,400))}};
const day=86400e3;
(async()=>{
 // 時計を「次の火曜の前の週の金曜 10:00」相当に合わせる：今日基準でそのまま使う
 await X('setOffset(0)');
 // --- 登録・ログイン ---
 await A('register',{nick:'001',pass:'1234'});const n001=await A('login',{nick:'001',pass:'1234'}); ok('数字だけのニックネーム「001」でログインできる',n001.ok,n001);
 for(const nk of ['0123','1/2','TRUE','=1+1','1e3','-5','  space  ']){const r=await A('register',{nick:nk,pass:'1111'});const l=await A('login',{nick:nk.trim(),pass:'1111'});ok('ニックネーム「'+nk+'」で登録→ログイン',r.ok&&l.ok,{r,l});}
 ok('同じニックネームは登録できない',!(await A('register',{nick:'0123',pass:'1111'})).ok);
 ok('パスワード3桁は不可',!(await A('register',{nick:'x3',pass:'123'})).ok);
 ok('パスワード英字は不可',!(await A('register',{nick:'x4',pass:'abcd'})).ok);
 ok('17文字は不可',!(await A('register',{nick:'あ'.repeat(17),pass:'1111'})).ok);
 ok('空は不可',!(await A('register',{nick:'   ',pass:'1111'})).ok);
 const h=await A('register',{nick:'ホスト',pass:'0000'}); ok('ホスト登録',h.ok,h);
 ok('パスワード0000でログイン',(await A('login',{nick:'ホスト',pass:'0000'})).ok);
 ok('違うパスワードは不可',!(await A('login',{nick:'ホスト',pass:'0001'})).ok);
 // ホストにする
 await X("const s=SS.getSheetByName('参加者');s.data.forEach((r,i)=>{if(r[1]==='ホスト')r[4]=true});");
 const g=[];for(let i=0;i<4;i++){g.push((await A('register',{nick:'g'+i,pass:'2222'})).token)}
 ok('ゲストはホスト操作不可',!(await A('hostState',{token:g[0]})).ok);
 const hs=await A('hostState',{token:h.token}); ok('hostState',hs.ok&&hs.suggest,hs);
 const wk=hs.suggest; const tue=new Date(wk+'T00:00'); ok('提案される週は火曜',tue.getDay()===2,wk);
 // --- 出馬表 ---
 const fut=new Date(Date.now()+2*day).toISOString();
 const menus=[{waku:1,name:'麻婆ナス'},{waku:2,name:''},{waku:3,name:'=SUM(1,2)'},{waku:4,name:'001'},{waku:7,name:'天津飯'},{waku:9,name:'中華丼'}];
 let r=await A('saveWeek',{token:h.token,weekId:wk,raceName:'TRUE',mumble:'+81',deadline:fut,menus,publish:false}); ok('下書き保存',r.ok,r);
 let H=await A('hostState',{token:h.token});
 ok('枠が1から連番',JSON.stringify(H.week.menus.map(m=>m.waku).sort())==='[1,2,3,4,5]',H.week.menus);
 ok('品名が文字のまま残る（=SUM・001）',H.week.menus.some(m=>m.name==='=SUM(1,2)')&&H.week.menus.some(m=>m.name==='001'),H.week.menus.map(m=>m.name));
 ok('レース名・つぶやきが文字のまま',H.week.raceName==='TRUE'&&H.week.mumble==='+81',{rn:H.week.raceName,mu:H.week.mumble});
 ok('火曜以外は不可',!(await A('saveWeek',{token:h.token,weekId:'2026-10-28',raceName:'a',deadline:fut,menus,publish:false})).ok);
 ok('1品は不可',!(await A('saveWeek',{token:h.token,weekId:wk,raceName:'a',deadline:fut,menus:[{waku:1,name:'a'}],publish:false})).ok);
 ok('締切なしは不可',!(await A('saveWeek',{token:h.token,weekId:wk,raceName:'a',deadline:'',menus,publish:false})).ok);
 const st0=await A('state',{token:g[0]}); ok('下書きはゲストに見えない',st0.ok&&!st0.current,st0);
 H=await A('hostState',{token:h.token});
 const M=H.week.menus.map(m=>({waku:m.waku,name:m.name}));
 r=await A('saveWeek',{token:h.token,weekId:wk,raceName:'昼中華ステークス',mumble:'',deadline:fut,menus:M,publish:true}); ok('公開',r.ok,r);
 let s=await A('state',{token:g[0]}); ok('公開後ゲストに見える',s.current&&s.current.menus.length===5,s);
 ok('第1回',s.current&&s.current.title.startsWith('第1回'),s.current&&s.current.title);
 // --- 予想 ---
 const P=(t,a,b,c,bet)=>A('predict',{token:t,weekId:wk,picks:{火:a,水:b,木:c},bet});
 ok('担当ホストは予想不可',!(await P(h.token,1,1,1,100)).ok);
 ok('使うpt 150は不可',!(await P(g[0],1,2,3,150)).ok);
 ok('使うpt 0は不可',!(await P(g[0],1,2,3,0)).ok);
 ok('持ち点超えは不可',!(await P(g[0],1,2,3,10100)).ok);
 ok('存在しない枠は不可',!(await P(g[0],1,2,9,100)).ok);
 ok('日の欠けは不可',!(await A('predict',{token:g[0],weekId:wk,picks:{火:1,水:2},bet:100})).ok);
 r=await P(g[0],1,2,3,1000); ok('予想できる',r.ok,r);
 r=await P(g[0],1,2,4,10000); ok('予想の変更（前の分は戻して判定）',r.ok,r);
 s=await A('state',{token:g[0]}); ok('持ち点=0',s.me.balance===0,s.me);
 r=await P(g[0],1,2,4,2000); s=await A('state',{token:g[0]}); ok('変更後の持ち点=8000',r.ok&&s.me.balance===8000,{r,b:s.me.balance});
 const predRows=await X("return SS.getSheetByName('予想').data.length");ok('予想の行は1人1行',predRows===2,predRows);
 await P(g[1],1,1,1,1000); await P(g[2],5,5,5,500); await P(g[3],1,3,5,100);
 s=await A('state',{token:g[0]}); ok('オッズが動く',s.current.menus.find(m=>m.waku===1).odds<2,s.current.menus);
 ok('予想後はメニューを変えられない',!(await A('saveWeek',{token:h.token,weekId:wk,raceName:'昼中華ステークス',mumble:'',deadline:fut,menus:M.slice(0,4),publish:true})).ok);
 r=await A('saveWeek',{token:h.token,weekId:wk,raceName:'昼中華ステークス',mumble:'つぶやき変更',deadline:fut,menus:M,publish:true}); ok('予想後でもつぶやきは変えられる',r.ok,r);
 ok('締切前は結果を登録できない',!(await A('registerDay',{token:h.token,weekId:wk,day:'火',waku:1})).ok);
 // --- 締切を過ぎる ---
 await X('setOffset('+(3*day)+')');
 ok('締切後は予想不可',!(await P(g[1],2,2,2,100)).ok);
 ok('締切後は締切を動かせない',!(await A('saveWeek',{token:h.token,weekId:wk,raceName:'昼中華ステークス',mumble:'',deadline:new Date(Date.now()+day).toISOString(),menus:M,publish:true})).ok);
 s=await A('state',{token:g[0]}); ok('締切後は closed',s.current.closed===true&&!s.current.oddsLive,s.current);
 ok('3日分そろわないと確定不可',!(await A('settle',{token:h.token,weekId:wk})).ok);
 const photo=Buffer.from('fakejpeg').toString('base64');
 r=await A('registerDay',{token:h.token,weekId:wk,day:'火',waku:1,photo:{data:photo,mime:'image/jpeg'}}); ok('火の登録（写真付き）',r.ok,r);
 r=await A('registerDay',{token:h.token,weekId:wk,day:'水',waku:2}); ok('水の登録',r.ok,r);
 r=await A('registerDay',{token:h.token,weekId:wk,day:'水',waku:3}); ok('水の登録し直し',r.ok,r);
 r=await A('registerDay',{token:h.token,weekId:wk,day:'木',waku:4}); ok('木の登録',r.ok,r);
 ok('存在しない枠は登録不可',!(await A('registerDay',{token:h.token,weekId:wk,day:'木',waku:9})).ok);
 ok('曜日がおかしいと不可',!(await A('registerDay',{token:h.token,weekId:wk,day:'金',waku:1})).ok);
 const res=await X("return SS.getSheetByName('結果').data.slice(1).map(r=>r.slice(0,5))"); ok('結果は1日1行',res.length===3,res);
 s=await A('state',{token:g[0]}); ok('写真URLが出る',!!s.current.results['火'].photo,s.current.results);
 const before=s.current.menus.map(m=>m.odds);
 r=await A('settle',{token:h.token,weekId:wk}); ok('確定',r.ok&&r.status==='確定',r);
 ok('二重確定は不可',!(await A('settle',{token:h.token,weekId:wk})).ok);
 const st=await A('state',{token:g[0]});
 ok('確定後 lastResult',st.lastResult&&st.lastResult.settle,st.lastResult);
 // g0: 火1 水2 木4 bet2000; 結果 火1 水3 木4 -> 火・木的中
 const om={};before.forEach((o,i)=>om[s.current.menus[i].waku]=o);
 const exp=Math.floor(2000/3*om[1])+Math.floor(2000/3*om[4]);
 ok('g0 の獲得pt（締切時点の倍率）',st.lastResult.settle.total===exp,{got:st.lastResult.settle,exp,om});
 ok('g0 の持ち点',st.me.balance===8000+exp,{b:st.me.balance,exp:8000+exp});
 ok('確定後の倍率が変わらない',JSON.stringify(st.lastResult.menus.map(m=>m.odds))===JSON.stringify(before),{a:st.lastResult.menus.map(m=>m.odds),before});
 const kak=await X("return SS.getSheetByName('メニュー').data.slice(1).map(r=>r[5])"); ok('確定オッズが記録される',kak.every(x=>typeof x==='number'),kak);
 const his=await A('history',{token:g[0]}); ok('過去の結果',his.ok&&his.list&&his.list.length===1,his);
 const wv=await A('week',{token:g[0],weekId:wk}); ok('週の内訳',wv.ok,wv);
 // --- 次の週 ---
 const hs2=await A('hostState',{token:h.token}); ok('次の週の提案は1週間後',hs2.suggest>wk,{s:hs2.suggest,wk});
 const wk2=hs2.suggest;
 r=await A('saveWeek',{token:h.token,weekId:wk2,raceName:'昼中華ステークス',mumble:'',deadline:new Date(Date.now()+5*day).toISOString(),menus:[{waku:1,name:'a'},{waku:2,name:'b'},{waku:3,name:'c'}],publish:true}); ok('2週目公開',r.ok,r);
 s=await A('state',{token:g[0]}); ok('第2回',s.current&&s.current.title.startsWith('第2回'),s.current&&s.current.title);
 ok('確定済みの週は保存できない',!(await A('saveWeek',{token:h.token,weekId:wk,raceName:'a',deadline:fut,menus:M,publish:true})).ok);
 const P2=(t,a,b,c,bet)=>A('predict',{token:t,weekId:wk2,picks:{火:a,水:b,木:c},bet});const pp=await P2(g[0],1,1,1,100); ok('2週目の予想',pp.ok,pp); await P2(g[1],2,2,2,100);
 await X('setOffset('+(6*day)+')');
 await A('registerDay',{token:h.token,weekId:wk2,day:'火',waku:1});await A('registerDay',{token:h.token,weekId:wk2,day:'水',waku:0});await A('registerDay',{token:h.token,weekId:wk2,day:'木',waku:1});
 r=await A('settle',{token:h.token,weekId:wk2}); ok('中止の日がある週は返還',r.ok&&r.status==='返還',r);
 const s2=await A('state',{token:g[0]}); ok('返還週の収支0',s2.lastResult&&s2.lastResult.settle&&s2.lastResult.settle.net===0,s2.lastResult);
 // --- アカウント ---
 ok('ニックネーム変更で重複は不可',!(await A('changeNick',{token:g[0],nick:'g1'})).ok);
 r=await A('changeNick',{token:g[0],nick:'007'}); const l7=await A('login',{nick:'007',pass:'2222'}); ok('数字のニックネームへ変更→ログイン',r.ok&&l7.ok,{r,l7});
 ok('今のパスワード違いは変更不可',!(await A('changePass',{token:g[0],oldPass:'9999',newPass:'3333'})).ok);
 r=await A('changePass',{token:g[0],oldPass:'2222',newPass:'0012'}); ok('パスワード変更',r.ok&&(await A('login',{nick:'007',pass:'0012'})).ok,r);
 // 補充ptマイナス
 await X("const s=SS.getSheetByName('参加者');s.data.forEach(r=>{if(r[1]==='g3')r[5]=-20000});");
 const s3=await A('state',{token:g[3]}); ok('補充ptマイナスで持ち点が減る',s3.me.balance<0,s3.me);
 ok('不明な操作',!(await A('xxx',{})).ok);
 ok('壊れたJSON',!(await (await fetch(U,{method:'POST',body:'{'})).json()).ok);
 console.log('PASS',pass,'FAIL',fail);console.log(out.join('\n'));
})().catch(e=>console.log('CRASH',e));
