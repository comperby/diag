
document.addEventListener('DOMContentLoaded', () => {
    const tree = diagnosticTree.tree;
    const stepsContainer = document.querySelector('.diagnostic-steps');
    const progressContainer = document.querySelector('.progress-bar');
    const progressBar = document.querySelector('.progress-bar .fill');
    const resultContainer = document.querySelector('.diagnostic-result');
    const deviceSvg = document.querySelector('.device-svg');
    const pathInput = document.querySelector('#diagnostic_data');
    const captchaCheckbox = document.querySelector('#diagnostic_captcha');
    let styles = {};
    try { styles = JSON.parse(diagnosticTree.styles); } catch (e) {}
    if (styles.fontFamily) {
        document.getElementById('diagnostic-widget').style.fontFamily = styles.fontFamily;
    }
    if (styles.progressBackground && progressContainer) {
        progressContainer.style.background = styles.progressBackground;
    }

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
            if (styles.buttonColor) {
                btn.style.background = styles.buttonColor;
            }
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
            if (styles.buttonColor) {
                backBtn.style.background = styles.buttonColor;
            }
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
        const r = Math.round(255 * (100 - percent) / 100);
        const g = Math.round(255 * percent / 100);
        const color = `rgb(${r},${g},0)`;
        progressBar.style.backgroundColor = color;
        animateRepair(percent);
        if (pathInput) {
            pathInput.value = JSON.stringify(path);
        }
    }

    function renderResult(resultText) {
        stepsContainer.style.display = 'none';
        let html = `
            <h2>Результат диагностики</h2>
            <p>${resultText}</p>
        `;
        if (diagnosticTree.enable_pdf) {
            html += `
            <form method="post" action="${diagnosticTree.pdf_url}">
                <input type="hidden" name="diagnostic_steps" value='${JSON.stringify(path)}'>
                <input type="hidden" name="diagnostic_result" value="${resultText}">
                <input type="hidden" name="_wpnonce" value="${diagnosticTree.pdf_nonce}">
                <button type="submit">Скачать PDF</button>
            </form>`;
        }
        html += `<a href="https://t.me/${diagnosticTree.telegram_link}" class="messenger-link" target="_blank">Telegram</a>`;
        if (diagnosticTree.whatsapp_link) {
            html += ` <a href="${diagnosticTree.whatsapp_link}" class="messenger-link" target="_blank">WhatsApp</a>`;
        }
        if (diagnosticTree.viber_link) {
            html += ` <a href="${diagnosticTree.viber_link}" class="messenger-link" target="_blank">Viber</a>`;
        }
        resultContainer.innerHTML = html;
        if (styles.buttonColor) {
            resultContainer.querySelectorAll('.messenger-link').forEach(el => {
                el.style.background = styles.buttonColor;
            });
        }
        resultContainer.style.display = 'block';
        updateProgress();
    }

    function animateRepair(percent = 0) {
        if (!deviceSvg) return;
        const r = Math.round(255 * (100 - percent) / 100);
        const g = Math.round(255 * percent / 100);
        const color = `rgb(${r},${g},0)`;
        const check = percent === 100 ? '<polyline points="30,55 45,70 70,40" fill="none" stroke="'+color+'" stroke-width="8"/>' : '';
        deviceSvg.innerHTML = `<svg width="120" height="80" viewBox="0 0 120 80">
            <rect x="10" y="10" width="100" height="60" rx="6" ry="6" fill="#ddd" stroke="#333" stroke-width="2"/>
            <rect x="20" y="20" width="80" height="40" fill="${color}"/>
            ${check}
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
