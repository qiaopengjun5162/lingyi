use lingyi_protocol::types::*;

/// Convert an AnalysisContext into an LLM prompt string.
/// The prompt instructs the model to return a JSON string matching CoachResponse.
pub fn build_prompt(ctx: &AnalysisContext) -> String {
    let persona_prompt = match ctx.coaching_style {
        CoachingStyle::Strict => {
            "角色：你是一位资深的中国象棋教练，风格严厉、一针见血。\n\
             原则：话说得重，但句句在理。你的目标是让棋手听了之后恍然大悟，而不是感到被冒犯。"
        }
        CoachingStyle::Gentle => {
            "角色：你是一位温暖有耐心的中国象棋教练，风格鼓励、循循善诱。\n\
             原则：先肯定再引导，帮助棋手建立信心，逐步提升。"
        }
    };

    let side_str = match ctx.game_state.side_to_move {
        Side::Red => "红方",
        Side::Black => "黑方",
    };

    let phase_str = match ctx.engine.game_phase {
        GamePhase::Opening => "开局",
        GamePhase::Middlegame => "中局",
        GamePhase::Endgame => "残局",
    };

    let profile_section = ctx
        .user_profile
        .as_ref()
        .map(|p| {
            format!(
                "## 用户档案\n\
                 - 近期连败：{} 局\n\
                 - 常见弱点：{}\n\
                 - 擅长领域：{}\n\
                 - 棋力评分：{}",
                p.recent_losses,
                p.known_weaknesses.join("、"),
                p.known_strengths.join("、"),
                p.rating.map(|r| r.to_string()).unwrap_or("未知".into()),
            )
        })
        .unwrap_or_default();

    let moments_section = if ctx.key_moments.is_empty() {
        String::new()
    } else {
        format!(
            "## 关键信息\n{}",
            ctx.key_moments
                .iter()
                .map(|m| format!("- {}", m))
                .collect::<Vec<_>>()
                .join("\n")
        )
    };

    let focus_note = ctx.focus_area.as_ref().map(|f| {
        format!(
            "\n重点关注：{}",
            match f {
                FocusArea::Opening => "开局阶段的分析",
                FocusArea::Middlegame => "中局战术与计算",
                FocusArea::Endgame => "残局攻防技巧",
                FocusArea::Tactics => "战术组合",
                FocusArea::Positional => "局面判断与子力调配",
                FocusArea::Psychology => "心态与决策心理",
            }
        )
    }).unwrap_or_default();

    format!(
        r#"{persona_prompt}

## 当前局面信息
- 轮到谁走：{side_str}
- 局面阶段：{phase_str}
- 当前评估：{evaluation}
- 棋谱记录：{moves}{focus_note}

{moments_section}

## 引擎分析
- 最佳走法：{best_move}（评分 {score}，深度 {depth}）
- 候选走法：
{candidates}
- 战术特征：{flags}

{profile_section}

## 输出要求
请用一句话给出犀利的评语，然后给出简短理由。

直接输出评语文本，不要 JSON 包装，不要多余格式。
评语风格：犀利、一针见血、不说场面话。"#,
        persona_prompt = persona_prompt,
        side_str = side_str,
        phase_str = phase_str,
        evaluation = ctx.current_evaluation,
        moves = ctx.game_state.move_history.join(" → "),
        focus_note = focus_note,
        moments_section = moments_section,
        best_move = ctx.engine.best_move.move_str,
        score = ctx.engine.best_move.score,
        depth = ctx.engine.best_move.depth,
        candidates = ctx
            .engine
            .top_moves
            .iter()
            .enumerate()
            .map(|(i, m)| format!("  {}. {}（{}）", i + 1, m.move_str, m.score))
            .collect::<Vec<_>>()
            .join("\n"),
        flags = if ctx.engine.flags.is_empty() {
            "无显著特征".into()
        } else {
            ctx.engine.flags.join("、")
        },
        profile_section = profile_section,
    )
}
