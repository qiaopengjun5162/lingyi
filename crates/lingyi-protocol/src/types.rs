use serde::{Deserialize, Serialize};

/// The type of board game being played.
/// The protocol is game-agnostic — this tells the LLM which game's terminology to use.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum GameType {
    ChineseChess,
    Go,
    Chess,
}

/// Which side's turn it is.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Side {
    Red,
    Black,
}

/// Phase of the game, used to contextualize coaching advice.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum GamePhase {
    Opening,
    Middlegame,
    Endgame,
}

/// Full game state sent from frontend to backend.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GameState {
    /// FEN string representing the current position.
    pub fen: String,
    /// Move history in SAN-like notation, most recent last.
    pub move_history: Vec<String>,
    /// Which game is being played.
    pub game_type: GameType,
    /// Whose turn it is.
    pub side_to_move: Side,
}

/// A single candidate move evaluated by the engine.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TopMove {
    /// Move in SAN-like notation.
    pub move_str: String,
    /// Engine score (centipawns or winrate, positive favors side_to_move).
    pub score: f32,
    /// Search depth in plies.
    pub depth: u8,
}

/// Raw analysis output from the chess engine.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EngineAnalysis {
    pub best_move: TopMove,
    /// Alternative candidate moves, ordered by score descending.
    pub top_moves: Vec<TopMove>,
    /// Detected game phase.
    pub game_phase: GamePhase,
    /// Notable tactical patterns detected.
    pub flags: Vec<String>,
}

/// Coaching persona configuration.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CoachingStyle {
    /// 严师 — sharp, insightful, direct.
    Strict,
    /// 温和 — encouraging, supportive.
    Gentle,
}

/// Category of coaching feedback.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ResponseType {
    /// A tactical hint without giving away the answer.
    Hint,
    /// Positive reinforcement for a good move.
    Praise,
    /// Alert about a dangerous or suboptimal situation.
    Warning,
    /// A thought-provoking question to guide the player.
    Question,
}

/// What aspect of the game the coaching should focus on.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FocusArea {
    Opening,
    Middlegame,
    Endgame,
    Tactics,
    Positional,
    Psychology,
}

/// User context for personalized coaching.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UserProfile {
    /// How many of the last games were losses.
    pub recent_losses: u32,
    /// Known weaknesses (e.g. "weak_defense", "poor_endgame").
    pub known_weaknesses: Vec<String>,
    /// Known strengths.
    pub known_strengths: Vec<String>,
    /// Estimated rating or level, if available.
    pub rating: Option<u32>,
}

/// The structured bridge between engine analysis and LLM prompt.
/// This is the key protocol type — it translates raw engine numbers
/// into a context the LLM can naturally respond to.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AnalysisContext {
    /// Current game state.
    pub game_state: GameState,
    /// Engine analysis results.
    pub engine: EngineAnalysis,
    /// Player profile for personalized coaching.
    pub user_profile: Option<UserProfile>,
    /// Desired coaching persona.
    pub coaching_style: CoachingStyle,
    /// Suggested focus area, if any.
    pub focus_area: Option<FocusArea>,
    /// Human-readable summary of the current evaluation.
    /// Example: "红方优势两兵，但有窝心马隐患"
    pub current_evaluation: String,
    /// Key moments or patterns worth highlighting.
    /// Example: "对方的车已经压制了你的左翼"
    pub key_moments: Vec<String>,
}

/// Structured response from the LLM coach.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CoachResponse {
    /// The coaching message text.
    pub message: String,
    /// Category of this response.
    pub response_type: ResponseType,
    /// Aspect of the game this response addresses.
    pub focus_area: Option<FocusArea>,
}

// ─── Agent Identity ─────────────────────────────────────

/// Unique identifier for an Agent (DID format).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AgentId(pub String);

/// A claim about what an Agent is authorized to do.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Capability {
    /// Action name, e.g. "evaluate_position", "generate_commentary".
    pub action: String,
    /// Resource scope glob, e.g. "fen:*", "game:sgf", "engine:lingyi-core".
    pub resource: String,
}

/// Spending limits for an Agent action.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Budget {
    /// Maximum token cost per task.
    pub max_tokens: u64,
    /// Maximum compute units.
    pub max_compute: u64,
    /// On-chain payment cap in `currency` units (Web3 layer).
    pub max_payment: Option<u64>,
    /// Currency denomination (e.g. "USDC", "ETH").
    pub currency: Option<String>,
}

/// Verifiable Agent Identity.
///
/// Every Agent carries this identity. All four Guard layers verify it
/// before any action is executed. The `signature` field is the issuer's
/// cryptographic signature over the remaining fields (excl. itself).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AgentIdentity {
    /// Issuer — DID of the entity that signed this identity.
    pub iss: String,
    /// Subject — the Agent's unique identifier.
    pub sub: AgentId,
    /// Controller — the user or entity who controls this Agent.
    pub controller: String,
    /// What this Agent is allowed to do.
    pub capabilities: Vec<Capability>,
    /// Service endpoint for this Agent, if remote.
    pub endpoint: Option<String>,
    /// Provenance — parent Agent ID or deployment transaction hash.
    pub provenance: Option<String>,
    /// ISO 8601 — when this identity was issued.
    pub issued_at: String,
    /// ISO 8601 — expiry, if any.
    pub expires_at: Option<String>,
    /// Cryptographic signature over the fields above (excluding itself).
    pub signature: Option<String>,
}

/// An action proposed by an Agent, to be validated by Guards.
///
/// Guard flow:
///   1. Verify `identity.signature` (Agent is who it claims).
///   2. Check `action` against `identity.capabilities`.
///   3. Validate `budget` against controller limits.
///   4. Execute `action` with `payload`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AgentProposal {
    /// The Agent's identity and capabilities.
    pub identity: AgentIdentity,
    /// Action to perform.
    pub action: String,
    /// Arguments for the action.
    pub payload: serde_json::Value,
    /// Budget for this specific action.
    pub budget: Option<Budget>,
    /// Nonce to prevent replay attacks.
    pub nonce: u64,
    /// ISO 8601 — proposal timestamp.
    pub timestamp: String,
}
