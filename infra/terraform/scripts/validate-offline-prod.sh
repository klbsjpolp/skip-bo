#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/../../.." && pwd)"
prod_dir="$repo_root/infra/terraform/envs/prod"
backend_file="$prod_dir/backend.tf"
backend_backup=""
tf_data_dir="$(mktemp -d)"

restore_backend() {
  if [[ -n "$backend_backup" && -f "$backend_backup" ]]; then
    mv "$backend_backup" "$backend_file"
  fi

  rm -rf "$tf_data_dir"
}

trap restore_backend EXIT

if [[ -f "$backend_file" ]]; then
  backend_backup="$(mktemp "$prod_dir/backend.tf.offline.XXXXXX")"
  mv "$backend_file" "$backend_backup"
fi

TF_DATA_DIR="$tf_data_dir" tofu -chdir="$prod_dir" init -backend=false
TF_DATA_DIR="$tf_data_dir" tofu -chdir="$prod_dir" validate
TF_DATA_DIR="$tf_data_dir" tofu -chdir="$prod_dir" plan -input=false -lock=false -refresh=false
