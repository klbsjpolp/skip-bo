import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const defaultEnvPath = resolve(packageRoot, '.env.local');
const envNamePattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

const findAssignmentIndex = (line: string): number => {
  let isEscaped = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '\\' && !isEscaped) {
      isEscaped = true;
      continue;
    }

    if (character === '=' && !isEscaped) {
      return index;
    }

    isEscaped = false;
  }

  return -1;
};

const stripInlineComment = (value: string): string => {
  const commentIndex = value.search(/\s#/);

  return commentIndex >= 0 ? value.slice(0, commentIndex).trimEnd() : value;
};

const unquoteValue = (value: string): string => {
  const trimmedValue = stripInlineComment(value.trim());
  const quote = trimmedValue[0];

  if (
    trimmedValue.length >= 2 &&
    (quote === '"' || quote === "'") &&
    trimmedValue[trimmedValue.length - 1] === quote
  ) {
    const innerValue = trimmedValue.slice(1, -1);

    if (quote === '"') {
      return innerValue
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }

    return innerValue;
  }

  return trimmedValue;
};

export const loadLocalEnvFile = (envPath = defaultEnvPath): boolean => {
  if (!existsSync(envPath)) {
    return false;
  }

  const contents = readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const assignmentLine = line.startsWith('export ') ? line.slice('export '.length).trimStart() : line;
    const assignmentIndex = findAssignmentIndex(assignmentLine);

    if (assignmentIndex <= 0) {
      continue;
    }

    const name = assignmentLine.slice(0, assignmentIndex).trim();

    if (!envNamePattern.test(name) || process.env[name] !== undefined) {
      continue;
    }

    process.env[name] = unquoteValue(assignmentLine.slice(assignmentIndex + 1));
  }

  return true;
};
