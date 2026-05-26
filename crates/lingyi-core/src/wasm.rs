//! WASM 桥接模块 — 供微信小程序 / Web 端调用
//!
//! 所有复杂返回值以 JSON 字符串格式输出，避免 Mini Program 环境下 JsValue 兼容问题。
//! 只通过 `wasm` feature gate 编译，不影响纯 Rust 原生构建。

use crate::board::*;
use crate::game;
use crate::moves::Move;
use crate::piece::*;
use serde::Serialize;
use wasm_bindgen::prelude::*;

/// 单格棋子的 JSON 表示。
#[derive(Serialize)]
struct CellJson {
    piece_type: &'static str,
    side: &'static str,
}

/// 棋盘整体状态的 JSON 表示。
#[derive(Serialize)]
struct BoardJson {
    fen: String,
    rows: Vec<Vec<Option<CellJson>>>,
    side_to_move: String,
    check: bool,
    checkmate: bool,
    stalemate: bool,
}

fn piece_type_str(pt: PieceType) -> &'static str {
    match pt {
        PieceType::King => "King",
        PieceType::Advisor => "Advisor",
        PieceType::Bishop => "Bishop",
        PieceType::Rook => "Rook",
        PieceType::Knight => "Knight",
        PieceType::Cannon => "Cannon",
        PieceType::Pawn => "Pawn",
    }
}

fn side_str(s: Side) -> &'static str {
    match s {
        Side::Red => "red",
        Side::Black => "black",
    }
}

/// 单步走法的 JSON 表示。
#[derive(Serialize)]
struct MoveJson {
    from_row: usize,
    from_col: usize,
    to_row: usize,
    to_col: usize,
    piece_type: &'static str,
    side: &'static str,
}

