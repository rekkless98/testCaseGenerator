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

    fs.mkdirSync(extractPath);

    fs.createReadStream(folderPath)
        .pipe(unzipper.Extract({ path: extractPath }))
        .on('close', () => {
            console.log('Unzipping successful');
            const functions = processFiles(extractPath);  
            console.log('Functions found:', functions);
            const testCases = generateTests(functions, framework);

            fs.rmSync(folderPath, { recursive: true, force: true });

            res.render('result', { testCases });
        })
        .on('error', (err) => {
            console.error('Error during unzipping:', err);
            res.status(500).send('Error unzipping the folder');
        });
});


function analyzeCode(code) {
    const parsed = esprima.parseScript(code, { comment: true, loc: true, tolerant: true, attachComment: true });
    const functions = [];
    parsed.body.forEach(node => {
        if (node.type === 'FunctionDeclaration') {
            const comments = node.leadingComments ? node.leadingComments.map(c => c.value.trim()) : [];
            const description = extractFunctionDescription(comments);
            functions.push({
                name: node.id.name,
                params: node.params.map(param => param.name),
                description,
                body: code.slice(node.body.start, node.body.end),
                loc: node.loc
            });
        } else if (node.type === 'ExpressionStatement' && node.expression.type === 'AssignmentExpression') {
            const left = node.expression.left;
            if (left.type === 'MemberExpression' && left.property.type === 'Identifier') {
                const comments = node.leadingComments ? node.leadingComments.map(c => c.value.trim()) : [];
                const description = extractFunctionDescription(comments);
                functions.push({
                    name: left.property.name,
                    params: [],
                    description,
                    body: code.slice(node.expression.right.start, node.expression.right.end),
                    loc: node.loc
                });
            }
        }
    });
    return functions;
}

function extractFunctionDescription(comments) {
    if (comments.length === 0) return 'No description available.';
    const doc = nlp(comments.join(' '));
    const description = doc.sentences().first().text(); 
    return description || 'No description available.';
}

function evaluateFunctionBody(body) {
    try {
        const func = new Function(`return ${body}`);
        return func();
    } catch (error) {
        return '/* Could not evaluate function body */';
    }
}

function generateJestTests(functions) {
    return functions.map(fn => {
        const expectedResult = evaluateFunctionBody(fn.body);
        return `
test('${fn.name}', () => {
    const description = \`${fn.description}\`;
    console.log(description);
    const result = ${fn.name}(${fn.params.join(', ')});
    expect(result).toBe(${JSON.stringify(expectedResult)});
});
        `;
    }).join('\n');
}

function generateMochaTests(functions) {
    return functions.map(fn => {
        const expectedResult = evaluateFunctionBody(fn.body);
        return `
describe('${fn.name}', function() {
    it('should return the correct value', function() {
        const description = \`${fn.description}\`;
        console.log(description);
        const result = ${fn.name}(${fn.params.join(', ')});
        expect(result).to.equal(${JSON.stringify(expectedResult)});
    });
});
        `;
    }).join('\n');
}

function generateTests(functions, framework = 'jest') {
    if (framework === 'jest') {
        return generateJestTests(functions);
    } else if (framework === 'mocha') {
        return generateMochaTests(functions);
    }
}

app.get('/', (req, res) => {
    res.render('index');
});

app.post('/upload', upload.single('folder'), (req, res) => {
    const { framework } = req.body;
    const folderPath = req.file.path;

    exec(`unzip -o ${folderPath} -d ${folderPath}`, (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error unzipping the folder');
            return;
        }

        const functions = processFiles(folderPath);
        const testCases = generateTests(functions, framework);

        fs.rmSync(folderPath, { recursive: true, force: true });

        res.render('result', { testCases });
    });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
