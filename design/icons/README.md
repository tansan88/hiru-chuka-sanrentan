# ホーム画面アイコンの元の絵（SVG）

画面には出さない（GitHub Pages には assets/ だけが載る）。
ここを直したら、assets/pwa/icons/ に 180・192・512px の PNG と、テスト環境用（下に赤い「テスト」の帯）の 180px を作り直す。
並び順と名前は app.js の ICONS と同じ。


## 投稿をつくるの専用アイコン
post.svg（本番）・post_test.svg（テスト環境。下に赤い「テスト」の帯）。「盛りつけ（白）」：生成りの地に、緑の丼からカメラが顔を出す形（2026-11-19 決定）。
assets/pwa/icons/ の post-180/192/512.png と post-test-180/192/512.png に書き出し、manifest-post(-test).webmanifest と、?post で開いたときの apple-touch-icon で使う。3連単で選んだアイコンは投稿のほうには付かない。