/// 解析 FEN 字符串，返回棋盘完整 JSON。
#[wasm_bindgen]
pub fn fen_to_json(fen: &str) -> String {
    let result = try_fen_to_json(fen);
    match result {
        Ok(json) => json,
        Err(e) => format!(r#"{{"error":"{}"}}"#, e),
    }
}

fn try_fen_to_json(fen: &str) -> Result<String, String> {
    let (board, side) = parse_fen(fen).ok_or_else(|| "Invalid FEN".to_string())?;

    let check = game::in_check(&board, side);
    let checkmate = game::is_checkmate(&board, side);
    let stalemate = game::is_stalemate(&board, side);

    let rows: Vec<Vec<Option<CellJson>>> = board
        .iter()
        .map(|row| {
            row.iter()
                .map(|cell| {
                    cell.map(|p| CellJson {
                        piece_type: piece_type_str(p.piece_type),
                        side: side_str(p.side),
                    })
                })
                .collect()
        })
        .collect();

    serde_json::to_string(&BoardJson {
        fen: fen.to_string(),
        rows,
        side_to_move: side_str(side).to_string(),
        check,
        checkmate,
        stalemate,
    })
    .map_err(|e| format!("Serialize error: {}", e))
}

/// 获取当前局面的所有合法走法，返回 JSON 数组字符串。
#[wasm_bindgen]
pub fn get_legal_moves(fen: &str) -> String {
    let result = try_get_legal_moves(fen);
    match result {
        Ok(json) => json,
        Err(e) => format!(r#"{{"error":"{}"}}"#, e),
    }
}

fn try_get_legal_moves(fen: &str) -> Result<String, String> {
    let (board, side) = parse_fen(fen).ok_or_else(|| "Invalid FEN".to_string())?;
    let moves = game::legal_moves(&board, side);

    let move_list: Vec<MoveJson> = moves
        .iter()
        .map(|m| {
            let piece = board[m.from_row][m.from_col].unwrap();
            MoveJson {
                from_row: m.from_row,
                from_col: m.from_col,
                to_row: m.to_row,
                to_col: m.to_col,
                piece_type: piece_type_str(piece.piece_type),
                side: side_str(piece.side),
            }
        })
        .collect();

    serde_json::to_string(&move_list).map_err(|e| format!("Serialize error: {}", e))
}

/// 执行一步走法，返回新局面的 FEN 字符串。
/// 如果走法非法，返回原 FEN。
#[wasm_bindgen]
pub fn make_move(fen: &str, from_row: u8, from_col: u8, to_row: u8, to_col: u8) -> String {
    let result = try_make_move(fen, from_row, from_col, to_row, to_col);
    match result {
        Ok(new_fen) => new_fen,
        Err(_) => fen.to_string(),
    }
}

fn try_make_move(
    fen: &str,
    from_row: u8,
    from_col: u8,
    to_row: u8,
    to_col: u8,
) -> Result<String, String> {
    let (board, side) = parse_fen(fen).ok_or_else(|| "Invalid FEN".to_string())?;
    let m = Move::new(from_row as usize, from_col as usize, to_row as usize, to_col as usize);

    let legal = game::legal_moves(&board, side);
    if !legal.contains(&m) {
        return Err("Illegal move".to_string());
    }

    let new_board = game::make_move(&board, &m);
    Ok(board_to_fen(&new_board, side.opponent()))
}

/// 判断走棋方是否被将军。
#[wasm_bindgen]
pub fn is_check(fen: &str) -> bool {
    parse_fen(fen)
        .map(|(board, side)| game::in_check(&board, side))
        .unwrap_or(false)
}

/// 判断是否被将杀。
#[wasm_bindgen]
pub fn is_checkmate(fen: &str) -> bool {
    parse_fen(fen)
        .map(|(board, side)| game::is_checkmate(&board, side))
        .unwrap_or(false)
}

/// 判断是否被困毙。
#[wasm_bindgen]
pub fn is_stalemate(fen: &str) -> bool {
    parse_fen(fen)
        .map(|(board, side)| game::is_stalemate(&board, side))
        .unwrap_or(false)
}

/// 简易子力评估（正数 = 红方优势）。
#[wasm_bindgen]
pub fn evaluate(fen: &str) -> f64 {
    parse_fen(fen)
        .map(|(board, _)| game::evaluate_board(&board))
        .unwrap_or(0.0)
}

/// AI 走棋：搜索最佳走法，返回 JSON。
/// depth: 搜索深度（2=入门, 4=中级, 6=高级）。
/// 返回 JSON: { from_row, from_col, to_row, to_col, score }
/// 无合法走法时返回空对象 {}。
#[wasm_bindgen]
pub fn best_move(fen: &str, depth: u32) -> String {
    let result = try_best_move(fen, depth);
    match result {
        Ok(json) => json,
        Err(_) => "{}".to_string(),
    }
}

fn try_best_move(fen: &str, depth: u32) -> Result<String, String> {
    let (board, side) = parse_fen(fen).ok_or_else(|| "Invalid FEN".to_string())?;
    let m = crate::search::best_move(&board, side, depth)
        .ok_or_else(|| "No legal moves".to_string())?;
    serde_json::to_string(&serde_json::json!({
        "from_row": m.from_row,
        "from_col": m.from_col,
        "to_row": m.to_row,
        "to_col": m.to_col,
    })).map_err(|e| format!("Serialize error: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    const START_FEN: &str = "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w";

    #[test]
    fn test_fen_to_json_ok() {
        let json = fen_to_json(START_FEN);
        assert!(json.contains("side_to_move"));
        assert!(json.contains("rows"));
    }

    #[test]
    fn test_fen_to_json_invalid() {
        let json = fen_to_json("invalid");
        assert!(json.contains("error"));
    }

    #[test]
    fn test_get_legal_moves_has_moves() {
        let json = get_legal_moves(START_FEN);
        assert!(!json.contains("error"));
        let moves: Vec<MoveJson> = serde_json::from_str(&json).unwrap();
        assert!(!moves.is_empty());
    }

    #[test]
    fn test_make_move_legal() {
        let new_fen = make_move(START_FEN, 7, 1, 7, 4);
        assert_ne!(new_fen, START_FEN);
    }

    #[test]
    fn test_evaluate_zero_at_start() {
        let score = evaluate(START_FEN);
        assert!((score).abs() < 1.0, "Start position should be roughly equal");
    }

    #[test]
    fn test_is_check() {
        assert!(!is_check(START_FEN));
    }
}
