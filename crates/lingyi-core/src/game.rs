/// 游戏逻辑：走棋、将军检测、合法性过滤。

use crate::board::*;
use crate::moves::*;
use crate::piece::*;

/// 找到某方将/帅的位置。
pub fn find_king(board: &BoardArray, side: Side) -> Option<(usize, usize)> {
    for row in 0..ROWS {
        for col in 0..COLS {
            if let Some(p) = board[row][col] {
                if p.piece_type == PieceType::King && p.side == side {
                    return Some((row, col));
                }
            }
        }
    }
    None
}

/// 检查将帅对面规则：两将在同一列且中间无子，视为将军。
pub fn kings_facing(board: &BoardArray) -> bool {
    let Some((r1, c1)) = find_king(board, Side::Red) else { return false };
    let Some((r2, c2)) = find_king(board, Side::Black) else { return false };
    if c1 != c2 {
        return false;
    }
    let min_r = r1.min(r2) + 1;
    let max_r = r1.max(r2);
    for r in min_r..max_r {
        if board[r][c1].is_some() {
            return false;
        }
    }
    true
}

/// 某方是否被将军。
pub fn in_check(board: &BoardArray, side: Side) -> bool {
    let opp = side.opponent();
    for row in 0..ROWS {
        for col in 0..COLS {
            if let Some(p) = board[row][col] {
                if p.side == opp {
                    for m in pseudo_legal_moves(board, row, col) {
                        if board[m.to_row][m.to_col]
                            .map(|p| p.piece_type == PieceType::King)
                            .unwrap_or(false)
                        {
                            return true;
                        }
                    }
                }
            }
        }
    }
    kings_facing(board)
}

/// 执行一步走法，返回新棋盘。
pub fn make_move(board: &BoardArray, m: &Move) -> BoardArray {
    let mut new_board = *board;
    let piece = new_board[m.from_row][m.from_col].take();
    new_board[m.to_row][m.to_col] = piece;
    new_board
}

/// 获取某方所有合法走法。
pub fn legal_moves(board: &BoardArray, side: Side) -> Vec<Move> {
    let pseudo = all_pseudo_legal_moves(board, side);
    pseudo
        .into_iter()
        .filter(|m| {
            let new_board = make_move(board, m);
            !in_check(&new_board, side)
        })
        .collect()
}

/// 是否被将杀（无合法走法且被将军）。
pub fn is_checkmate(board: &BoardArray, side: Side) -> bool {
    in_check(board, side) && legal_moves(board, side).is_empty()
}

/// 是否被困毙（无合法走法但未被将军）。
pub fn is_stalemate(board: &BoardArray, side: Side) -> bool {
    !in_check(board, side) && legal_moves(board, side).is_empty()
}

/// 棋子子力价值（正数 = 红方优势）。
pub fn piece_value(pt: PieceType) -> f64 {
    match pt {
        PieceType::King => 10000.0,
        PieceType::Rook => 600.0,
        PieceType::Cannon => 300.0,
        PieceType::Knight => 270.0,
        PieceType::Bishop => 120.0,
        PieceType::Advisor => 120.0,
        PieceType::Pawn => 30.0,
    }
}

/// 评估棋盘局面，正数 = 红方优势。
/// 用作 AI 搜索的评估函数，也通过 WASM 暴露给前端。
pub fn evaluate_board(board: &BoardArray) -> f64 {
    let mut score = 0.0;
    for row in 0..ROWS {
        for col in 0..COLS {
            if let Some(p) = board[row][col] {
                let v = piece_value(p.piece_type);
                score += match p.side {
                    Side::Red => v,
                    Side::Black => -v,
                };
            }
        }
    }
    score
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_start_not_check() {
        let (board, _) = parse_fen("rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w").unwrap();
        assert!(!in_check(&board, Side::Red));
        assert!(!in_check(&board, Side::Black));
    }

    #[test]
    fn test_kings_facing_clean() {
        let (board, _) = parse_fen("4k4/9/9/9/9/9/9/9/9/4K4 w").unwrap();
        // 将帅之间隔一行放一个子，不算对面
        let mut b = board;
        b[5][4] = Some(Piece::new(PieceType::Rook, Side::Red));
        assert!(!kings_facing(&b));
    }

    #[test]
    fn test_make_move() {
        let (board, _) = parse_fen("rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w").unwrap();
        // Red cannon at (7, 1) moves horizontally to (7, 4)
        let from = (7, 1);
        let m = Move::new(from.0, from.1, 7, 4);
        let new_board = make_move(&board, &m);
        assert!(new_board[from.0][from.1].is_none());
        assert_eq!(new_board[7][4].unwrap().piece_type, PieceType::Cannon);
        assert_eq!(new_board[7][4].unwrap().side, Side::Red);
    }

    #[test]
    fn test_start_has_legal_moves() {
        let (board, side) = parse_fen("rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w").unwrap();
        let moves = legal_moves(&board, side);
        assert!(!moves.is_empty());
    }
}
