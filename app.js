const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const { exec } = require('child_process');
const unzipper = require('unzipper');
const esprima = require('esprima');
const nlp = require('compromise');
const bodyParser = require('body-parser');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public')); // Serve static files from 'public'
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve the homepage
app.get('/', (req, res) => {
    res.render('index'); // Render 'index.ejs'
});

// Handle file uploads
app.post('/upload', upload.single('folder'), (req, res) => {
    const { framework } = req.body;
    const folderPath = req.file.path;
    const extractPath = path.join(__dirname, 'uploads', req.file.filename + '_extracted');

    fs.mkdirSync(extractPath, { recursive: true });

    fs.createReadStream(folderPath)
        .pipe(unzipper.Extract({ path: extractPath }))
        .on('close', () => {
            console.log('Unzipping successful');
            const functions = processFiles(extractPath);
            res.render('customize', { functions, framework });
        })
        .on('error', (err) => {
            console.error('Error during unzipping:', err);
            res.status(500).send('Error unzipping the folder');
        });
});

// Handle test case customization
app.post('/customize-tests', (req, res) => {
    const framework = req.body.framework || 'jest'; // Default to 'jest' if not provided
    const functions = JSON.parse(req.body.functions);
    const customizations = req.body.customizations || {};

    const testCases = generateTests(functions, framework, customizations);

    res.render('result', { testCases });
});

function processFiles(folderPath) {
    const files = fs.readdirSync(folderPath);
    const functions = [];
    files.forEach(file => {
        const filePath = path.join(folderPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            functions.push(...processFiles(filePath));
        } else if (filePath.endsWith('.js')) {
            const code = fs.readFileSync(filePath, 'utf-8');
            const analyzedFunctions = analyzeCode(code);
            functions.push(...analyzedFunctions);
        }
    });
    return functions;
}

function analyzeCode(code) {
    const parsed = esprima.parseScript(code, { comment: true, loc: true, tolerant: true, attachComment: true });
    const functions = [];
    
    // Traverse AST to identify functions and Express routes
    parsed.body.forEach(node => {
        // Identify regular functions
        if (node.type === 'FunctionDeclaration') {
            const comments = node.leadingComments ? node.leadingComments.map(c => c.value.trim()) : [];
            const description = extractFunctionDescription(comments);
            functions.push({
                name: node.id.name,
                params: node.params.map(param => param.name),
                description,
                body: code.slice(node.body.start, node.body.end),
                loc: node.loc,
                type: 'function' // Mark this as a regular function
            });
        } 
        // Identify Express routes (e.g., app.get, app.post)
        else if (node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression') {
            const callee = node.expression.callee;
            if (callee.type === 'MemberExpression' && callee.object.name === 'app' && ['get', 'post', 'put', 'delete'].includes(callee.property.name)) {
                const route = node.expression.arguments[0].value; // Get the route path (e.g., '/api/items')
                const handler = node.expression.arguments[1]; // The handler function

                // If handler is an ArrowFunctionExpression or FunctionExpression, extract function info
                if (handler.type === 'FunctionExpression' || handler.type === 'ArrowFunctionExpression') {
                    const params = handler.params.map(param => param.name);
                    const comments = node.leadingComments ? node.leadingComments.map(c => c.value.trim()) : [];
                    const description = extractFunctionDescription(comments);
                    functions.push({
                        name: `${callee.property.name.toUpperCase()} ${route}`, // Name the function as HTTP_METHOD /route
                        params,
                        description,
                        body: code.slice(handler.body.start, handler.body.end),
                        loc: node.loc,
                        type: 'route' // Mark this as a route
                    });
                }
            }
        }
    });
    return functions;
}

function extractFunctionDescription(comments) {
    if (comments.length === 0) return 'No description available.';
    const doc = nlp(comments.join(' '));
    return doc.sentences().first().text() || 'No description available.';
}

function evaluateFunctionBody(body) {
    try {
        const func = new Function(`return ${body}`);
        return func();
    } catch (error) {
        return '/* Could not evaluate function body */';
    }
}

function generateJestTests(functions, customizations) {
    return functions.map(fn => {
        if (fn.type === 'route') {
            // Generate Jest tests for Express routes
            return generateJestAPITests(fn, customizations);
        } else {
            // Generate Jest tests for regular functions
            const { name, description, body } = fn;
            const { parameters = [], expected = '' } = customizations[name] || {};

            // Format the parameters for the function call
            const paramArray = Array.isArray(parameters) ? parameters : [];
            const paramString = paramArray.map(param => (isNaN(param) ? `'${param}'` : param)).join(', ');

            // Determine the expected result
            const expectedResult = expected !== '' ? expected : evaluateFunctionBody(body);

            // Format the expected result
            const formattedExpectedResult = isNaN(expectedResult) ? `'${expectedResult}'` : expectedResult;

            return `
test('${name}', () => {
    // Description is optional and can be used for documentation
    console.log(${JSON.stringify(description)});
    const result = ${name}(${paramString});
    expect(result).toBe(${formattedExpectedResult});
});
            `;
        }
    }).join('\n');
}

function generateJestAPITests(fn, customizations) {
    const { name, description } = fn;
    const [method, route] = name.split(' ');
    const testRoute = route.replace(/^['"]|['"]$/g, ''); // Clean the route from quotes

    return `
test('${name}', async () => {
    // Description is optional and can be used for documentation
    console.log(${JSON.stringify(description)});
    const response = await request(app).${method.toLowerCase()}('${testRoute}');
    expect(response.status).toBe(200); // Adjust status based on the expected output
    expect(response.body).toBeDefined(); // Check body or adjust as needed
});
    `;
}

function generateMochaTests(functions, customizations) {
    return functions.map(fn => {
        if (fn.type === 'route') {
            // Generate Mocha tests for Express routes
            return generateMochaAPITests(fn, customizations);
        } else {
            const { params, description, body } = fn;
            const { parameters = [], expected = '' } = customizations[fn.name] || {};

            // Ensure parameters is an array
            const paramArray = Array.isArray(parameters) ? parameters : [];
            const paramString = paramArray.join(', ');
            const expectedResult = expected || evaluateFunctionBody(body);

            return `
describe('${fn.name}', function() {
    it('should return the correct value', function() {
        const description = \`${description}\`;
        console.log(description);
        const result = ${fn.name}(${paramString});
        expect(result).to.equal(${JSON.stringify(expectedResult)});
    });
});
            `;
        }
    }).join('\n');
}

function generateMochaAPITests(fn, customizations) {
    const { name, description } = fn;
    const [method, route] = name.split(' ');
    const testRoute = route.replace(/^['"]|['"]$/g, ''); // Clean the route from quotes

    return `
describe('${name}', function() {
    it('should handle the request correctly', async function() {
        const description = \`${description}\`;
        console.log(description);
        const response = await chai.request(app).${method.toLowerCase()}('${testRoute}');
        expect(response).to.have.status(200); // Adjust status based on the expected output
        expect(response.body).to.exist; // Check body or adjust as needed
    });
});
    `;
}

function generateTests(functions, framework = 'jest', customizations) {
    if (framework === 'jest') {
        return generateJestTests(functions, customizations);
    } else if (framework === 'mocha') {
        return generateMochaTests(functions, customizations);
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
