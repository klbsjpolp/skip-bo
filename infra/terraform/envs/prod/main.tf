locals {
  app_name = "${var.app_name}-${var.environment}"
  common_tags = merge({
    Environment = var.environment
    ManagedBy   = "opentofu"
    Project     = "skip-bo"
    Service     = "realtime-api"
  }, var.extra_tags)
  sentry_enabled = trimspace(coalesce(var.sentry_dsn, "")) != ""
  sentry_environment_variables = local.sentry_enabled ? merge({
    SENTRY_DSN         = trimspace(var.sentry_dsn)
    SENTRY_ENVIRONMENT = var.environment
    }, trimspace(coalesce(var.sentry_release, "")) != "" ? {
    SENTRY_RELEASE = trimspace(var.sentry_release)
    } : {}, var.sentry_traces_sample_rate == null ? {} : {
    SENTRY_TRACES_SAMPLE_RATE = tostring(var.sentry_traces_sample_rate)
  }) : {}
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
  environment_variables   = local.sentry_environment_variables
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
  source                = "../../modules/monitoring"
  alarm_topic_arn       = var.alarm_topic_arn
  app_name              = local.app_name
  lambda_function_names = values(module.realtime_api.lambda_function_names)
  tags                  = local.common_tags
}
