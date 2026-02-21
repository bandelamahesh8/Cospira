import { analyzeSentiment } from './server/src/services/ai/SentimentAnalyzer.js';

const tests = [
    "I love this project, it is amazing and great!",
    "This is terrible, I hate it, it fails every time.",
    "It is okay, just a normal meeting.",
    "I am very frustrated and angry about the error.",
    "Thanks for the help, good job."
];

console.log("--- Sentiment Analysis Test ---\n");

tests.forEach(text => {
    const result = analyzeSentiment(text);
    console.log(`Text: "${text}"`);
    console.log(`Score: ${result.score.toFixed(2)} (${result.label})`);
    console.log(`Raw: ${result.rawScore}`);
    console.log("--------------------------------");
});
