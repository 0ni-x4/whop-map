import { NextRequest, NextResponse } from "next/server";

/**
 * Simulates Vercel's 30-second function timeout locally
 * This helps test optimization before deploying to Vercel
 */
export function withVercelTimeout<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  timeoutMs: number = 30000 // 30 seconds like Vercel
) {
  return async (...args: T): Promise<NextResponse> => {
    const startTime = Date.now();
    console.log(`⏱️ === VERCEL TIMEOUT SIMULATOR START (${timeoutMs}ms) ===`);
    
    try {
      // Create timeout promise that rejects
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          const duration = Date.now() - startTime;
          reject(new Error(`Function timeout after ${duration}ms (Vercel limit: ${timeoutMs}ms)`));
        }, timeoutMs);
      });

      // Race the handler against the timeout
      const result = await Promise.race([
        handler(...args),
        timeoutPromise
      ]);

      const duration = Date.now() - startTime;
      console.log(`✅ Function completed in ${duration}ms (within ${timeoutMs}ms limit)`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof Error && error.message.includes('Function timeout')) {
        console.error(`🚨 === VERCEL TIMEOUT SIMULATION ===`);
        console.error(`❌ Function timed out after ${duration}ms`);
        console.error(`⚠️ This would fail on Vercel with a 504 Gateway Timeout`);
        console.error(`💡 Optimize your function to complete faster!`);
        
        return NextResponse.json(
          {
            error: "Function timeout (Vercel simulation)",
            duration: duration,
            limit: timeoutMs,
            message: "This request would timeout on Vercel. Optimize to complete faster."
          },
          { status: 504 }
        );
      }
      
      // Re-throw other errors
      throw error;
    }
  };
}

/**
 * Advanced timeout simulator with progress tracking
 */
export function withAdvancedTimeout<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  options: {
    timeoutMs?: number;
    warningMs?: number; // Warn when function takes too long
    progressInterval?: number; // Log progress every X ms
  } = {}
) {
  const {
    timeoutMs = 30000,
    warningMs = 20000, // Warn at 20 seconds
    progressInterval = 5000 // Log every 5 seconds
  } = options;

  return async (...args: T): Promise<NextResponse> => {
    const startTime = Date.now();
    let warningShown = false;
    
    console.log(`⏱️ === ADVANCED TIMEOUT SIMULATOR START ===`);
    console.log(`🎯 Timeout: ${timeoutMs}ms, Warning: ${warningMs}ms`);
    
    // Progress logger
    const progressLogger = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = timeoutMs - elapsed;
      const progress = (elapsed / timeoutMs) * 100;
      
      console.log(`📊 Progress: ${elapsed}ms elapsed (${progress.toFixed(1)}%), ${remaining}ms remaining`);
      
      if (!warningShown && elapsed >= warningMs) {
        console.warn(`⚠️ WARNING: Function running for ${elapsed}ms - approaching timeout!`);
        warningShown = true;
      }
    }, progressInterval);

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          const duration = Date.now() - startTime;
          reject(new Error(`Function timeout after ${duration}ms`));
        }, timeoutMs);
      });

      // Race the handler against timeout
      const result = await Promise.race([
        handler(...args),
        timeoutPromise
      ]);

      const duration = Date.now() - startTime;
      clearInterval(progressLogger);
      
      // Performance analysis
      const efficiency = duration <= warningMs ? "EXCELLENT" : 
                        duration <= timeoutMs * 0.9 ? "GOOD" : "RISKY";
      
      console.log(`✅ Function completed in ${duration}ms`);
      console.log(`📈 Performance: ${efficiency}`);
      console.log(`🎯 Vercel compatibility: ${duration < timeoutMs ? "✅ PASS" : "❌ FAIL"}`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      clearInterval(progressLogger);
      
      if (error instanceof Error && error.message.includes('Function timeout')) {
        console.error(`🚨 === TIMEOUT SIMULATION TRIGGERED ===`);
        console.error(`❌ Function exceeded ${timeoutMs}ms limit`);
        console.error(`⏱️ Actual duration: ${duration}ms`);
        console.error(`🚫 This would result in a 504 Gateway Timeout on Vercel`);
        console.error(`💡 Recommendations:`);
        console.error(`   - Break into smaller operations`);
        console.error(`   - Use background processing`);
        console.error(`   - Implement caching`);
        console.error(`   - Optimize database queries`);
        
        return NextResponse.json(
          {
            error: "Function timeout simulation",
            duration: duration,
            limit: timeoutMs,
            vercelCompatible: false,
            recommendations: [
              "Break into smaller operations",
              "Use background processing", 
              "Implement caching",
              "Optimize database queries"
            ]
          },
          { status: 504 }
        );
      }
      
      throw error;
    }
  };
}

/**
 * Quick helper for 30-second Vercel timeout
 */
export const withVercel30s = <T extends any[]>(handler: (...args: T) => Promise<NextResponse>) =>
  withVercelTimeout(handler, 30000);

/**
 * Quick helper for 10-second Vercel Hobby timeout
 */
export const withVercelHobby = <T extends any[]>(handler: (...args: T) => Promise<NextResponse>) =>
  withVercelTimeout(handler, 10000); 