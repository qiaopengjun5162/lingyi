use crate::types::*;

/// A position where the player just made a serious mistake (losing a rook).
pub fn losing_trap_context() -> AnalysisContext {
    AnalysisContext {
        game_state: GameState {
            fen: "2bak4/4a4/4b4/9/9/9/9/4C4/3R1K3/9 w".into(),
            move_history: vec![
                "炮二平五".into(),
                "马8进7".into(),
                "马二进三".into(),
                "车9平8".into(),
                "车一进二".into(),
                "炮2进4".into(),
            ],
            game_type: GameType::ChineseChess,
            side_to_move: Side::Red,
        },
        engine: EngineAnalysis {
            best_move: TopMove {
                move_str: "车一平二".into(),
                score: -1.5,
                depth: 18,
            },
            top_moves: vec![
                TopMove { move_str: "车一平二".into(), score: -1.5, depth: 18 },
                TopMove { move_str: "仕四进五".into(), score: -2.0, depth: 16 },
                TopMove { move_str: "相七进五".into(), score: -2.3, depth: 16 },
            ],
            game_phase: GamePhase::Middlegame,
            flags: vec!["子力落后".into(), "对方车炮压制".into()],
        },
        user_profile: Some(UserProfile {
            recent_losses: 3,
            known_weaknesses: vec!["布局应对不当".into(), "中局计算深度不足".into()],
            known_strengths: vec!["残局".into()],
            rating: Some(1600),
        }),
        coaching_style: CoachingStyle::Strict,
        focus_area: Some(FocusArea::Middlegame),
        current_evaluation: "红方少一车，局面被动".into(),
        key_moments: vec![
            "第6回合黑炮过河，红方没有及时应对".into(),
            "红方阵型左翼空虚".into(),
        ],
    }
}

/// A position where the player is in a winning position.
pub fn winning_position_context() -> AnalysisContext {
    AnalysisContext {
        game_state: GameState {
            fen: "4kab2/4a4/4b4/9/9/2R6/9/3R5/4K4/9 w".into(),
            move_history: vec![
                "车一进四".into(),
                "士6进5".into(),
                "车九平六".into(),
                "将5平6".into(),
            ],
            game_type: GameType::ChineseChess,
            side_to_move: Side::Red,
        },
        engine: EngineAnalysis {
            best_move: TopMove {
                move_str: "车六进六".into(),
                score: 3.0,
                depth: 20,
            },
            top_moves: vec![
                TopMove { move_str: "车六进六".into(), score: 3.0, depth: 20 },
                TopMove { move_str: "车一平四".into(), score: 2.5, depth: 18 },
            ],
            game_phase: GamePhase::Endgame,
            flags: vec!["子力优势".into(), "双车".into()],
        },
        user_profile: Some(UserProfile {
            recent_losses: 1,
            known_weaknesses: vec!["优势局面下容易松懈".into()],
            known_strengths: vec!["进攻".into()],
            rating: Some(1700),
        }),
        coaching_style: CoachingStyle::Strict,
        focus_area: Some(FocusArea::Endgame),
        current_evaluation: "红方双车对黑方单车，优势明显".into(),
        key_moments: vec!["黑将已被逼上二楼".into(), "注意黑方有兑车陷阱".into()],
    }
}

/// A brilliant move: player found a stunning rook sacrifice to force checkmate.
pub fn brilliant_move_context() -> AnalysisContext {
    AnalysisContext {
        game_state: GameState {
            fen: "3k1ab2/4a4/4b4/9/2R6/9/9/3R5/4K4/9 w".into(),
            move_history: vec![
                "车八进五".into(),
                "士5退4".into(),
                "车四进三".into(),
            ],
            game_type: GameType::ChineseChess,
            side_to_move: Side::Red,
        },
        engine: EngineAnalysis {
            best_move: TopMove { move_str: "车四进一".into(), score: 8.0, depth: 22 },
            top_moves: vec![
                TopMove { move_str: "车四进一".into(), score: 8.0, depth: 22 },
                TopMove { move_str: "车八平六".into(), score: 1.2, depth: 18 },
            ],
            game_phase: GamePhase::Endgame,
            flags: vec!["绝杀".into(), "弃车".into()],
        },
        user_profile: Some(UserProfile {
            recent_losses: 0,
            known_weaknesses: vec!["中局计算".into()],
            known_strengths: vec!["残局攻杀".into(), "战术组合".into()],
            rating: Some(1850),
        }),
        coaching_style: CoachingStyle::Strict,
        focus_area: Some(FocusArea::Tactics),
        current_evaluation: "红方弃车绝杀，胜势已成".into(),
        key_moments: vec!["红方第3步车四进三是精妙的弃车引离".into(), "黑将已无路可逃".into()],
    }
}

