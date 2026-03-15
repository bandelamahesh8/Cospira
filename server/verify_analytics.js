import 'dotenv/config';
import mongoose from 'mongoose';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const { default: analyticsService } = await import('./src/services/ai/AnalyticsService.js');
  
  const userId = 'c98f47ac-1fa1-4fdf-8ec8-f721d3697267';
  console.log('Testing insights for user:', userId);
  
  const insights = await analyticsService.getUserAIInsights(userId);
  console.log('Sector Breakdown:', JSON.stringify(insights.sectorBreakdown, null, 2));
  console.log('Top Orgs:', JSON.stringify(insights.topOrganizations, null, 2));
  console.log('Security Compliance:', insights.securityCompliance);
  
  process.exit(0);
}

run().catch(console.error);
