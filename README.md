#JSGraph

## 特徴

- HTML5 の canvas または VML を利用し JavaScript でグラフを描画。
- Firefox 1.5, IE6 で動作確認、Safari でも動作するかもしれません。
- 比較的簡単な手順でグラフの作成が可能(なつもり)。
- scale_mode (デフォルト) ではグラフをクリックして表示のセンタリング、 ドラッグによる範囲指定でグラフの拡大が可能 (IE では範囲指定時にお かしな挙動をすることがあります) 。
- resize_mode ではグラフをドラッグすることで、グラフ全体の位置を変更 可能。また、グラフの隅をドラッグすることでグラフサイズの変更が可能。
- データの描画スタイルは●、■、線、●または■と線から選択可能。
- キャプションはマウスでドラッグすることにより位置の変更が可能。
- JavaScript を利用してインタラクティヴにグラフの表示を変更可能。
- x 軸はデータの値を unix time や MJD として解釈し、軸目盛を西暦で表 示させることができます。
- 軸ナンバリング部分は現状あまり自信がありません。

## 使い方
### 簡単な使い方

	<script src="jsgraph.js" type="text/javascript"></script>
で jsgraph.js を読み込む。

	<div id="mygraph" style="width: 800px; height: 500px;"></div>
等として、グラフ用の領域を確保する。

	graph = new JSGraph('mygraph');
で JSGraph オブジェクトを生成。

	graph.load(file1, file2, ....)
でサーバにあるデータファイル file1, file2, ... を読み込んでグラフを表示します。<body onload="graph.load(file1, file2)">の様に html ファイルの読み込みが完了してから実行するようにしてください。

### 詳細な使い方

	<script src="jsgraph.js" type="text/javascript"></script>
で jsgraph.js を読み込む。

	<div id="mygraph" style="width: 800px; height: 500px;"></div>
等として、グラフ用の領域を確保する。

	graph = new JSGraph('mygraph');
で JSGraph オブジェクトを生成。

	data = new Data();
で Data オブジェクトを生成。

	data.read_data(s, [nx, ny, [FS,] [RS]]);
で値を入力。s をレコードセパレー タ RS、フィールドセパレータ FS で配列に変換し、nx 番目のフィールドを x データ、ny 番目のフィールドを y データとして Data オブジェクトに保存します。２番目以降の引数を指定しない場合は 「nx=1, ny=2, FS=new RegExp("[ ,\t]+"), RS="\n"」となります。

	data.add_data(x, y);
というメソッドも使用できます。

	data.load(path, [nx, ny, [FS,] [RS]]);
で XMLHttpRequest によるデータ取得も出来ます。 data.load(path) でデータ取得した場合は

	data.wait(function(){graph.autoscale(); graph.draw()});
の様に data.wait(func) でデータの取得を待ってからグラフを描画してください。

	data.set_color('#0000ff');
	data.set_text('Data2');
でデータの描画色、キャプションを指定。

	data.set_text(style);
でデータの表示スタイルを設定。
style は "r" は■、"c" は●、"l" は線で表示。また "lr", "lc" で各々 ■と線、●と線で表示します。デフォルトは "c"。

	graph.add_data(data);
で JSGraph オブジェクトにデータ追加。
scale_x_type(type), scale_y_type(type) で軸のタイプを選択。x 軸は "linear", "log", "unix", "mjd" から、y 軸は "linear", "log" から軸 の種類を選べます。x 軸の "unix", "mjd" は x の値をそれぞれ1970/1/1 からの通算秒数、MJD (修正ユリウス日) と解釈して西暦で軸の目盛を表示します。いまのところ一時間満の範囲を表示させる場合は使いものになりません。

	graph.autoscale();
で軸スケールを自動設定します。
グラフのタイトル、x, y 軸のキャプションはそれぞれ

	graph.title.set_text("Title");
	graph.caption_x.set_text("x");
	graph.caption_y.set_text("y");
で変更できます。

	graph.draw();
でグラフを描画。

## 今後の予定

- 各種機能強化

## 参考文献

- 久野靖「入門WWW」2000年 ASCII
- 久野靖「入門JavaScript」2001年 ASCII

## 履歴

- 2009/05/23
	- IE でのグラフセンタリング、トリミングの動作を改善。
- 2009/05/19
	- IE8 対応
- 2009/03/06
	- 軸のキャプション、グラフタイトルの位置が自動調整されるようにした。
- 2006/11/22
	- 軸ナンバリングの改善
- 2006/11/21
	- 浮動小数点の誤差の影響で 'linear' 軸の指数表示が異常になる場合のあった不具合の修正。
- 2006/11/07
	- 日付軸対応で非常に長い期間 (10年以上) もそれなりの表示になるようにした。
- 2006/11/06
	- 日付軸対応で一時間以上の範囲では時刻も表示できるようにした。
- 2006/11/05
	- 日付軸対応
- 2006/02/12
	- 簡易インターフェイス追加
- 2006/02/03
	- XMLHttpRequest を用いた動的データ取得機能の追加。
	- Data オブジェクトに set_line_width(), set_mark_size() を追加。
- 2006/01/31
	- IE での範囲指定時の挙動を少し改善。
	- Zoom_in, zoom_out, センタリング、範囲指定拡大各機能の対数軸対応。
- 2006/01/30
	- VML を利用し IE に（一応）対応。
	- resize_mode の不具合修正。
- 2006/01/28
	- zoom_in(), zoom_out(), resize_mode(), scale_mode() 追加。
	- マウスクリックによるセンタリング機能、範囲指定によるズーム機能追加。
- 2006/01/24
	- canvas 利用版。
	- Data オブジェクトに setstyle() を追加。
- 2005/04/01
	- 移動、リサイズの高速化。
	- 動作例更新。
- 2005/03/29
	- 対数軸対応。
	- 動作例更新。
- 2003/06/20 Version 0.3
	- autoscale 時のエラーチェックを追加。
	- キャプションなど一部の設定メソッドの統一。
- 2003/06/19 Version 0.2
	- リサイズ時の座標計算のバグ修正。
	- ステータスラインにマウスポインタのグラフ上の座標を表示するようにした。
- 2003/06/18 初版公開
