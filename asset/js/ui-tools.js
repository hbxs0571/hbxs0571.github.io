/* ============================================================
   右上角工具条：日夜切换 + 设置面板（主页 / 关于页共用）
   ------------------------------------------------------------
   设计要点：
   1. 状态只有一个对象，存在 localStorage 的 hbxs.ui.v1 里；
   2. 所有视觉效果都由 <html> 上的 class / CSS 变量驱动，所以
      <head> 里那段同步脚本能在首帧前把状态摆好，页面不会先
      闪一下默认主题再跳到用户选的那套；
   3. 本文件只负责「改状态 → 写存储 → 广播事件」，不认识任何
      具体卡片，避免和 token-ledger.js / clock.js 互相纠缠。
   ============================================================ */
(function () {
	"use strict";

	var KEY = "hbxs.ui.v1";
	var root = document.documentElement;
	var WALL_API = "https://img-api.moeblock.com/api.php";

	/* 默认值 = 现在线上的观感，用户不动设置时看到的就是老样子 */
	var DEFAULTS = {
		mode: "auto",        /* auto | dark | light */
		wallpaper: true,
		wallOpacity: 0.9,
		motion: "full"       /* full | reduced */
	};

	var state = Object.assign({}, DEFAULTS);

	function read() {
		try {
			var raw = localStorage.getItem(KEY);
			if (!raw) return Object.assign({}, DEFAULTS);
			var saved = JSON.parse(raw);
			var out = Object.assign({}, DEFAULTS);
			if (saved && typeof saved === "object") {
				Object.keys(DEFAULTS).forEach(function (k) {
					if (saved[k] !== undefined && saved[k] !== null) out[k] = saved[k];
				});
			}
			return out;
		} catch (e) {
			return Object.assign({}, DEFAULTS);
		}
	}

	function write() {
		try {
			localStorage.setItem(KEY, JSON.stringify(state));
		} catch (e) {
			/* 隐私模式 / 存储满：功能照常，只是下次打开回到默认 */
		}
	}

	function prefersDark() {
		try {
			return window.matchMedia("(prefers-color-scheme: dark)").matches;
		} catch (e) {
			return true;
		}
	}

	/* 逻辑主题：auto 要落到具体的 dark / light 上 */
	function resolvedMode() {
		if (state.mode === "dark") return "dark";
		if (state.mode === "light") return "light";
		return prefersDark() ? "dark" : "light";
	}

	function apply() {
		var mode = resolvedMode();

		/* 两档互斥：夜间偏压暗、日间偏提亮 */
		root.classList.toggle("ui-night", mode === "dark");
		root.classList.toggle("ui-light", mode === "light");
		root.classList.toggle("ui-no-wallpaper", !state.wallpaper);
		root.classList.toggle("ui-reduce-motion", state.motion === "reduced");

		root.style.setProperty("--ui-wall-opacity", String(state.wallOpacity));

		try {
			window.dispatchEvent(new CustomEvent("hbxs:ui-change", {
				detail: { mode: mode, state: Object.assign({}, state) }
			}));
		} catch (e) { /* 老浏览器没有 CustomEvent 构造器，忽略 */ }
	}

	function set(patch) {
		Object.keys(patch).forEach(function (k) {
			if (k in DEFAULTS) state[k] = patch[k];
		});
		write();
		apply();
		syncUI();
	}

	/* ---------- 换一张壁纸 ----------
	   壁纸来自外部随机图 API，每次请求都是一张新图。直接重建
	   background-image 就能换，不用刷新整页（主页与关于页的
	   首屏封面图也来自同一个 API，一并换掉才不打架）。 */
	function rerollWallpaper() {
		var url = WALL_API + "?r=" + Date.now();
		var bg = document.getElementById("bg");
		if (bg) bg.style.backgroundImage = 'url("' + url + '")';
		var cover = document.querySelector(".about-cover");
		if (cover) cover.style.backgroundImage = 'url("' + url + '")';
	}

	/* ---------- 面板 ---------- */

	var toolsEl = null;
	var panelEl = null;
	var themeBtn = null;
	var settingsBtn = null;

	function el(tag, cls, text) {
		var n = document.createElement(tag);
		if (cls) n.className = cls;
		if (text !== undefined) n.textContent = text;
		return n;
	}

	function field(label, hint) {
		var wrap = el("div", "ui-field");
		var lab = el("span", "ui-field-label");
		lab.appendChild(el("span", "", label));
		if (hint) lab.appendChild(el("span", "ui-field-value", hint));
		wrap.appendChild(lab);
		wrap.dataset.label = label;
		return wrap;
	}

	function seg(label, options, getCurrent, onPick) {
		var wrap = field(label);
		var box = el("div", "ui-seg");
		options.forEach(function (opt) {
			var b = el("button", "", opt.text);
			b.type = "button";
			b.dataset.value = String(opt.value);
			b.addEventListener("click", function () {
				onPick(opt.value);
				markSeg(wrap, String(getCurrent()));
			});
			box.appendChild(b);
		});
		wrap.appendChild(box);
		markSeg(wrap, String(getCurrent()));
		return wrap;
	}

	function markSeg(wrap, value) {
		var btns = wrap.querySelectorAll(".ui-seg button");
		Array.prototype.forEach.call(btns, function (b) {
			b.setAttribute("aria-pressed", String(b.dataset.value === value));
		});
	}

	function switchRow(label, hint, getChecked, onFlip) {
		var wrap = field(label);
		var btn = el("button", "ui-switch");
		btn.type = "button";
		btn.setAttribute("role", "switch");
		btn.setAttribute("aria-checked", String(!!getChecked()));
		btn.appendChild(el("span", "", hint || ""));
		var track = el("span", "ui-switch-track");
		track.appendChild(el("span", "ui-switch-knob"));
		btn.appendChild(track);
		btn.addEventListener("click", function () {
			onFlip(!getChecked());
			btn.setAttribute("aria-checked", String(!!getChecked()));
		});
		wrap.appendChild(btn);
		return wrap;
	}

	function rangeRow(label, getValue, onInput) {
		var pct = Math.round(getValue() * 100);
		var wrap = field(label, pct + "%");
		var head = wrap.firstChild;
		var val = head.querySelector(".ui-field-value");
		var input = el("input", "ui-range");
		input.type = "range";
		input.min = "0";
		input.max = "100";
		input.step = "1";
		input.value = String(pct);
		input.setAttribute("aria-label", label);
		input.addEventListener("input", function () {
			var v = Number(input.value) / 100;
			val.textContent = Math.round(v * 100) + "%";
			onInput(v);
		});
		wrap.appendChild(input);
		return wrap;
	}

	function actionRow(label, hint, text, onClick) {
		var wrap = field(label, hint);
		var btn = el("button", "ui-action", text);
		btn.type = "button";
		btn.addEventListener("click", function () {
			onClick();
			btn.classList.remove("is-done");
			void btn.offsetWidth;
			btn.classList.add("is-done");
			setTimeout(function () { btn.classList.remove("is-done"); }, 700);
		});
		wrap.appendChild(btn);
		return wrap;
	}

	function buildPanel() {
		panelEl = el("div", "ui-panel");
		panelEl.id = "ui-settings-panel";
		panelEl.hidden = true;
		panelEl.setAttribute("role", "dialog");
		panelEl.setAttribute("aria-label", "页面设置");

		var head = el("p", "ui-panel-title");
		head.appendChild(el("span", "", "页面设置"));
		var close = el("button", "ui-panel-close", "✕");
		close.type = "button";
		close.setAttribute("aria-label", "关闭设置");
		close.addEventListener("click", function () { closePanel(); });
		head.appendChild(close);
		panelEl.appendChild(head);

		panelEl.appendChild(seg("显示模式",
			[{ value: "auto", text: "跟随系统" }, { value: "light", text: "日间" }, { value: "dark", text: "夜间" }],
			function () { return state.mode; },
			function (v) { set({ mode: v }); }));

		panelEl.appendChild(switchRow("背景壁纸", "关掉后只留纯色底",
			function () { return state.wallpaper; },
			function (v) { set({ wallpaper: v }); }));

		panelEl.appendChild(actionRow("换一张背景", "壁纸是随机图，不满意可以重抽", "重新抽取", rerollWallpaper));

		panelEl.appendChild(rangeRow("壁纸浓度",
			function () { return state.wallOpacity; },
			function (v) { set({ wallOpacity: v }); }));

		panelEl.appendChild(seg("动效",
			[{ value: "full", text: "完整" }, { value: "reduced", text: "精简" }],
			function () { return state.motion; },
			function (v) { set({ motion: v }); }));

		var foot = el("div", "ui-panel-foot");
		var reset = el("button", "ui-reset", "恢复默认");
		reset.type = "button";
		reset.addEventListener("click", function () {
			state = Object.assign({}, DEFAULTS);
			write();
			apply();
			rebuild();
		});
		foot.appendChild(reset);
		foot.appendChild(el("span", "ui-saved", "改动即时保存"));
		panelEl.appendChild(foot);

		document.body.appendChild(panelEl);
	}

	function rebuild() {
		var old = panelEl;
		var wasOpen = old && !old.hidden;
		if (old && old.parentNode) old.parentNode.removeChild(old);
		panelEl = null;
		buildPanel();
		if (wasOpen) openPanel();
	}

	function openPanel() {
		if (!panelEl) return;
		panelEl.hidden = false;
		settingsBtn.setAttribute("aria-expanded", "true");
	}

	function closePanel() {
		if (!panelEl) return;
		panelEl.hidden = true;
		settingsBtn.setAttribute("aria-expanded", "false");
	}

	function togglePanel() {
		if (!panelEl) return;
		if (panelEl.hidden) openPanel(); else closePanel();
	}

	/* 按钮外观跟着当前主题走 */
	function syncUI() {
		if (themeBtn) {
			var mode = resolvedMode();
			themeBtn.setAttribute("data-mode", mode);
			themeBtn.setAttribute("aria-label", mode === "dark" ? "切换到日间模式" : "切换到夜间模式");
			themeBtn.title = mode === "dark" ? "切换到日间" : "切换到夜间";
		}
		if (settingsBtn) {
			settingsBtn.setAttribute("aria-label", "页面设置");
			settingsBtn.title = "页面设置";
		}
		if (panelEl) {
			var fields = panelEl.querySelectorAll(".ui-field");
			Array.prototype.forEach.call(fields, function (f) {
				var name = f.dataset.label;
				var sw = f.querySelector(".ui-switch");
				var rg = f.querySelector(".ui-range");
				if (name === "背景壁纸" && sw) sw.setAttribute("aria-checked", String(!!state.wallpaper));
				if (name === "壁纸浓度" && rg) {
					rg.value = String(Math.round(state.wallOpacity * 100));
					var v = f.querySelector(".ui-field-value");
					if (v) v.textContent = Math.round(state.wallOpacity * 100) + "%";
				}
				if (name === "显示模式") markSeg(f, state.mode);
				if (name === "动效") markSeg(f, state.motion);
			});
		}
	}

	function svgIcon(inner, extraClass) {
		var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("viewBox", "0 0 24 24");
		svg.setAttribute("fill", "none");
		svg.setAttribute("stroke", "currentColor");
		svg.setAttribute("stroke-width", "1.8");
		svg.setAttribute("stroke-linecap", "round");
		svg.setAttribute("stroke-linejoin", "round");
		if (extraClass) svg.setAttribute("class", extraClass);
		svg.innerHTML = inner;
		return svg;
	}

	function buildTools() {
		toolsEl = el("div", "ui-tools");
		toolsEl.setAttribute("role", "group");
		toolsEl.setAttribute("aria-label", "页面工具");

		themeBtn = el("button", "ui-tool");
		themeBtn.type = "button";
		themeBtn.appendChild(svgIcon(
			'<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.4 19.6l1.6-1.6M18 6l1.6-1.6"/>',
			"ui-icon-sun"));
		themeBtn.appendChild(svgIcon(
			'<path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5 8.6 8.6 0 1 0 20.5 14.6Z"/>',
			"ui-icon-moon"));
		themeBtn.addEventListener("click", function () {
			/* 按钮只落「明确的日夜」：在 auto 下点一次，就切到与当前相反的确定一档 */
			set({ mode: resolvedMode() === "dark" ? "light" : "dark" });
		});

		settingsBtn = el("button", "ui-tool");
		settingsBtn.type = "button";
		settingsBtn.appendChild(svgIcon(
			'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6h.08A1.7 1.7 0 0 0 10.1 3V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.08a1.7 1.7 0 0 0 1.56 1.02H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.03Z"/>'
		));
		settingsBtn.setAttribute("aria-expanded", "false");
		settingsBtn.setAttribute("aria-controls", "ui-settings-panel");
		settingsBtn.addEventListener("click", function (e) {
			e.stopPropagation();
			togglePanel();
		});

		toolsEl.appendChild(themeBtn);
		toolsEl.appendChild(settingsBtn);
		document.body.appendChild(toolsEl);
	}

	function bindGlobal() {
		document.addEventListener("click", function (e) {
			if (!panelEl || panelEl.hidden) return;
			if (panelEl.contains(e.target) || toolsEl.contains(e.target)) return;
			closePanel();
		});
		document.addEventListener("keydown", function (e) {
			if (e.key === "Escape" && panelEl && !panelEl.hidden) closePanel();
		});
		/* 跟随系统时，系统主题变了要跟着走 */
		try {
			var mq = window.matchMedia("(prefers-color-scheme: dark)");
			var onSys = function () {
				if (state.mode === "auto") { apply(); syncUI(); }
			};
			if (mq.addEventListener) mq.addEventListener("change", onSys);
			else if (mq.addListener) mq.addListener(onSys);
		} catch (e) { /* 忽略 */ }
	}

	function start() {
		state = read();
		apply();
		buildTools();
		buildPanel();
		syncUI();
		bindGlobal();
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", start);
	} else {
		start();
	}

	window.HBXS_UI = {
		get: function () { return Object.assign({}, state); },
		resolvedMode: resolvedMode,
		set: set,
		rerollWallpaper: rerollWallpaper,
		open: openPanel,
		close: closePanel
	};
})();
