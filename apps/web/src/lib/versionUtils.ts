const SEMVER_PATTERN = /^v?(?<core>\d+(?:\.\d+)*)(?:-(?<prerelease>[0-9A-Za-z-.]+))?(?:\+[0-9A-Za-z-.]+)?$/;

type PrereleaseIdentifier = number | string;

interface ParsedVersion {
  core: number[];
  prerelease: PrereleaseIdentifier[] | null;
}

export const normalizeVersionTag = (value: string | null | undefined): string | null => {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
};

const parsePrereleaseIdentifier = (value: string): PrereleaseIdentifier =>
  /^\d+$/.test(value) ? Number(value) : value;

const parseVersion = (value: string): ParsedVersion | null => {
  const match = SEMVER_PATTERN.exec(value);
  if (!match?.groups?.core) {
    return null;
  }

  return {
    core: match.groups.core.split('.').map((segment) => Number(segment)),
    prerelease: match.groups.prerelease
      ? match.groups.prerelease.split('.').map(parsePrereleaseIdentifier)
      : null,
  };
};

const compareNumericSegments = (left: number[], right: number[]): number => {
  const segmentCount = Math.max(left.length, right.length);

  for (let index = 0; index < segmentCount; index += 1) {
    const leftSegment = left[index] ?? 0;
    const rightSegment = right[index] ?? 0;

    if (leftSegment !== rightSegment) {
      return leftSegment < rightSegment ? -1 : 1;
    }
  }

  return 0;
};

const comparePrerelease = (
  left: PrereleaseIdentifier[] | null,
  right: PrereleaseIdentifier[] | null,
): number => {
  if (!left && !right) {
    return 0;
  }

  if (!left) {
    return 1;
  }

  if (!right) {
    return -1;
  }

  const segmentCount = Math.max(left.length, right.length);

  for (let index = 0; index < segmentCount; index += 1) {
    const leftSegment = left[index];
    const rightSegment = right[index];

    if (leftSegment === undefined) {
      return -1;
    }

    if (rightSegment === undefined) {
      return 1;
    }

    if (leftSegment === rightSegment) {
      continue;
    }

    if (typeof leftSegment === 'number' && typeof rightSegment === 'number') {
      return leftSegment < rightSegment ? -1 : 1;
    }

    if (typeof leftSegment === 'number') {
      return -1;
    }

    if (typeof rightSegment === 'number') {
      return 1;
    }

    return leftSegment.localeCompare(rightSegment);
  }

  return 0;
};

export const compareAppVersions = (left: string | null | undefined, right: string | null | undefined): number => {
  const normalizedLeft = normalizeVersionTag(left);
  const normalizedRight = normalizeVersionTag(right);

  if (!normalizedLeft && !normalizedRight) {
    return 0;
  }

  if (!normalizedLeft) {
    return -1;
  }

  if (!normalizedRight) {
    return 1;
  }

  if (normalizedLeft === normalizedRight) {
    return 0;
  }

  const parsedLeft = parseVersion(normalizedLeft);
  const parsedRight = parseVersion(normalizedRight);

  if (!parsedLeft || !parsedRight) {
    return normalizedLeft.localeCompare(normalizedRight);
  }

  return compareNumericSegments(parsedLeft.core, parsedRight.core) || comparePrerelease(parsedLeft.prerelease, parsedRight.prerelease);
};
