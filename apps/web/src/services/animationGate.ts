import { fromPromise } from 'xstate';

type AnimationGateInput = {
  duration: number;
  /** Injected by the machine from its AnimationDriver (no global bridge). */
  waitForAnimations: () => Promise<void>;
};

export const animationGate = fromPromise(async ({ input }: { input: AnimationGateInput }) => {
  // Create a timeout promise that resolves after the given duration.
  // This acts as a fallback or minimum wait time.
  const timeoutPromise = new Promise((resolve) => setTimeout(resolve, input.duration));

  // Get the promise that resolves when all current animations are complete.
  const animationPromise = input.waitForAnimations();

  // Wait for both the minimum duration and the animations to complete.
  // This ensures that even very fast animations have a minimum display time,
  // and long animations are fully waited for.
  await Promise.all([animationPromise, timeoutPromise]);

  return true;
});
