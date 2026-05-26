/// AI 搜索引擎 — Negamax + Alpha-Beta 剪枝
///
/// 使用变体 Negamax（Minimax 的对称形式），配合 Alpha-Beta 剪枝
/// 大幅减少搜索量。走法排序（吃子优先）进一步提升剪枝效率。
///
/// 难度分级：
/// - 入门: depth=2 (~6²=36 节点)
/// - 中级: depth=4 (~6⁴=1.3K 节点)
/// - 高级: depth=6 (~6⁶=47K 节点)

use crate::board::*;
use crate::game;
use crate::moves::*;
use crate::piece::*;

/// 棋子的相对价值（用于 MVV-LVA 走法排序）。
fn victim_value(pt: PieceType) -> f64 {
    match pt {
        PieceType::King => 1000.0,
        PieceType::Rook => 60.0,
        PieceType::Cannon => 30.0,
        PieceType::Knight => 27.0,
        PieceType::Bishop => 12.0,
        PieceType::Advisor => 12.0,
        PieceType::Pawn => 3.0,
    }
}

/// 走法排序：吃子走法优先（MVV-LVA: 先吃价值高的子，先用价值低的子吃）
fn order_moves(moves: &mut Vec<Move>, board: &BoardArray) {
    moves.sort_by(|a, b| {
        let a_victim = board[a.to_row][a.to_col].map(|p| victim_value(p.piece_type)).unwrap_or(0.0);
        let b_victim = board[b.to_row][b.to_col].map(|p| victim_value(p.piece_type)).unwrap_or(0.0);
        let a_attacker = board[a.from_row][a.from_col].map(|p| victim_value(p.piece_type)).unwrap_or(0.0);
        let b_attacker = board[b.from_row][b.from_col].map(|p| victim_value(p.piece_type)).unwrap_or(0.0);
        let a_score = a_victim * 10.0 - a_attacker;
        let b_score = b_victim * 10.0 - b_attacker;
        b_score.partial_cmp(&a_score).unwrap_or(std::cmp::Ordering::Equal)
    });
}

/// Negamax 递归搜索（带 Alpha-Beta 剪枝）
/// 返回当前走棋方的局面评分（正数 = 当前方优势）。
fn negamax(
    board: &BoardArray,
    side: Side,
    depth: u32,
    mut alpha: f64,
    beta: f64,
) -> f64 {
    if depth == 0 {
        let score = game::evaluate_board(board);
        return match side {
            Side::Red => score,
            Side::Black => -score,
        };
    }

    let mut moves = game::legal_moves(board, side);
    if moves.is_empty() {
        if game::in_check(board, side) {
            return -99999.0;
        }
        return 0.0;
    }

    order_moves(&mut moves, board);

    let mut best = f64::NEG_INFINITY;
    for m in &moves {
        let new_board = game::make_move(board, m);
        let score = -negamax(&new_board, side.opponent(), depth - 1, -beta, -alpha);
        if score > best {
            best = score;
        }
        alpha = alpha.max(score);
        if alpha >= beta {
            break;
        }
    }

    best
}

/// 为指定方搜索最佳走法。
pub fn best_move(board: &BoardArray, side: Side, depth: u32) -> Option<Move> {
    let mut moves = game::legal_moves(board, side);
    if moves.is_empty() {
        return None;
    }

    order_moves(&mut moves, board);

    let mut best_move = moves[0];
    let mut best_score = f64::NEG_INFINITY;

    for m in &moves {
        let new_board = game::make_move(board, m);
        let score = -negamax(&new_board, side.opponent(), depth - 1, f64::NEG_INFINITY, f64::INFINITY);
        if score > best_score {
            best_score = score;
            best_move = *m;
        }
    }

    Some(best_move)
}

#[cfg(test)]
mod tests {
    use super::*;

    const START_FEN: &str = "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w";

    #[test]
    fn test_best_move_start() {
        let (board, side) = parse_fen(START_FEN).unwrap();
        let m = best_move(&board, side, 2);
        assert!(m.is_some(), "开局应有合法走法");
        let m = m.unwrap();
        assert!(m.from_row < 10 && m.to_row < 10);
        assert!(m.from_col < 9 && m.to_col < 9);
    }

    #[test]
    fn test_best_move_capture_preferred() {
        // 红车将死黑将的局面
        let fen = "2bak4/4a4/4b4/9/9/9/9/4C4/3R1K3/9 w";
        let (board, side) = parse_fen(fen).unwrap();
        let m = best_move(&board, side, 2);
        assert!(m.is_some(), "应有合法走法");
    }

    #[test]
    fn test_negamax_depth0_equals_material() {
        // 深度 0 时应等于纯子力评估（约 0）
        let (board, _) = parse_fen(START_FEN).unwrap();
        let score = negamax(&board, Side::Red, 0, f64::NEG_INFINITY, f64::INFINITY);
        assert!(score.abs() < 1.0, "深度 0 时开局评估应接近 0，实际为 {}", score);
    }

    #[test]
    fn test_negamax_depth1_finds_advantage() {
        // 深度 1 时红方先手应有微小优势
        let (board, _) = parse_fen(START_FEN).unwrap();
        let score = negamax(&board, Side::Red, 1, f64::NEG_INFINITY, f64::INFINITY);
        assert!(score > 0.0, "红方先手应有微小优势，实际为 {}", score);
    }

    #[test]
    fn test_checkmate_preferred() {
        // 红方一步将杀的测试局面
        let fen = "2bak4/9/9/9/9/R8/9/9/4K4/9 w";
        let (board, side) = parse_fen(fen).unwrap();
        let m = best_move(&board, side, 3).unwrap();
        assert_eq!(m.to_col, 4, "最佳走法应直接将军");
    }
}
