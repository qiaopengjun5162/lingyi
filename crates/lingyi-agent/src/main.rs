//! Lingyi 教练引擎 — DeepSeek API 测试入口
//!
//! ## 用途
//!
//! 读取 `lingyi-protocol` 中的示例棋局，通过 `prompt` 模块构建系统提示词，
//! 调用 DeepSeek API，输出 AI 教练评语。
//!
//! ## 运行方式
//!
//! ```bash
//! export DEEPSEEK_API_KEY=sk-xxx
//! cargo run -p lingyi-agent
//! ```
//!
//! ## 架构
//!
//! 1. 从 `lingyi_protocol::examples` 加载两个示例棋局
//! 2. 调用 `prompt::build_prompt()` 将其转为用户提示词
//! 3. 组合 system prompt（角色设定）+ user prompt（局面分析）发送给 DeepSeek
//! 4. 打印 AI 教练的评语

use lingyi_protocol::examples;
use lingyi_protocol::types::AnalysisContext;
use lingyi_agent::api::ApiClient;
use lingyi_agent::prompt;

/// 系统提示词（角色设定），独立于具体局面。
const SYSTEM_PROMPT: &str = r#"你是一位资深的中国象棋教练，风格严厉、一针见血。
你的观察力极其敏锐，能从一步棋背后看穿棋手的思维盲区。
你从不给出具体走法，而是指出问题的本质，让棋手自己领悟。

规则：
1. 每次只说 1-2 句话，切中要害
2. 不替用户走棋，只说方向性洞察
3. 不评价"好"或"坏"，而是指出"为什么这步棋有问题"
4. 语气犀利，但不刻薄伤人"#;

/// 运行一个场景：构建 prompt → 调 API → 打印结果。
async fn run_scenario(
    client: &ApiClient,
    name: &str,
    ctx: &AnalysisContext,
) -> Result<(), Box<dyn std::error::Error>> {
    println!("══════════ {} ══════════", name);
    println!("当前评估：{}\n", ctx.current_evaluation);

    let user_prompt = prompt::build_prompt(ctx);

    match client
        .chat(vec![
            ("system".into(), SYSTEM_PROMPT.into()),
            ("user".into(), user_prompt),
        ])
        .await
    {
        Ok(reply) => {
            println!("💬 灵弈教练：\n{}\n", reply);
        }
        Err(e) => {
            eprintln!("❌ API 调用失败: {}", e);
        }
    }

    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok(); // 从 .env 文件加载环境变量（如果存在）
    println!("🏮 灵弈 — AI 象棋教练引擎\n");

    // 检查环境变量（不打印 key）
    if std::env::var("DEEPSEEK_API_KEY").is_err() {
        eprintln!("❌ 请先设置环境变量：export DEEPSEEK_API_KEY=sk-xxx");
        std::process::exit(1);
    }

    let client = ApiClient::new()?;

    let s1 = examples::losing_trap_context();
    let s2 = examples::winning_position_context();
    let s3 = examples::brilliant_move_context();
    let s4 = examples::classic_blunder_context();

    let scenarios: [(&str, &AnalysisContext); 4] = [
        ("局面一：劣后教训 — 少一车，左翼空虚", &s1),
        ("局面二：优势提醒 — 双车对单车，谨慎收官", &s2),
        ("局面三：精妙绝杀 — 弃车入局", &s3),
        ("局面四：开局随手 — 跳马丢车", &s4),
    ];

    for (name, ctx) in &scenarios {
        run_scenario(&client, name, ctx).await?;
    }

    Ok(())
}
