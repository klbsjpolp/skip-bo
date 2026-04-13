export interface RuntimeConfig {
  apiBaseUrl?: string;
  appVersion?: string;
  minimumSupportedVersion?: string;
}

const RUNTIME_CONFIG_URL = `${import.meta.env.BASE_URL}runtime-config.json`;

let cachedRuntimeConfig: RuntimeConfig = {};
let runtimeConfigPromise: Promise<RuntimeConfig> | null = null;

const fetchRuntimeConfigFromNetwork = async (): Promise<RuntimeConfig | null> =>
  fetch(RUNTIME_CONFIG_URL, {
    cache: 'no-store',
  })
    .then(async (response) => {
      if (!response.ok) {
        return {};
      }

      return (await response.json()) as RuntimeConfig;
    })
    .catch(() => null);

export const fetchRuntimeConfig = async ({force = false}: {force?: boolean} = {}): Promise<RuntimeConfig> => {
  if (force || !runtimeConfigPromise) {
    runtimeConfigPromise = fetchRuntimeConfigFromNetwork().then((runtimeConfig) => {
      if (runtimeConfig) {
        cachedRuntimeConfig = runtimeConfig;
      }

      return cachedRuntimeConfig;
    });
  }

  return runtimeConfigPromise;
};

export const clearRuntimeConfigCache = () => {
  cachedRuntimeConfig = {};
  runtimeConfigPromise = null;
};
