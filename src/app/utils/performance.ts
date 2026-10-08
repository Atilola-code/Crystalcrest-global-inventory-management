export const measurePerformance = (name: string) => {
  const start = performance.now();
  return {
    end: () => {
      const end = performance.now();
      const duration = end - start;
     
      if (duration > 100) {
        console.warn(` Slow operation detected: ${name}`);
      }
      return duration;
    }
  };
};

