//! DeepSeek API 客户端
//!
//! # 架构
//!
//! ```text
//! ApiClient (stateless, lightweight)
//!   │
//!   ├── new()              — 从环境变量读取 API Key
//!   ├── chat()             — 发送消息列表，返回完整响应
//!   └── chat_streaming()   — [TODO] 流式响应（逐字输出）
//!
//! 数据流：
//!   1. build_system_prompt() + build_user_prompt() 组装消息
//!   2. chat() → POST https://api.deepseek.com/v1/chat/completions
//!   3. 解析 ChatCompletionResponse → 提取 assistant 消息
//! ```
//!
//! # 安全
//!
//! API Key **只从环境变量 `DEEPSEEK_API_KEY` 读取**，不进代码。
//! 调用方在运行前 export：
//! ```bash
//! export DEEPSEEK_API_KEY=sk-xxx
//! ```

use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// DeepSeek Chat Completions API 的请求/响应模型
// 字段命名使用 snake_case，通过 serde 的 rename_all 自动转为 camelCase
// 以对齐 DeepSeek API 的 JSON 格式。
// ---------------------------------------------------------------------------

/// 一条对话消息的角色。
#[derive(Debug, Serialize, Deserialize)]
struct ChatMessage {
    pub role: String,
    pub content: String,
}

/// Chat Completions 请求体。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ChatCompletionRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub temperature: f32,
    pub max_tokens: u32,
}

#[allow(dead_code)] // 字段仅用于 JSON 反序列化
/// 一条候选输出的 token 用量。
#[derive(Debug, Deserialize)]
struct Usage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[allow(dead_code)]
/// Chat Completions 响应中的单一候选。
#[derive(Debug, Deserialize)]
struct ChatChoice {
    pub index: u32,
    pub message: ChatMessage,
    pub finish_reason: String,
}

#[allow(dead_code)]
/// Chat Completions 完整响应。
#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    pub id: String,
    pub choices: Vec<ChatChoice>,
    pub usage: Usage,
}

// ---------------------------------------------------------------------------
// 库的公开错误类型
// ---------------------------------------------------------------------------

/// API 调用过程中可能发生的错误。
#[derive(Debug)]
pub enum ApiError {
    /// 环境变量 `DEEPSEEK_API_KEY` 未设置。
    MissingApiKey,
    /// HTTP 请求失败（网络、超时等）。
    RequestError(String),
    /// API 返回了非 2xx 状态码。
    ApiError { status: u16, body: String },
    /// 响应体解析失败（JSON 格式异常）。
    ParseError(String),
}

impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ApiError::MissingApiKey => {
                write!(f, "环境变量 DEEPSEEK_API_KEY 未设置。运行前请 export DEEPSEEK_API_KEY=sk-xxx")
            }
            ApiError::RequestError(msg) => write!(f, "HTTP 请求失败: {}", msg),
            ApiError::ApiError { status, body } => {
                write!(f, "API 返回错误 ({}): {}", status, body)
            }
            ApiError::ParseError(msg) => write!(f, "响应解析失败: {}", msg),
        }
    }
}

impl std::error::Error for ApiError {}

// ---------------------------------------------------------------------------
// 客户端
// ---------------------------------------------------------------------------

/// DeepSeek API 客户端。
///
/// 使用方法：
/// ```no_run
/// use lingyi_agent::api::ApiClient;
///
/// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
/// let client = ApiClient::new()?;
/// let reply = client
///     .chat(vec![
///         ("system".into(), "你是一位象棋教练".into()),
///         ("user".into(), "分析这步棋".into()),
///     ])
///     .await?;
/// println!("{}", reply);
/// # Ok(())
/// # }
/// ```
pub struct ApiClient {
    api_key: String,
    base_url: String,
    http_client: reqwest::Client,
}

impl ApiClient {
    /// 创建一个新客户端。
    ///
    /// 从环境变量 `DEEPSEEK_API_KEY` 读取 API Key，若未设置则返回
    /// [`ApiError::MissingApiKey`]。
    pub fn new() -> Result<Self, ApiError> {
        let api_key = std::env::var("DEEPSEEK_API_KEY")
            .map_err(|_| ApiError::MissingApiKey)?;

        Ok(Self {
            api_key,
            base_url: "https://api.deepseek.com/v1/chat/completions".into(),
            http_client: reqwest::Client::new(),
        })
    }

    /// 发送一组消息给 DeepSeek，返回模型回复的文本。
    ///
    /// `messages` 是一个 (role, content) 元组向量，
    /// role 可以是 "system"、"user" 或 "assistant"。
    pub async fn chat(
        &self,
        messages: Vec<(String, String)>,
    ) -> Result<String, ApiError> {
        let req_body = ChatCompletionRequest {
            model: "deepseek-chat".into(),
            messages: messages
                .into_iter()
                .map(|(role, content)| ChatMessage { role, content })
                .collect(),
            temperature: 0.7,
            max_tokens: 500,
        };

        let resp = self
            .http_client
            .post(&self.base_url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&req_body)
            .send()
            .await
            .map_err(|e| ApiError::RequestError(e.to_string()))?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp
                .text()
                .await
                .unwrap_or_else(|_| "无法读取响应体".into());
            return Err(ApiError::ApiError {
                status: status.as_u16(),
                body,
            });
        }

        let body_text = resp
            .text()
            .await
            .map_err(|e| ApiError::ParseError(format!("无法读取响应体: {}", e)))?;

        let completion: ChatCompletionResponse = serde_json::from_str(&body_text)
            .map_err(|e| ApiError::ParseError(format!("JSON 解析失败: {}", e)))?;

        completion
            .choices
            .into_iter()
            .next()
            .map(|c| c.message.content)
            .ok_or_else(|| ApiError::ParseError("API 返回了空的 choices 数组".into()))
    }

    /// 更新 API 基础 URL（用于测试或切换模型端点）。
    #[allow(dead_code)]
    pub fn with_base_url(mut self, base_url: &str) -> Self {
        self.base_url = base_url.to_string();
        self
    }
}
