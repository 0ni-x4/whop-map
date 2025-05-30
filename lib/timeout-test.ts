/**
 * Test utilities for simulating slow operations to test timeout functionality
 */

export async function simulateSlowOperation(durationMs: number, name: string = "operation") {
  console.log(`🐌 Simulating slow ${name} for ${durationMs}ms...`);
  
  const startTime = Date.now();
  
  // Create intervals to show progress during the slow operation
  const progressInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = (elapsed / durationMs) * 100;
    console.log(`⏳ ${name} progress: ${elapsed}ms / ${durationMs}ms (${progress.toFixed(1)}%)`);
  }, 2000);
  
  try {
    await new Promise(resolve => setTimeout(resolve, durationMs));
    clearInterval(progressInterval);
    
    const actualDuration = Date.now() - startTime;
    console.log(`✅ Slow ${name} completed in ${actualDuration}ms`);
    
    return { success: true, duration: actualDuration };
  } catch (error) {
    clearInterval(progressInterval);
    throw error;
  }
}

export async function simulateSlowImageFetch(durationMs: number = 15000) {
  return simulateSlowOperation(durationMs, "image fetch");
}

export async function simulateSlowUpload(durationMs: number = 20000) {
  return simulateSlowOperation(durationMs, "upload");
}

export async function simulateSlowDatabaseQuery(durationMs: number = 10000) {
  return simulateSlowOperation(durationMs, "database query");
}

/**
 * Environment variable to enable slow operation simulation
 * Set SIMULATE_SLOW_OPERATIONS=true to enable
 */
export const shouldSimulateSlowOps = process.env.SIMULATE_SLOW_OPERATIONS === 'true';

/**
 * Wrapper that optionally adds delay to operations
 */
export async function maybeSimulateSlow<T>(
  operation: () => Promise<T>,
  slowDurationMs: number,
  operationName: string
): Promise<T> {
  if (shouldSimulateSlowOps) {
    console.log(`🎭 SIMULATION MODE: Adding ${slowDurationMs}ms delay to ${operationName}`);
    await simulateSlowOperation(slowDurationMs, `${operationName} delay`);
  }
  
  return await operation();
} 