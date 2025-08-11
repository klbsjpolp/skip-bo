// This bridge connects the React Animation Context with the XState machine services
// It allows services to wait for animations to complete without direct access to the React context.

interface AnimationServiceBridge {
  waitForAnimations: () => Promise<void>;
}

export const animationServiceBridge: AnimationServiceBridge = {
  // This will be replaced by the actual implementation from the CardAnimationProvider.
  waitForAnimations: () => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('waitForAnimations called before initialization.');
    }
    return Promise.resolve();
  },
};

