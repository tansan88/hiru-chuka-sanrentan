process.env.TZ='Asia/Tokyo';
const path = require('path');
const { ctx, SS, G } = require('./emu/gas_emu.js')(path.join(__dirname, '../gas/Code.gs'));
let pass=0,fail=0;const ok=(c,m,x)=>{if(c)pass++;else{fail++;console.log('FAIL',m,x)}};
ctx.初期設定();
const reset=()=>ctx.__reset();
ctx.バックアップを設定する(); reset();
const T=G.ScriptApp._t; ok(T.length===1&&T[0].fn==='定期バックアップ'&&T[0].d==='FRIDAY'&&T[0].h===5,'トリガー',T);
ctx.バックアップを設定する(); reset(); ok(G.ScriptApp._t.length===1,'二重登録しない',G.ScriptApp._t.length);
const set=SS.getSheetByName('設定').data; const fid=set.find(r=>r[0]==='バックアップフォルダID'); ok(fid&&fid[1],'フォルダID記録',fid);
const F=G.DriveApp._folders[fid[1]]; ok(F&&F.name==='昼中華3連単のバックアップ','フォルダ名',F&&F.name);
for(let i=0;i<10;i++){ ctx.定期バックアップ(); reset(); }
const live=F.files.filter(f=>!f.trashed), tr=F.files.filter(f=>f.trashed);
ok(F.files.length===12 && live.length===8 && tr.length===4,'8件残る',[F.files.length,live.length,tr.length]);
ok(live.every(f=>tr.every(t=>t.created<f.created)),'古い順に削除');
ok(/^昼中華3連単_バックアップ_\d{4}-\d{2}-\d{2}_\d{4}$/.test(live[0].name),'ファイル名',live[0].name);
// 保存数を変更
const row=set.find(r=>r[0]==='バックアップの保存数'); row[1]=3; reset();
ctx.バックアップを取る(); reset();
ok(F.files.filter(f=>!f.trashed).length===3,'保存数3',F.files.filter(f=>!f.trashed).length);
// フォルダが消えていたら作り直す
fid[1]='missing'; reset(); ctx.バックアップを取る(); reset();
const fid2=SS.getSheetByName('設定').data.find(r=>r[0]==='バックアップフォルダID')[1]; ok(fid2!=='missing' && G.DriveApp._folders[fid2].files.length===1,'フォルダ作り直し',fid2);
const logs=SS.getSheetByName('ログ').data.filter(r=>r[3]==='バックアップ'); ok(logs.length===14,'ログ',logs.length);
console.log('PASS',pass,'FAIL',fail);
