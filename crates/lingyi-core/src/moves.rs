/// 所有棋子的走法生成。
///
/// 生成 "伪合法" 走法（不检查走完后是否被将军），
/// 合法性过滤在 `game` 模块中完成。
use crate::board::*;
use crate::piece::*;

/// 一步走法。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Move {
    pub from_row: usize,
    pub from_col: usize,
    pub to_row: usize,
    pub to_col: usize,
}

impl Move {
    pub fn new(from_row: usize, from_col: usize, to_row: usize, to_col: usize) -> Self {
        Self { from_row, from_col, to_row, to_col }
    }
}

/// 生成某个位置上所有候选走法（不检查将军）。
pub fn pseudo_legal_moves(board: &BoardArray, row: usize, col: usize) -> Vec<Move> {
    let Some(piece) = board[row][col] else {
        return vec![];
    };
    match piece.piece_type {
        PieceType::King => king_moves(board, row, col, piece.side),
        PieceType::Advisor => advisor_moves(board, row, col, piece.side),
        PieceType::Bishop => bishop_moves(board, row, col, piece.side),
        PieceType::Rook => rook_moves(board, row, col, piece.side),
        PieceType::Knight => knight_moves(board, row, col, piece.side),
        PieceType::Cannon => cannon_moves(board, row, col, piece.side),
        PieceType::Pawn => pawn_moves(board, row, col, piece.side),
    }
}

/// 辅助：向目标格子生成走法（空位或对方子力）。
fn add_move_if(
    board: &BoardArray,
    from_row: usize,
    from_col: usize,
    target_row: i8,
    target_col: i8,
    side: Side,
    moves: &mut Vec<Move>,
) {
    if !in_bounds(target_row, target_col) {
        return;
    }
    let (tr, tc) = (target_row as usize, target_col as usize);
    match board[tr][tc] {
        None => moves.push(Move::new(from_row, from_col, tr, tc)),
        Some(p) if p.side != side => moves.push(Move::new(from_row, from_col, tr, tc)),
        _ => {}
    }
}

fn king_moves(board: &BoardArray, row: usize, col: usize, side: Side) -> Vec<Move> {
    let mut moves = Vec::with_capacity(4);
    for (dr, dc) in &[(1i8, 0i8), (-1, 0), (0, 1), (0, -1)] {
        let tr = row as i8 + dr;
        let tc = col as i8 + dc;
        if in_bounds(tr, tc) && in_palace(tr as usize, tc as usize, side) {
            add_move_if(board, row, col, tr, tc, side, &mut moves);
        }
    }
    moves
}

fn advisor_moves(board: &BoardArray, row: usize, col: usize, side: Side) -> Vec<Move> {
    let mut moves = Vec::with_capacity(4);
    for (dr, dc) in &[(1i8, 1i8), (1, -1), (-1, 1), (-1, -1)] {
        let tr = row as i8 + dr;
        let tc = col as i8 + dc;
        if in_bounds(tr, tc) && in_palace(tr as usize, tc as usize, side) {
            add_move_if(board, row, col, tr, tc, side, &mut moves);
        }
    }
    moves
}

fn bishop_moves(board: &BoardArray, row: usize, col: usize, side: Side) -> Vec<Move> {
    let mut moves = Vec::with_capacity(4);
    for (dr, dc) in &[(2i8, 2i8), (2, -2), (-2, 2), (-2, -2)] {
        let tr = row as i8 + dr;
        let tc = col as i8 + dc;
        let eye_r = row as i8 + dr / 2;
        let eye_c = col as i8 + dc / 2;
        if !in_bounds(tr, tc) || !on_own_side(tr as usize, side) {
            continue;
        }
        if board[eye_r as usize][eye_c as usize].is_some() {
            continue;
        }
        add_move_if(board, row, col, tr, tc, side, &mut moves);
    }
    moves
}

fn rook_moves(board: &BoardArray, row: usize, col: usize, side: Side) -> Vec<Move> {
    let mut moves = Vec::with_capacity(17);
    let dirs: [(i8, i8); 4] = [(1, 0), (-1, 0), (0, 1), (0, -1)];
    for (dr, dc) in dirs {
        let mut r = row as i8 + dr;
        let mut c = col as i8 + dc;
        while in_bounds(r, c) {
            let (ur, uc) = (r as usize, c as usize);
            if let Some(p) = board[ur][uc] {
                if p.side != side {
                    moves.push(Move::new(row, col, ur, uc));
                }
                break;
            }
            moves.push(Move::new(row, col, ur, uc));
            r += dr;
            c += dc;
        }
    }
    moves
}

fn knight_moves(board: &BoardArray, row: usize, col: usize, side: Side) -> Vec<Move> {
    let mut moves = Vec::with_capacity(8);
    let steps: [(i8, i8, i8, i8); 8] = [
        (-2, -1, -1, 0),
        (-2, 1, -1, 0),
        (2, -1, 1, 0),
        (2, 1, 1, 0),
        (-1, -2, 0, -1),
        (1, -2, 0, -1),
        (-1, 2, 0, 1),
        (1, 2, 0, 1),
    ];
    let (r, c) = (row as i8, col as i8);
    for &(dr, dc, leg_r, leg_c) in &steps {
        let tr = r + dr;
        let tc = c + dc;
        let lr = r + leg_r;
        let lc = c + leg_c;
        if !in_bounds(tr, tc) {
            continue;
        }
        if board[lr as usize][lc as usize].is_some() {
            continue;
        }
        add_move_if(board, row, col, tr, tc, side, &mut moves);
    }
    moves
}

fn cannon_moves(board: &BoardArray, row: usize, col: usize, side: Side) -> Vec<Move> {
    let mut moves = Vec::with_capacity(17);
    let dirs: [(i8, i8); 4] = [(1, 0), (-1, 0), (0, 1), (0, -1)];
    for (dr, dc) in dirs {
        let mut r = row as i8 + dr;
        let mut c = col as i8 + dc;
        let mut screened = false;
        while in_bounds(r, c) {
            let (ur, uc) = (r as usize, c as usize);
            match board[ur][uc] {
                None => {
                    if !screened {
                        moves.push(Move::new(row, col, ur, uc));
                    }
                }
                Some(p) => {
                    if !screened {
                        screened = true;
                    } else {
                        if p.side != side {
                            moves.push(Move::new(row, col, ur, uc));
                        }
                        break;
                    }
                }
            }
            r += dr;
            c += dc;
        }
    }
    moves
}

fn pawn_moves(board: &BoardArray, row: usize, col: usize, side: Side) -> Vec<Move> {
    let mut moves = Vec::with_capacity(3);
    let forward: i8 = match side {
        Side::Red => -1,
        Side::Black => 1,
    };
    let crossed = !on_own_side(row, side);
    let tr = row as i8 + forward;
    if in_bounds(tr, col as i8) {
        add_move_if(board, row, col, tr, col as i8, side, &mut moves);
    }
    if crossed {
        for dc in &[1i8, -1i8] {
            let tc = col as i8 + dc;
            if in_bounds(row as i8, tc) {
                add_move_if(board, row, col, row as i8, tc, side, &mut moves);
            }
        }
    }
    moves
}

/// 生成某方所有走法（伪合法）。
pub fn all_pseudo_legal_moves(board: &BoardArray, side: Side) -> Vec<Move> {
    let mut moves = Vec::with_capacity(80);
    for row in 0..ROWS {
        for col in 0..COLS {
            if let Some(p) = board[row][col] {
                if p.side == side {
                    moves.extend(pseudo_legal_moves(board, row, col));
                }
            }
        }
    }
    moves
}
