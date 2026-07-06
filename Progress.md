# Progress — ScrollRunner

作業ごとにここへ追記していく（新しいものを上に）。

---

## 2026-07-06 (7) ギャップ生成をチャージ量ベースに刷新

- 高速時に「ちょいジャンプで全ギャップが渡れてしまう」問題を修正。固定単位のギャップをやめ、**必要チャージ量から逆算して生成**するように（速度に自動スケール）
- 通常ギャップ=チャージ15〜50%相当／**ワイドギャップ=55〜72%相当（約7割チャージ）**。ワイド出現率はLv1で20%→レベル毎+6%→上限55%
- 全足場に「**チャージ85%以下で着地可能**」の生成時検証を追加（MAXチャージ必須の理不尽配置を排除）
- 旧パラメータ gapMax/gapGrow/gapCap を廃止、gapCNorm/gapCWide/gapMargin/wideP0/widePGrow/widePMax/cMaxLand を追加
- **変更ファイル**: `src/config.js`, `src/game.js`, `Progress.md`

## 2026-07-06 (6) 歩き渡り禁止

- 狭いギャップを「ジャンプせず歩き落ちで渡れてしまう」問題を修正。`player.jumped` フラグを導入し、**ジャンプ由来の滞空のみ着地可能**に。足場の端を歩いて越えた落下は必ず落下死になる
- **変更ファイル**: `src/game.js`, `Progress.md`

## 2026-07-06 (5) ジャンプ音をユーザー提供WAVに差し替え

- ユーザー提供の `JumpSound.wav`（16bit mono 44.1kHz / 0.68s / 58.6KB）を `assets/sounds/jump.wav` として同梱
- `audio.js` に preload + decodeAudioData 再生を実装。チャージ量で再生レートを微変化（0.95〜1.15）。ロード失敗時は従来のボヨーン音にフォールバック
- 難易度は現状で確定（ユーザー承認済み: 「難易度イイ感じです。これで行きましょう」）
- ローカルでフェッチ200・デコード成功・エラーなしを確認
- **変更ファイル**: `assets/sounds/jump.wav`(新規), `src/audio.js`, `src/game.js`, `Progress.md`

## 2026-07-06 (4) フィードバック第3弾

- ジャンプ音を「ボヨーン」（バネ風: ピッチが跳ね上がり減衰ビブラートで揺れる。チャージ量で音程変化）に変更
- 飛び移り成功時に「キラーン」（上昇スパークル3音）を追加。Perfect着地はさらに豪華な4音スパークル
- ゲームオーバーでボタンを押すとタイトル画面へ遷移するように変更（表示も TAP TO TITLE に）
- Level 1 をゆったり調整: 開始速度 5→4 u/s、足場 3.5〜8.0u（長め）、ギャップ 2.2〜3.4u（広め=大ジャンプ主体）、幅縮小 0.25/Lv
- **変更ファイル**: `src/audio.js`, `src/game.js`, `src/config.js`, `Progress.md`
- **次にやること**: Pages で実機テスト → 残: 公式 ytgame SDK タグ、サムネイル、提出用ZIP

## 2026-07-06 (3) GitHub公開 + 追加フィードバック反映

- GitHub リポジトリ作成・push: https://github.com/Myuta7/scroll-runner （SSL対策で `http.sslBackend=schannel` をリポジトリローカルに設定）
- GitHub Pages 有効化: **https://myuta7.github.io/scroll-runner/** （main ブランチ / ルート）
- **追加フィードバック反映**:
  - 浮遊感アップ: 重力 g 40→25、初速レンジ 8–24 → 6.5–19（ジャンプ高さは維持し滞空約+27%）
  - タイトル画面にサウンド音量ボタン OFF/LOW/MID/HIGH を追加（選択は保存され次回も復元。切替時に確認音）
  - 昼夜サイクル: レベル進行で空の色が 夜→早朝→朝→昼→夕方→夜 と連続ブレンドで変化（6レベルで1周）
- ローカルテスト済み: 音量ボタンのクリック切替/誤開始防止、タイトルHI SCORE表示、コンソールエラーなし
- **本番確認済み**: https://myuta7.github.io/scroll-runner/ でタイトル表示・ピクセルフォント・音量ボタン・エラーなしを確認（Pages ビルド status: built）
- **変更ファイル**: `src/config.js`, `src/game.js`, `src/audio.js`, `.gitignore`(新規), `Progress.md`
- **次にやること**: Pages 上での実機（スマホ縦画面）テスト → 残タスク: 公式 ytgame SDK タグ投入、サムネイル/メタデータ、提出用ZIP

## 2026-07-06 (2) プロトタイプ受領・ブラッシュアップ

- 企画書 `files/ScrollRunner_GDD_final.md` とプロトタイプ（`files/scroll-runner.zip`）を受領・レビュー。zip を展開しゲーム一式（index.html / src / assets）をリポジトリルートへ配置。
- ブラウザで動作確認（localhost:8124、60fps、コンソールエラーなし）。タイトル→プレイ→ゲームオーバー→リトライの全遷移とハイスコア永続化を確認済み。
- **ブラッシュアップ内容**:
  - フィードバック反映: 低レベル時の足場を長く（wMax 4.0→6.5u）／チャージ時間延長（0.6→1.0s）＋最大ジャンプ初速アップ（vy 18→24、minFieldH 16→18）／チャージゲージ3倍幅（gaugeW 4.8u、枠付き）
  - フィードバック反映: 難易度カーブ大幅緩和（speedMul 1.08→1.03、幅縮小 0.12/Lv、隙間拡大 0.05/Lv。「Lv2が体感Lv10」対策）
  - 新機能: ロード画面（進捗バー付き、`gameReady` はロード完了時に送信）
  - 新機能: タイトル/リザルトに HI SCORE 表示（保存は既存の saveData/localStorage）
  - 新機能: プロシージャルサウンド `src/audio.js`（チャージ上昇音・ジャンプ・着地・Perfect・レベルアップジングル・落下音。Playables の isAudioEnabled/onAudioEnabledChange に連動）
  - 新機能: レベルアップ演出（画面フラッシュ＋LEVEL n バナー）
  - バグ修正: `sendScore` が best を送っていた→今回スコアに修正／死亡直後0.4sの誤タップ防止／visualViewport リサイズ対応
- **変更ファイル**: `src/config.js`, `src/game.js`, `src/audio.js`(新規), `index.html`(コピーのみ), `Progress.md`
- **次にやること**: GitHub リポジトリ作成 → push → GitHub Pages 有効化 → 実機（スマホ）テスト依頼。

## 2026-07-06 (1) プロジェクト初期化

- プロジェクトルール `CLAUDE.md` を作成。「作業したら必ず Progress.md に記録する」ルールを明記。
- `Progress.md`（本ファイル）を作成。
- **変更ファイル**: `CLAUDE.md`, `Progress.md`
