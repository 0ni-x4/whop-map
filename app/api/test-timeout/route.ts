import { NextRequest, NextResponse } from "next/server";
import { withAdvancedTimeout } from "@/lib/timeout-simulator";
import { simulateSlowOperation } from "@/lib/timeout-test";

async function testTimeoutHandler(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const duration = parseInt(searchParams.get('duration') || '5000');
  const scenario = searchParams.get('scenario') || 'basic';
  
  console.log(`🧪 Testing timeout scenario: ${scenario} (${duration}ms)`);
  
  try {
    switch (scenario) {
      case 'basic':
        await simulateSlowOperation(duration, 'basic test');
        break;
        
      case 'image-upload':
        console.log('📸 Simulating image upload flow...');
        await simulateSlowOperation(Math.min(duration * 0.3, 5000), 'image fetch');
        await simulateSlowOperation(Math.min(duration * 0.7, 20000), 'image upload');
        break;
        
      case 'database':
        console.log('🗄️ Simulating database operations...');
        await simulateSlowOperation(Math.min(duration * 0.2, 2000), 'user auth');
        await simulateSlowOperation(Math.min(duration * 0.3, 5000), 'place creation');
        await simulateSlowOperation(Math.min(duration * 0.5, 10000), 'forum post');
        break;
        
      case 'network':
        console.log('🌐 Simulating network operations...');
        await simulateSlowOperation(Math.min(duration * 0.4, 8000), 'API call 1');
        await simulateSlowOperation(Math.min(duration * 0.6, 15000), 'API call 2');
        break;
        
      default:
        await simulateSlowOperation(duration, scenario);
    }
    
    return NextResponse.json({
      success: true,
      scenario,
      duration,
      message: `Test completed successfully in approximately ${duration}ms`
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      scenario,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Export with different timeout configurations for testing
export const GET = withAdvancedTimeout(testTimeoutHandler, {
  timeoutMs: 30000,
  warningMs: 20000,
  progressInterval: 2000
});

export const POST = withAdvancedTimeout(testTimeoutHandler, {
  timeoutMs: 10000, // Shorter timeout for POST testing
  warningMs: 7000,
  progressInterval: 1000
}); 