# Progress — ScrollRunner

作業ごとにここへ追記していく（新しいものを上に）。

---

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
