from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "PBL Evaluator"
    debug: bool = False

    # Database
    database_url: str = "postgresql://pbl:pbl@localhost:5432/pbl_evaluator"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Anthropic
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"

    # Evaluation
    llm_threshold: int = 80  # Rule score below this triggers LLM evaluation
    rule_weight: float = 0.4
    llm_weight: float = 0.6

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
