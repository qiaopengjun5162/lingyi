use serde::{Deserialize, Serialize};

/// 红方或黑方。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Side {
    Red,
    Black,
}

impl Side {
    pub fn opponent(self) -> Self {
        match self {
            Side::Red => Side::Black,
            Side::Black => Side::Red,
        }
    }
}

/// 棋子类型。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PieceType {
    King,
    Advisor,
    Bishop,
    Rook,
    Knight,
    Cannon,
    Pawn,
}

/// 棋盘上的一枚棋子。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Piece {
    pub piece_type: PieceType,
    pub side: Side,
}

impl Piece {
    pub fn new(piece_type: PieceType, side: Side) -> Self {
        Self { piece_type, side }
    }

    /// 棋子的 FEN 字符（小写 = 黑方，大写 = 红方）。
    pub fn to_fen_char(self) -> char {
        let c = match self.piece_type {
            PieceType::King => 'k',
            PieceType::Advisor => 'a',
            PieceType::Bishop => 'b',
            PieceType::Rook => 'r',
            PieceType::Knight => 'n',
            PieceType::Cannon => 'c',
            PieceType::Pawn => 'p',
        };
        match self.side {
            Side::Red => c.to_ascii_uppercase(),
            Side::Black => c,
        }
    }

    /// 从 FEN 字符解析棋子。
    pub fn from_fen_char(c: char) -> Option<Self> {
        let (side, lower) = if c.is_uppercase() {
            (Side::Red, c.to_ascii_lowercase())
        } else {
            (Side::Black, c)
        };
        let piece_type = match lower {
            'k' => PieceType::King,
            'a' => PieceType::Advisor,
            'b' => PieceType::Bishop,
            'r' => PieceType::Rook,
            'n' => PieceType::Knight,
            'c' => PieceType::Cannon,
            'p' => PieceType::Pawn,
            _ => return None,
        };
        Some(Self { piece_type, side })
    }
}
