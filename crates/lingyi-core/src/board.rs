use crate::piece::*;

/// 棋盘行数（0 = 黑方底线，9 = 红方底线）。
pub const ROWS: usize = 10;
/// 棋盘列数。
pub const COLS: usize = 9;

/// 棋盘：10 行 × 9 列，每格可能有一枚棋子。
pub type BoardArray = [[Option<Piece>; COLS]; ROWS];

/// 解析 FEN 字符串为棋盘。
///
/// FEN 格式示例：`rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w`
/// `/` 分隔行，数字表示连续空格数，小写=黑方、大写=红方。
/// 末尾的 ` w` 表示红方先走（可选）。
pub fn parse_fen(fen: &str) -> Option<(BoardArray, Side)> {
    let fen = fen.trim();
    let (board_str, side) = if let Some((b, rest)) = fen.split_once(' ') {
        let side = match rest.trim() {
            s if s.starts_with('w') || s.starts_with('r') => Side::Red,
            s if s.starts_with('b') => Side::Black,
            _ => return None,
        };
        (b, side)
    } else {
        (fen, Side::Red)
    };

    let rows: Vec<&str> = board_str.split('/').collect();
    if rows.len() != ROWS {
        return None;
    }

    let mut board: BoardArray = [[None; COLS]; ROWS];

    for (row, &row_str) in rows.iter().enumerate() {
        let mut col = 0;
        for c in row_str.chars() {
            if col >= COLS {
                return None;
            }
            if let Some(n) = c.to_digit(10) {
                col += n as usize;
            } else if let Some(piece) = Piece::from_fen_char(c) {
                board[row][col] = Some(piece);
                col += 1;
            } else {
                return None;
            }
        }
        if col != COLS {
            return None;
        }
    }

    Some((board, side))
}

/// 棋盘序列化为 FEN。
pub fn board_to_fen(board: &BoardArray, side: Side) -> String {
    let mut parts = Vec::with_capacity(ROWS);
    for row_data in board.iter() {
        let mut fen_row = String::new();
        let mut empty = 0u8;
        for cell in row_data.iter() {
            if let Some(piece) = cell {
                if empty > 0 {
                    fen_row.push_str(&empty.to_string());
                    empty = 0;
                }
                fen_row.push(piece.to_fen_char());
            } else {
                empty += 1;
            }
        }
        if empty > 0 {
            fen_row.push_str(&empty.to_string());
        }
        parts.push(fen_row);
    }
    let side_char = match side {
        Side::Red => 'w',
        Side::Black => 'b',
    };
    format!("{} {}", parts.join("/"), side_char)
}

/// 行列是否在棋盘范围内。
#[inline]
pub fn in_bounds(row: i8, col: i8) -> bool {
    row >= 0 && row < ROWS as i8 && col >= 0 && col < COLS as i8
}

/// 是否在九宫格内。
pub fn in_palace(row: usize, col: usize, side: Side) -> bool {
    if !(3..=5).contains(&col) {
        return false;
    }
    match side {
        Side::Red => (7..=9).contains(&row),
        Side::Black => row <= 2,
    }
}

/// 棋子是否在己方半场（未过河）。
pub fn on_own_side(row: usize, side: Side) -> bool {
    match side {
        Side::Red => row >= 5,
        Side::Black => row <= 4,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const START_FEN: &str = "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w";

    #[test]
    fn test_parse_start_pos() {
        let (board, side) = parse_fen(START_FEN).unwrap();
        assert_eq!(side, Side::Red);
        // 红方底线
        assert_eq!(board[9][0].unwrap().piece_type, PieceType::Rook);
        assert_eq!(board[9][0].unwrap().side, Side::Red);
        assert_eq!(board[9][4].unwrap().piece_type, PieceType::King);
        assert_eq!(board[9][4].unwrap().side, Side::Red);
        // 黑方
        assert_eq!(board[0][0].unwrap().piece_type, PieceType::Rook);
        assert_eq!(board[0][0].unwrap().side, Side::Black);
        // 空格
        assert!(board[5][0].is_none());
    }

    #[test]
    fn test_fen_roundtrip() {
        let (board, side) = parse_fen(START_FEN).unwrap();
        let fen2 = board_to_fen(&board, side);
        assert!(fen2.starts_with("rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR"));
    }

    #[test]
    fn test_in_palace() {
        assert!(in_palace(8, 4, Side::Red));
        assert!(!in_palace(5, 4, Side::Red));
        assert!(in_palace(1, 4, Side::Black));
        assert!(!in_palace(3, 4, Side::Black));
    }
}
