import { analyzeSentiment } from './server/src/services/ai/SentimentAnalyzer.js';

console.log('Imported:', analyzeSentiment);

try {
    const res = analyzeSentiment('I love this');
    console.log('Result:', res);
    if(res.score > 0) console.log('PASS Positive');
    else console.log('FAIL Positive');
} catch(e) {
    console.error('Error:', e);
}
