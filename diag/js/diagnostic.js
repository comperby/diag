
document.addEventListener('DOMContentLoaded', () => {
    const tree = diagnosticTree.tree;
    const stepsContainer = document.querySelector('.diagnostic-steps');
    const progressBar = document.querySelector('.progress-bar .fill');
    const resultContainer = document.querySelector('.diagnostic-result');
    const deviceSvg = document.querySelector('.device-svg');
    const pathInput = document.querySelector('#diagnostic_data');
    const captchaCheckbox = document.querySelector('#diagnostic_captcha');

    let path = [];
    let currentNode = tree;

    const maxDepth = getMaxDepth(tree);

    function renderStep() {
        stepsContainer.innerHTML = '';
        const keys = Object.keys(currentNode);
        if (keys.includes('итог')) {
            renderResult(currentNode['итог']);
            return;
        }

        keys.forEach(option => {
            const btn = document.createElement('button');
            btn.textContent = option;
            btn.className = 'diagnostic-btn';
            btn.onclick = () => {
                const nextNode = currentNode[option];
                if (Object.keys(nextNode).includes('итог') && captchaCheckbox && !captchaCheckbox.checked) {
                    alert('Подтвердите, что вы не робот');
                    return;
                }
                path.push(option);
                currentNode = nextNode;
                updateProgress();
                renderStep();
            };
            stepsContainer.appendChild(btn);
        });

        // Добавить кнопку «Назад»
        if (path.length > 0) {
            const backBtn = document.createElement('button');
            backBtn.textContent = '← Назад';
            backBtn.className = 'diagnostic-btn back';
            backBtn.onclick = () => {
                path.pop();
                currentNode = tree;
                for (const step of path) {
                    currentNode = currentNode[step];
                }
                updateProgress();
                renderStep();
            };
            stepsContainer.appendChild(backBtn);
        }
    }

    function updateProgress() {
        const percent = Math.min(100, Math.floor((path.length / maxDepth) * 100));
        progressBar.style.width = percent + '%';
        progressBar.style.backgroundColor = `hsl(${percent}, 70%, 50%)`;
        animateRepair(percent);
        if (pathInput) {
            pathInput.value = JSON.stringify(path);
        }
    }

    function renderResult(resultText) {
        stepsContainer.style.display = 'none';
        resultContainer.innerHTML = `
            <h2>Результат диагностики</h2>
            <p>${resultText}</p>
            <form method="post" action="${diagnosticTree.pdf_url}">
                <input type="hidden" name="diagnostic_steps" value='${JSON.stringify(path)}'>
                <input type="hidden" name="diagnostic_result" value="${resultText}">
                <input type="hidden" name="_wpnonce" value="${diagnosticTree.pdf_nonce}">
                <button type="submit">Скачать PDF</button>
            </form>
            <a href="https://t.me/${diagnosticTree.telegram_link}" class="telegram-link" target="_blank">Написать в Telegram</a>
        `;
        resultContainer.style.display = 'block';
        updateProgress();
    }

    function animateRepair(percent = 0) {
        if (!deviceSvg) return;
        deviceSvg.innerHTML = `<svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="hsl(${percent},70%,50%)" stroke="#333" stroke-width="5"/>
        </svg>`;
    }

    renderStep();
});

function getMaxDepth(node) {
    if (typeof node !== 'object' || node === null) {
        return 0;
    }
    const keys = Object.keys(node);
    if (keys.includes('итог')) {
        return 0;
    }
    let depths = keys.map(k => getMaxDepth(node[k]));
    return 1 + Math.max(0, ...depths);
}