/// Classic blunder: hung a rook to a basic horse fork in the opening.
pub fn classic_blunder_context() -> AnalysisContext {
    AnalysisContext {
        game_state: GameState {
            fen: "rnbakabnr/9/1c5c1/p1p1p1p1p/2N6/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w".into(),
            move_history: vec![
                "炮二平五".into(),
                "马8进7".into(),
                "马二进三".into(),
                "车9平8".into(),
                "马八进七".into(),
                "炮8进4".into(),
                "马七进六".into(),
                "炮2进4".into(),
            ],
            game_type: GameType::ChineseChess,
            side_to_move: Side::Red,
        },
        engine: EngineAnalysis {
            best_move: TopMove { move_str: "马六进七".into(), score: -3.0, depth: 16 },
            top_moves: vec![
                TopMove { move_str: "马六进七".into(), score: -3.0, depth: 16 },
                TopMove { move_str: "车九进一".into(), score: -0.5, depth: 14 },
            ],
            game_phase: GamePhase::Opening,
            flags: vec!["丢子".into(), "随手棋".into()],
        },
        user_profile: Some(UserProfile {
            recent_losses: 5,
            known_weaknesses: vec!["开局不熟".into(), "随手棋多".into()],
            known_strengths: vec![].into(),
            rating: Some(1200),
        }),
        coaching_style: CoachingStyle::Strict,
        focus_area: Some(FocusArea::Opening),
        current_evaluation: "红方开局随手跳马丢车，局面被动".into(),
        key_moments: vec!["红方第7步马七进六被黑炮串打车马".into(), "中兵已失守".into()],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_losing_serialize() {
        let ctx = losing_trap_context();
        let json = serde_json::to_string(&ctx).unwrap();
        let back: AnalysisContext = serde_json::from_str(&json).unwrap();
        assert_eq!(ctx.game_state.fen, back.game_state.fen);
        assert_eq!(ctx.engine.best_move.score, back.engine.best_move.score);
    }

    #[test]
    fn test_winning_serialize() {
        let ctx = winning_position_context();
        let json = serde_json::to_string_pretty(&ctx).unwrap();
        let back: AnalysisContext = serde_json::from_str(&json).unwrap();
        assert_eq!(ctx.game_state.side_to_move, back.game_state.side_to_move);
        assert_eq!(ctx.engine.game_phase, back.engine.game_phase);
    }

    #[test]
    fn test_coach_response_roundtrip() {
        let response = CoachResponse {
            message: "这步棋太软了，你的车在角落里睡大觉。".into(),
            response_type: ResponseType::Warning,
            focus_area: Some(FocusArea::Tactics),
        };
        let json = serde_json::to_string(&response).unwrap();
        let back: CoachResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(response.message, back.message);
        assert_eq!(response.response_type, back.response_type);
    }

    #[test]
    fn test_agent_identity_roundtrip() {
        let identity = AgentIdentity {
            iss: "did:key:z6MkhaXgB".into(),
            sub: AgentId("did:agent:lingyi-coach-v1".into()),
            controller: "did:key:z6MkhaXgB".into(),
            capabilities: vec![
                Capability { action: "evaluate_position".into(), resource: "fen:*".into() },
                Capability { action: "generate_commentary".into(), resource: "analysis:*".into() },
            ],
            endpoint: Some("https://api.lingyi.ai/agent/coach-v1".into()),
            provenance: Some("ipfs://QmX...".into()),
            issued_at: "2026-05-26T00:00:00Z".into(),
            expires_at: Some("2026-06-26T00:00:00Z".into()),
            signature: Some("0x...".into()),
        };
        let json = serde_json::to_string(&identity).unwrap();
        let back: AgentIdentity = serde_json::from_str(&json).unwrap();
        assert_eq!(identity.sub.0, back.sub.0);
        assert_eq!(identity.capabilities.len(), back.capabilities.len());
    }

    #[test]
    fn test_agent_proposal_serialize() {
        let proposal = AgentProposal {
            identity: AgentIdentity {
                iss: "did:key:z6MkhaXgB".into(),
                sub: AgentId("did:agent:lingyi-coach-v1".into()),
                controller: "did:key:z6MkhaXgB".into(),
                capabilities: vec![],
                endpoint: None,
                provenance: None,
                issued_at: "2026-05-26T00:00:00Z".into(),
                expires_at: None,
                signature: None,
            },
            action: "generate_commentary".into(),
            payload: serde_json::json!({"fen": "rnbakabnr/9/...", "style": "strict"}),
            budget: Some(Budget {
                max_tokens: 4096,
                max_compute: 10,
                max_payment: Some(100),
                currency: Some("USDC".into()),
            }),
            nonce: 42,
            timestamp: "2026-05-26T00:00:00Z".into(),
        };
        let json = serde_json::to_string_pretty(&proposal).unwrap();
        assert!(json.contains("generate_commentary"));
        assert!(json.contains("USDC"));
        let back: AgentProposal = serde_json::from_str(&json).unwrap();
        assert_eq!(back.nonce, 42);
    }

    #[test]
    fn test_json_structure() {
        let ctx = losing_trap_context();
        let val = serde_json::to_value(&ctx).unwrap();
        assert_eq!(val["game_state"]["game_type"], "ChineseChess");
        assert_eq!(val["coaching_style"], "Strict");
    }
}
