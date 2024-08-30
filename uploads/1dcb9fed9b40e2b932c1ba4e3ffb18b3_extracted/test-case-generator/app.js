const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const esprima = require('esprima');
const nlp = require('compromise');
const { exec } = require('child_process');
const unzipper = require('unzipper');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.post('/upload', upload.single('folder'), (req, res) => {
    const { framework } = req.body;
    const folderPath = req.file.path;
    const extractPath = path.join(__dirname, 'uploads', req.file.filename + '_extracted');

    console.log('File uploaded:', req.file);
    console.log('Framework selected:', framework);

    // Create the directory for extraction
    fs.mkdirSync(extractPath);

    // Unzip the file into the new directory
    fs.createReadStream(folderPath)
        .pipe(unzipper.Extract({ path: extractPath }))
        .on('close', () => {
            console.log('Unzipping successful');
            const functions = processFiles(extractPath);  // Use extractPath instead of folderPath
            console.log('Functions found:', functions);
            const testCases = generateTests(functions, framework);

            // Clean up uploaded files after processing
            fs.rmSync(folderPath, { recursive: true, force: true });

            res.render('result', { testCases });
        })
        .on('error', (err) => {
            console.error('Error during unzipping:', err);
            res.status(500).send('Error unzipping the folder');
        });
});

// Function to analyze JavaScript code
function analyzeCode(code) {
    const parsed = esprima.parseScript(code, { comment: true, loc: true, tolerant: true });
    const functions = [];
    parsed.body.forEach(node => {
        if (node.type === 'FunctionDeclaration') {
            functions.push({
                name: node.id.name,
                params: node.params.map(param => param.name),
                comments: node.leadingComments ? node.leadingComments.map(c => c.value) : [],
                loc: node.loc
            });
        } else if (node.type === 'ExpressionStatement' && node.expression.type === 'AssignmentExpression') {
            const left = node.expression.left;
            if (left.type === 'MemberExpression' && left.property.type === 'Identifier') {
                functions.push({
                    name: left.property.name,
                    params: [],
                    comments: [],
                    loc: node.loc
                });
            }
        }
    });
    return functions;
}

// Function to extract descriptions using NLP
function extractFunctionDescription(comments) {
    if (comments.length === 0) return 'No description available.';
    const commentText = comments.join(' ');
    const doc = nlp(commentText);
    const description = doc.sentences().toText();
    return description || 'No description available.';
}

// Function to generate test cases for Jest
function generateJestTests(functions) {
    return functions.map(fn => `
test('${fn.name}', () => {
    const description = \`${extractFunctionDescription(fn.comments)}\`;
    console.log(description);
    const result = ${fn.name}();
    // TODO: Add your assertions here
    expect(result).toBe(/* expected value */);
});
`).join('\n');
}

// Function to generate test cases for Mocha
function generateMochaTests(functions) {
    return functions.map(fn => `
describe('${fn.name}', function() {
    it('should return the correct value', function() {
        const description = \`${extractFunctionDescription(fn.comments)}\`;
        console.log(description);
        const result = ${fn.name}();
        // TODO: Add your assertions here
        expect(result).to.equal(/* expected value */);
    });
});
`).join('\n');
}

// Function to generate tests based on framework
function generateTests(functions, framework = 'jest') {
    if (framework === 'jest') {
        return generateJestTests(functions);
    } else if (framework === 'mocha') {
        return generateMochaTests(functions);
    }
}

// Route for the homepage
app.get('/', (req, res) => {
    res.render('index');
});

// Route to handle file uploads and test generation
app.post('/upload', upload.single('folder'), (req, res) => {
    const { framework } = req.body;
    const folderPath = req.file.path;

    // Unzip the folder and analyze the files
    exec(`unzip -o ${folderPath} -d ${folderPath}`, (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error unzipping the folder');
            return;
        }

        const functions = processFiles(folderPath);
        const testCases = generateTests(functions, framework);

        // Clean up uploaded files after processing
        fs.rmSync(folderPath, { recursive: true, force: true });

        res.render('result', { testCases });
    });
});

// Function to process files and generate test cases
function processFiles(folderPath) {
    const files = fs.readdirSync(folderPath);
    const functions = [];
    files.forEach(file => {
        const filePath = path.join(folderPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            functions.push(...processFiles(filePath)); // Recursive call for directories
        } else if (filePath.endsWith('.js')) {
            const code = fs.readFileSync(filePath, 'utf-8');
            const analyzedFunctions = analyzeCode(code);
            functions.push(...analyzedFunctions);
        }
    });
    return functions;
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
