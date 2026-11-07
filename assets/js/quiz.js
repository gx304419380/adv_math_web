/* 交互式自测：题目写在页面内的 <script type="application/json"> 中 */

function mountQuiz(el, data) {
  if (!el) return;
  let items = data;
  if (!items) {
    const raw = el.querySelector('script[type="application/json"]');
    try { items = raw ? JSON.parse(raw.textContent) : []; } catch (_) { items = []; }
  }
  if (!Array.isArray(items) || items.length === 0) return;

  el.innerHTML = '';
  const score = document.createElement('div');
  score.className = 'quiz-score';
  el.appendChild(score);

  let correct = 0, answered = 0;
  const updateScore = () => {
    score.innerHTML = `已答 <b>${answered}</b> / ${items.length} 题　·　答对 <b>${correct}</b> 题`;
  };
  updateScore();

  items.forEach((item, qi) => {
    const card = document.createElement('div');
    card.className = 'quiz-item';
    const q = document.createElement('div');
    q.className = 'quiz-q';
    q.innerHTML = `${qi + 1}. ${item.q}`;
    card.appendChild(q);

    const opts = document.createElement('div');
    opts.className = 'quiz-options';
    const explain = document.createElement('div');
    explain.className = 'quiz-explain';
    explain.hidden = true;

    (item.options || []).forEach((text, oi) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt';
      btn.type = 'button';
      btn.textContent = text;
      btn.addEventListener('click', () => {
        if (card.dataset.done) return;
        card.dataset.done = '1';
        answered++;
        const right = oi === item.answer;
        if (right) correct++;
        [...opts.children].forEach((b, k) => {
          b.disabled = true;
          if (k === item.answer) b.classList.add('is-correct');
          else if (k === oi) b.classList.add('is-wrong');
        });
        explain.innerHTML = `<strong>${right ? '答对了' : '再想想'}</strong>：${item.explain || ''}`;
        explain.hidden = false;
        updateScore();
      });
      opts.appendChild(btn);
    });

    card.appendChild(opts);
    card.appendChild(explain);
    el.appendChild(card);
  });

  const reset = document.createElement('button');
  reset.className = 'btn';
  reset.textContent = '重新作答';
  reset.addEventListener('click', () => { correct = 0; answered = 0; mountQuiz(el, items); });
  el.appendChild(reset);
}
