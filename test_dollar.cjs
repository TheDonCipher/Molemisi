// Test the escape chain for ${ interpolation
const PRICE_BAND = 'TEST_VALUE';

// Template literal escape for ${:
const test1 = `\\${PRICE_BAND}`;
console.log('test1 (\\${PRICE_BAND} in template):', JSON.stringify(test1), 'len:', test1.length);
// \\${ in template: \\ → \, $ → $, { → {. Output: \${ (3 chars: \, $, {)

// template literal escape for \$:
const test2 = `\\$`;
console.log('test2 (\\${ in template):', JSON.stringify(test2), 'len:', test2.length);

// Now the FULL chain:
// Template literal: \\\\u0060 → \\u0060 (7 chars) in output
// Template literal: \\${ → \${ (3 chars) in output

// So line92 in generator file should be built with:
//   \\\\u0060 → produces \\u0060 in generator file → single-quoted string: \\u0060 → \u0060 literal text in doc ✓
//   \\${ → produces \${ in generator file → single-quoted string: \${ → ${ literal text in doc ✓
//   BUT WAIT: in generator file's single-quoted string, \${ is \$ + {.
//   \$ in a single-quoted string: \$ is NOT a recognized escape → JS keeps both chars: \$ (2 chars).
//   So the string contains \${ (3 chars: \, $, {). Doc output = \${ (3 chars). ✓

// Let me verify with the actual chain:
const templateLiteral = `\\\\u0060 and \\${PRICE_BAND}`;
console.log('templateLiteral:', JSON.stringify(templateLiteral), 'len:', templateLiteral.length);
// Expected: \\u0060 and \${PRICE_BAND (the literal text)

// Write to generator file (simulate):
const genFileStr = `'${templateLiteral}'`;
console.log('genFileStr (generator file content):', JSON.stringify(genFileStr), 'len:', genFileStr.length);
// Generator file: '\\\\u0060 and \\${PRICE_BAND}'

// When generator's JS parser reads this single-quoted string:
// \\ → \ (escaped backslash)
// u0060 → u0060 (literal text)
// and → and (literal text)
// \\ → \ (escaped backslash)  
// $ → $ (literal, not an escape)
// {PRICE_BAND} → {PRICE_BAND} (literal text)
// Result string: \u0060 and \${PRICE_BAND}

// Use eval to simulate the generator's single-quoted string parsing
const genParsed = eval(`(${genFileStr})`);
console.log('genParsed (after single-quoted string parse):', JSON.stringify(genParsed), 'len:', genParsed.length);
// Expected: \\u0060 and \${PRICE_BAND (literal text, passed through to doc)

// Hmm wait, eval would try to parse the single-quoted string.
// '\\\\u0060 and \\${PRICE_BAND}' as a single-quoted string:
// \\ → \ (1 backslash)
// \\ → \ (1 backslash)  
// u0060 → u0060 (literal)
// and → and (literal)
// \\ → \ (1 backslash)
// $ → $ (literal)
// {PRICE_BAND} → {PRICE_BAND} (literal)
// But there's only one \\ before u0060 (the second \\ comes from \\${).
// Wait, let me recount: '\\\\u0060 and \\${PRICE_BAND}'
// The string is: ' + \\ + \\ + u + 0 + 0 + 6 + 0 + SPACE + a + n + d + SPACE + \\ + $ + { + P + R + I + C + E + _ + B + A + N + D + } + '
// Parse: \\ → \, \\ → \, u0060 → u0060, and → and, \\ → \, $ → $, {PRICE_BAND} → {PRICE_BAND}
// Result: \\u0060 and \${PRICE_BAND (14 chars: \, \, u, 0, 0, 6, 0, space, a, n, d, space, \, $, {, P, R, I, C, E, _, B, A, N, D, })
// Wait that's 26 chars. Let me recount.
// \\u0060 = 6 chars, and = 3 chars, \${PRICE_BAND} = 14 chars, spaces = 2 chars = 25 chars total.

console.log('\n=== VERIFICATION WITH eval ===');
const testStr = '\\\\u0060 and \\${PRICE_BAND}';
console.log('testStr:', JSON.stringify(testStr), 'len:', testStr.length);
const evalResult = eval(`(${testStr})`);
console.log('evalResult:', JSON.stringify(evalResult), 'len:', evalResult.length);
// evalResult should be: \\u0060 and \${PRICE_BAND (literal text)
