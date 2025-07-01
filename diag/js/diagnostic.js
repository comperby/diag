
document.addEventListener('DOMContentLoaded', () => {
    const tree = diagnosticTree.tree;
    const stepsContainer = document.querySelector('.diagnostic-steps');
    const progressBar = document.querySelector('.progress-bar .fill');
    const resultContainer = document.querySelector('.diagnostic-result');
    const deviceSvg = document.querySelector('.device-svg');

    let path = [];
    let currentNode = tree;

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
                path.push(option);
                currentNode = currentNode[option];
                updateProgress();
                animateRepair();
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
                animateRepair(true);
                renderStep();
            };
            stepsContainer.appendChild(backBtn);
        }
    }

    function updateProgress() {
        const percent = Math.min(100, Math.floor((path.length / 5) * 100));
        progressBar.style.width = percent + '%';
        progressBar.style.backgroundColor = `hsl(${percent}, 70%, 50%)`;
    }

    function renderResult(resultText) {
        stepsContainer.style.display = 'none';
        resultContainer.innerHTML = `
            <h2>Результат диагностики</h2>
            <p>${resultText}</p>
            <a href="https://t.me/${diagnosticTree.telegram_link}" class="telegram-link" target="_blank">Написать в Telegram</a>
        `;
        resultContainer.style.display = 'block';
        updateProgress();
    }

    function animateRepair(reverse = false) {
        if (!deviceSvg) return;
        deviceSvg.innerHTML = `<svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="${reverse ? '#ccc' : '#4caf50'}" stroke="#333" stroke-width="5"/>
        </svg>`;
    }

    renderStep();
});
