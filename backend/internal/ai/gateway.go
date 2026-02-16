package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

// ──────────────────────────────────────────────
// Interfaz común para cualquier proveedor de IA
// ──────────────────────────────────────────────

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequest struct {
	SystemPrompt string
	Messages     []Message
	MaxTokens    int
}

type ChatResponse struct {
	Content      string
	PromptTokens int
	OutputTokens int
	Provider     string
}

type Provider interface {
	Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error)
	Name() string
}

// ──────────────────────────────────────────────
// Config para el gateway
// ──────────────────────────────────────────────

type GatewayConfig struct {
	Provider string
	APIKey   string
	Model    string
	BaseURL  string
}

// ──────────────────────────────────────────────
// Factory — crea un provider individual
// ──────────────────────────────────────────────

func NewProvider(cfg GatewayConfig) (Provider, error) {
	return newSingleProvider(cfg)
}

func newSingleProvider(cfg GatewayConfig) (Provider, error) {
	switch cfg.Provider {
	case "ollama":
		model := cfg.Model
		if model == "" {
			model = "llama3.1"
		}
		baseURL := cfg.BaseURL
		if baseURL == "" {
			baseURL = "http://localhost:11434"
		}
		return &OllamaProvider{baseURL: baseURL, model: model}, nil

	case "anthropic":
		if cfg.APIKey == "" {
			return nil, fmt.Errorf("ai: API key requerida para anthropic")
		}
		model := cfg.Model
		if model == "" {
			model = "claude-sonnet-4-5-20250929"
		}
		return &AnthropicProvider{apiKey: cfg.APIKey, model: model}, nil

	case "openai":
		if cfg.APIKey == "" {
			return nil, fmt.Errorf("ai: API key requerida para openai")
		}
		model := cfg.Model
		if model == "" {
			model = "gpt-4o-mini"
		}
		baseURL := cfg.BaseURL
		if baseURL == "" {
			baseURL = "https://api.openai.com/v1"
		}
		return &OpenAIProvider{apiKey: cfg.APIKey, model: model, baseURL: baseURL}, nil

	case "google":
		if cfg.APIKey == "" {
			return nil, fmt.Errorf("ai: API key requerida para google")
		}
		model := cfg.Model
		if model == "" {
			model = "gemini-2.0-flash"
		}
		return &GoogleProvider{apiKey: cfg.APIKey, model: model}, nil

	default:
		return nil, fmt.Errorf("ai: proveedor desconocido '%s'. Use: ollama, anthropic, openai, google", cfg.Provider)
	}
}

// ──────────────────────────────────────────────
// NewProviderWithFallback — provider principal + fallback automático
// ──────────────────────────────────────────────

func NewProviderWithFallback(primary GatewayConfig, fallback *GatewayConfig) (Provider, error) {
	main, err := newSingleProvider(primary)
	if err != nil {
		return nil, fmt.Errorf("ai: provider principal: %w", err)
	}

	if fallback == nil || fallback.Provider == "" {
		return main, nil
	}

	fb, err := newSingleProvider(*fallback)
	if err != nil {
		log.Printf("[WARN] ai: fallback provider '%s' no se pudo crear: %v — continuando sin fallback", fallback.Provider, err)
		return main, nil
	}

	log.Printf("[INFO] ai: fallback configurado: %s → %s", main.Name(), fb.Name())
	return &FallbackProvider{primary: main, fallback: fb}, nil
}

// ──────────────────────────────────────────────
// FALLBACK PROVIDER — intenta primary, si falla usa fallback
// ──────────────────────────────────────────────

type FallbackProvider struct {
	primary  Provider
	fallback Provider
}

func (p *FallbackProvider) Name() string {
	return p.primary.Name() + "+" + p.fallback.Name()
}

func (p *FallbackProvider) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	resp, err := p.primary.Chat(ctx, req)
	if err == nil {
		return resp, nil
	}

	log.Printf("[WARN] ai: provider primario '%s' falló: %v — intentando fallback '%s'",
		p.primary.Name(), err, p.fallback.Name())

	fbResp, fbErr := p.fallback.Chat(ctx, req)
	if fbErr != nil {
		return nil, fmt.Errorf("ai: ambos proveedores fallaron.\n  Primario (%s): %v\n  Fallback (%s): %v",
			p.primary.Name(), err, p.fallback.Name(), fbErr)
	}

	return fbResp, nil
}

// ──────────────────────────────────────────────
// OLLAMA (Local, gratis, sin API key)
// ──────────────────────────────────────────────

type OllamaProvider struct {
	baseURL string
	model   string
}

func (p *OllamaProvider) Name() string { return "ollama/" + p.model }

