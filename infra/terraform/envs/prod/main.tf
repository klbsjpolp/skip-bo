locals {
  app_name = "${var.app_name}-${var.environment}"
  common_tags = merge({
    Environment = var.environment
    ManagedBy   = "opentofu"
    Project     = "skip-bo"
    Service     = "realtime-api"
  }, var.extra_tags)
  sentry_dsn_value                = var.sentry_dsn == null ? "" : trimspace(var.sentry_dsn)
  sentry_release_value            = var.sentry_release == null ? "" : trimspace(var.sentry_release)
  sentry_enabled                  = local.sentry_dsn_value != ""
  sentry_traces_sample_rate_value = var.sentry_traces_sample_rate == null ? 1 : var.sentry_traces_sample_rate
  bedrock_model_id_value          = var.bedrock_model_id == null ? "" : trimspace(var.bedrock_model_id)
  bedrock_region_value            = var.bedrock_region == null ? "" : trimspace(var.bedrock_region)
  ollama_base_url_value           = var.ollama_base_url == null ? "" : trimspace(var.ollama_base_url)
  ollama_model_value              = var.ollama_model == null ? "" : trimspace(var.ollama_model)
  sentry_release_environment_variables = local.sentry_release_value != "" ? {
    SENTRY_RELEASE = local.sentry_release_value
  } : {}
  sentry_environment_variables = local.sentry_enabled ? merge({
    SENTRY_DSN                = local.sentry_dsn_value
    SENTRY_ENVIRONMENT        = var.environment
    SENTRY_TRACES_SAMPLE_RATE = tostring(local.sentry_traces_sample_rate_value)
  }, local.sentry_release_environment_variables) : {}
  genai_bedrock_environment_variables = merge(
    local.bedrock_model_id_value != "" ? { BEDROCK_MODEL_ID = local.bedrock_model_id_value } : {},
    local.bedrock_region_value != "" ? { BEDROCK_REGION = local.bedrock_region_value } : {}
  )
  genai_ollama_environment_variables = merge(
    local.ollama_base_url_value != "" ? { OLLAMA_BASE_URL = local.ollama_base_url_value } : {},
    local.ollama_model_value != "" ? { OLLAMA_MODEL = local.ollama_model_value } : {}
  )
  genai_environment_variables = merge({
    GENAI_PROVIDER   = var.genai_provider
    GENAI_TIMEOUT_MS = tostring(var.genai_timeout_ms)
  }, local.genai_bedrock_environment_variables, local.genai_ollama_environment_variables)
  lambda_environment_variables = merge(local.sentry_environment_variables, local.genai_environment_variables)
}

data "archive_file" "realtime_api" {
  type        = "zip"
  source_dir  = abspath(var.lambda_source_dir)
  output_path = "${path.root}/realtime-api.zip"
}

module "dynamodb" {
  source   = "../../modules/dynamodb"
  app_name = local.app_name
  tags     = local.common_tags
}

module "iam" {
  source                          = "../../modules/iam"
  app_name                        = local.app_name
  aws_region                      = var.aws_region
  connections_room_code_index_arn = module.dynamodb.connections_room_code_index_arn
  connections_table_arn           = module.dynamodb.connections_table_arn
  rooms_table_arn                 = module.dynamodb.rooms_table_arn
  tags                            = local.common_tags
}

module "realtime_api" {
  source                  = "../../modules/realtime_api"
  app_name                = local.app_name
  aws_region              = var.aws_region
  connections_table_name  = module.dynamodb.connections_table_name
  environment_variables   = local.lambda_environment_variables
  http_allowed_origins    = var.allowed_origins
  lambda_role_arn         = module.iam.lambda_role_arn
  lambda_source_code_hash = data.archive_file.realtime_api.output_base64sha256
  lambda_zip_path         = data.archive_file.realtime_api.output_path
  log_retention_days      = var.log_retention_days
  rooms_table_name        = module.dynamodb.rooms_table_name
  stage_name              = var.stage_name
  tags                    = local.common_tags
}

module "monitoring" {
  source                    = "../../modules/monitoring"
  alarm_topic_arn           = var.alarm_topic_arn
  app_name                  = local.app_name
  lambda_function_names     = [for k, v in module.realtime_api.lambda_function_names : v if !startswith(k, "ai-")]
  dynamodb_table_names      = [module.dynamodb.rooms_table_name, module.dynamodb.connections_table_name]
  api_gateway_http_ids      = [module.realtime_api.http_api_id]
  api_gateway_websocket_ids = [module.realtime_api.websocket_api_id]
  tags                      = local.common_tags
}
