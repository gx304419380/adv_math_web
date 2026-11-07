/* 分步动画控制器：把推导拆成可播放、可回放的步骤 */

export class StepController {
  /**
   * @param {HTMLElement} el 控制条挂载位置
   * @param {Array<{label?:string, run:(i:number)=>void}>} steps
   * @param {{interval?:number, autoplay?:boolean}} options
   */
  constructor(el, steps = [], options = {}) {
    this.el = el;
    this.steps = steps;
    this.interval = options.interval || 1400;
    this.i = 0;
    this.timer = null;
    this.build();
    if (options.autoplay) this.play();
    else this.apply(0);
  }

  build() {
    const bar = document.createElement('div');
    bar.className = 'step-bar';
    bar.innerHTML = `
      <button class="btn" data-act="prev" aria-label="上一步">← 上一步</button>
      <button class="btn primary" data-act="toggle" aria-label="播放或暂停">▶ 播放</button>
      <button class="btn" data-act="next" aria-label="下一步">下一步 →</button>
      <div class="step-dots" data-dots></div>
      <span class="step-label" data-label></span>`;
    this.el.appendChild(bar);
    this.bar = bar;
    this.dots = bar.querySelector('[data-dots]');
    this.label = bar.querySelector('[data-label]');
    this.toggleBtn = bar.querySelector('[data-act="toggle"]');

    this.steps.forEach((s, k) => {
      const d = document.createElement('button');
      d.className = 'step-dot';
      d.type = 'button';
      d.title = s.label || `第 ${k + 1} 步`;
      d.addEventListener('click', () => this.seek(k));
      this.dots.appendChild(d);
    });

    bar.querySelector('[data-act="prev"]').addEventListener('click', () => this.prev());
    bar.querySelector('[data-act="next"]').addEventListener('click', () => this.next());
    bar.querySelector('[data-act="toggle"]').addEventListener('click', () => this.toggle());
  }

  apply(i) {
    this.i = Math.max(0, Math.min(this.steps.length - 1, i));
    const step = this.steps[this.i];
    if (step && typeof step.run === 'function') {
      try { step.run(this.i); } catch (err) { console.warn('[steps] 步骤执行失败：', err); }
    }
    [...this.dots.children].forEach((d, k) => d.classList.toggle('is-active', k === this.i));
    this.label.textContent = `${this.i + 1}/${this.steps.length}`;
  }

  seek(i) { this.pause(); this.apply(i); }
  next() { if (this.i >= this.steps.length - 1) { this.pause(); return; } this.apply(this.i + 1); }
  prev() { this.pause(); this.apply(this.i - 1); }

  play() {
    if (this.timer) return;
    this.toggleBtn.textContent = '⏸ 暂停';
    this.timer = setInterval(() => {
      if (this.i >= this.steps.length - 1) { this.pause(); return; }
      this.apply(this.i + 1);
    }, this.interval);
  }

  pause() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.toggleBtn) this.toggleBtn.textContent = '▶ 播放';
  }

  toggle() { this.timer ? this.pause() : this.play(); }
  destroy() { this.pause(); this.bar.remove(); }
}