func (p *OllamaProvider) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	msgs := make([]map[string]string, 0, len(req.Messages)+1)
	if req.SystemPrompt != "" {
		msgs = append(msgs, map[string]string{
			"role":    "system",
			"content": req.SystemPrompt,
		})
	}
	for _, m := range req.Messages {
		msgs = append(msgs, map[string]string{
			"role":    m.Role,
			"content": m.Content,
		})
	}

	body := map[string]interface{}{
		"model":    p.model,
		"messages": msgs,
		"stream":   false,
	}

	jsonBody, _ := json.Marshal(body)

	url := p.baseURL + "/api/chat"
	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("ollama: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("ollama: no se pudo conectar a %s — ejecuta 'ollama serve' primero: %w", p.baseURL, err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("ollama: HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
		PromptEvalCount int `json:"prompt_eval_count"`
		EvalCount       int `json:"eval_count"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("ollama: parse error: %w", err)
	}

	return &ChatResponse{
		Content:      result.Message.Content,
		PromptTokens: result.PromptEvalCount,
		OutputTokens: result.EvalCount,
		Provider:     "ollama/" + p.model,
	}, nil
}

// ──────────────────────────────────────────────
// ANTHROPIC (Claude)
// ──────────────────────────────────────────────

type AnthropicProvider struct {
	apiKey string
	model  string
}

func (p *AnthropicProvider) Name() string { return "anthropic" }

func (p *AnthropicProvider) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	maxTokens := req.MaxTokens
	if maxTokens == 0 {
		maxTokens = 4096
	}

	msgs := make([]map[string]string, 0, len(req.Messages))
	for _, m := range req.Messages {
		if m.Role == "system" {
			continue
		}
		msgs = append(msgs, map[string]string{
			"role":    m.Role,
			"content": m.Content,
		})
	}

	body := map[string]interface{}{
		"model":      p.model,
		"max_tokens": maxTokens,
		"messages":   msgs,
	}
	if req.SystemPrompt != "" {
		body["system"] = req.SystemPrompt
	}

	jsonBody, _ := json.Marshal(body)

	httpReq, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("anthropic: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", p.apiKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("anthropic: request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("anthropic: HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
		Usage struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
		} `json:"usage"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("anthropic: parse error: %w", err)
	}

	text := ""
	for _, c := range result.Content {
		if c.Type == "text" {
			text += c.Text
		}
	}

	return &ChatResponse{
		Content:      text,
		PromptTokens: result.Usage.InputTokens,
		OutputTokens: result.Usage.OutputTokens,
		Provider:     "anthropic",
	}, nil
}

// ──────────────────────────────────────────────
// OPENAI (GPT + compatibles: Groq, Together, etc.)
// ──────────────────────────────────────────────

type OpenAIProvider struct {
	apiKey  string
	model   string
	baseURL string
}

func (p *OpenAIProvider) Name() string {
	if p.baseURL != "" && p.baseURL != "https://api.openai.com/v1" {
		return "openai-compatible/" + p.model
	}
	return "openai/" + p.model
}

func (p *OpenAIProvider) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	maxTokens := req.MaxTokens
	if maxTokens == 0 {
		maxTokens = 4096
	}

	msgs := make([]map[string]string, 0, len(req.Messages)+1)
	if req.SystemPrompt != "" {
		msgs = append(msgs, map[string]string{
			"role":    "system",
			"content": req.SystemPrompt,
		})
	}
	for _, m := range req.Messages {
		msgs = append(msgs, map[string]string{
			"role":    m.Role,
			"content": m.Content,
		})
	}

	body := map[string]interface{}{
		"model":      p.model,
		"max_tokens": maxTokens,
		"messages":   msgs,
	}

	jsonBody, _ := json.Marshal(body)

	baseURL := p.baseURL
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}
	endpoint := baseURL + "/chat/completions"

	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("openai: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("openai: request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("openai: HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Usage struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
		} `json:"usage"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("openai: parse error: %w", err)
	}

	text := ""
	if len(result.Choices) > 0 {
		text = result.Choices[0].Message.Content
	}

	return &ChatResponse{
		Content:      text,
		PromptTokens: result.Usage.PromptTokens,
		OutputTokens: result.Usage.CompletionTokens,
		Provider:     p.Name(),
	}, nil
}

// ──────────────────────────────────────────────
// GOOGLE (Gemini)
// ──────────────────────────────────────────────

type GoogleProvider struct {
	apiKey string
	model  string
}

func (p *GoogleProvider) Name() string { return "google/" + p.model }

func (p *GoogleProvider) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	maxTokens := req.MaxTokens
	if maxTokens == 0 {
		maxTokens = 4096
	}

	contents := make([]map[string]interface{}, 0)

	for _, m := range req.Messages {
		role := m.Role
		if role == "assistant" {
			role = "model"
		}
		contents = append(contents, map[string]interface{}{
			"role": role,
			"parts": []map[string]string{
				{"text": m.Content},
			},
		})
	}

	body := map[string]interface{}{
		"contents": contents,
		"generationConfig": map[string]interface{}{
			"maxOutputTokens": maxTokens,
		},
	}

	if req.SystemPrompt != "" {
		body["systemInstruction"] = map[string]interface{}{
			"parts": []map[string]string{
				{"text": req.SystemPrompt},
			},
		}
	}

	jsonBody, _ := json.Marshal(body)

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", p.model, p.apiKey)

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("google: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("google: request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("google: HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
		UsageMetadata struct {
			PromptTokenCount     int `json:"promptTokenCount"`
			CandidatesTokenCount int `json:"candidatesTokenCount"`
		} `json:"usageMetadata"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("google: parse error: %w", err)
	}

	text := ""
	if len(result.Candidates) > 0 && len(result.Candidates[0].Content.Parts) > 0 {
		text = result.Candidates[0].Content.Parts[0].Text
	}

	return &ChatResponse{
		Content:      text,
		PromptTokens: result.UsageMetadata.PromptTokenCount,
		OutputTokens: result.UsageMetadata.CandidatesTokenCount,
		Provider:     "google/" + p.model,
	}, nil
}