/*
 * 关于页 Token 账本面板
 * ---------------------------------------------------------------------------
 * 数据：window.TOKEN_LEDGER（asset/data/token-ledger.js，由 tools/build-token-ledger.js 生成）
 * 数字渲染：复刻主页时钟的点阵字形与掉落物理（见 asset/js/clock.js），
 *           但改成「静态数值 + 落位弹跳」，不依赖当前时间。
 */
(function () {
  "use strict";

  var card = document.getElementById("token-ledger");
  if (!card) return;

  var figure = card.querySelector(".token-figure");
  var canvas = card.querySelector("#token-canvas");
  var unitEl = card.querySelector(".token-unit");
  var exactEl = card.querySelector(".token-exact");
  var metaEl = card.querySelector(".token-meta");
  var compEl = card.querySelector(".token-composition");
  var toggle = card.querySelector(".token-counter");
  var view = card.querySelector("#token-view");

  var D = window.TOKEN_LEDGER;

  // 没有数据文件时优雅降级，不显示假的数字
  if (!D || !D.total || !D.total.tokens) {
    card.classList.add("is-empty");
    if (exactEl) exactEl.textContent = "账本数据尚未生成";
    if (metaEl) metaEl.textContent = "运行 tools/build-token-ledger.js 后刷新页面。";
    return;
  }

  // ---- 主页时钟的 15 色调色板（横向渐变用）----
  // 数字框是深色玻璃底（同主页时钟压在壁纸上的观感），所以白色点能看见，原样保留。
  var PALETTE = ["#ffffff", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
    "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9", "#F8C471",
    "#82E0AA", "#F1948A", "#D7BDE2"];

  // 10×7 点阵字形，从 clock.js 原样搬来：0-9 共 10 个，索引 10 是冒号
  var GLYPH_SRC = "0011100|0110110|1100011|1100011|1100011|1100011|1100011|1100011|0110110|0011100;0001100|0111100|0001100|0001100|0001100|0001100|0001100|0001100|0001100|1111111;0111110|1100011|0000011|0000110|0001100|0011000|0110000|1100000|1100011|1111111;1111111|0000011|0000110|0001100|0011100|0000110|0000011|0000011|1100011|0111110;0000110|0001110|0011110|0110110|1100110|1111111|0000110|0000110|0000110|0001111;1111111|1100000|1100000|1111110|0000011|0000011|0000011|0000011|1100011|0111110;0000110|0011000|0110000|1100000|1101110|1100011|1100011|1100011|1100011|0111110;1111111|1100011|0000110|0000110|0001100|0001100|0011000|0011000|0011000|0011000;0111110|1100011|1100011|1100011|0111110|1100011|1100011|1100011|1100011|0111110;0111110|1100011|1100011|1100011|0111011|0000011|0000011|0000110|0001100|0110000;0000|0000|0110|0110|0000|0000|0110|0110|0000|0000";

  var GLYPHS = GLYPH_SRC.split(";").map(function (g) {
    return g.split("|").map(function (row) {
      return row.split("").map(Number);
    });
  });
  // 索引 11：小数点。clock.js 里没有，这里补上。
  // 宽度照抄冒号（4 列）保证字符留白一致；高度给底部 3 行，
  // 只做 2 行时点太小、又紧贴底边，会被读成数字的一部分（"13 14"）。
  GLYPHS.push([[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],
               [0,0,0,0],[0,0,0,0],[0,1,1,0],[0,1,1,0],[0,1,1,0]]);
  // 索引 12：千分位逗号。上圆点、下尾巴朝左，和数字底部对齐。
  // 只占 2 列（数字是 7 列）：逗号本身窄，占满宽度会让两侧空隙被吃掉、
  // 视觉上和相邻数字粘在一起。
  GLYPHS.push([[0,0],[0,0],[0,0],[0,0],[0,0],
               [0,0],[1,1],[1,1],[1,0],[0,0]]);
  var DOT = 11, COLON = 10, COMMA = 12;

  function glyphIndex(ch) {
    if (ch >= "0" && ch <= "9") return ch.charCodeAt(0) - 48;
    if (ch === ".") return DOT;
    if (ch === ":") return COLON;
    if (ch === ",") return COMMA;
    return -1;
  }

  // ---- 数值格式化 ----
  function fmt(n) {
    n = Number(n) || 0;
    if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return String(n);
  }
  function group(n) {
    return (Number(n) || 0).toLocaleString("en-US");
  }
  // 模型名：老会话没记到 model/selection 的会落成 unknown，展示成中文更清楚
  function modelLabel(name) {
    return name === "unknown" ? "未记录模型" : name;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var total = D.total;
  var tokens = total.tokens;

  // 主数字优先显示完整数字（带千分位），单位「tokens」做成右下角角标。
  // 窄屏上完整数字会小到读不清，这时退回「13.14 + B」，完整数字改由下面一行小字兜住。
  var FULL = { text: group(tokens), unit: "tokens" };
  var SHORT = (function (n) {
    var units = [["T", 1e12], ["B", 1e9], ["M", 1e6], ["K", 1e3]];
    for (var i = 0; i < units.length; i++) {
      if (n >= units[i][1]) return { text: (n / units[i][1]).toFixed(2), unit: units[i][0] };
    }
    return { text: String(n), unit: "" };
  })(tokens);

  // ---- 元信息 ----
  var s = D.sessions || {};
  var rg = D.range || {};
  if (metaEl) {
    var bits = [];
    bits.push((s.inWorkspace || 0) + " 个会话");
    bits.push(group(total.requests) + " 次请求");
    if (rg.from && rg.to) bits.push(rg.from + " → " + rg.to);
    metaEl.innerHTML = bits.map(function (b) { return "<span>" + esc(b) + "</span>"; }).join("");
  }

  // ---- 构成条：输入 / 输出 / 缓存读取 ----
  if (compEl) {
    var cin = total.input || 0, cout = total.output || 0, ccache = total.cacheRead || 0;
    var sum = cin + cout + ccache || 1;
    var seg = function (cls, v) {
      return '<i class="comp ' + cls + '" style="flex:' + (v / sum * 100).toFixed(2) + '"></i>';
    };
    compEl.innerHTML =
      '<span class="comp-bar">' + seg("comp--in", cin) + seg("comp--out", cout) + seg("comp--cache", ccache) + "</span>" +
      '<span class="comp-key"><i class="dot dot--in"></i>输入 ' + fmt(cin) +
      '<i class="dot dot--out"></i>输出 ' + fmt(cout) +
      '<i class="dot dot--cache"></i>缓存读取 ' + fmt(ccache) + "</span>";
  }

  // ---- 点阵数字渲染 ----
  var particles = [];
  var rafId = 0;
  var lastWidth = 0;

  function draw(ctx, radius) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 主页时钟压在固定的偏暗壁纸上，纯色点本身就够清楚；
    // 关于页壁纸是随机图、亮暗都有，单靠颜色会和壁纸糊在一起。
    // 所以每个点「实色填充 + 深色描边」：描边给点一个边界，
    // 亮壁纸上不会消失，暗壁纸上也不会糊成一团，同时保留彩色。
    ctx.lineWidth = Math.max(1, radius * 0.22);
    ctx.strokeStyle = "rgba(16, 20, 36, 0.55)";
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.beginPath();
      ctx.arc(p.cx, p.cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.stroke();
    }
  }

  function startFall(ctx, radius) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      for (var i = 0; i < particles.length; i++) {
        particles[i].cx = particles[i].tx;
        particles[i].cy = particles[i].ty;
        particles[i].settled = true;
      }
      draw(ctx, radius);
      return;
    }
    var frames = 0;
    // 强制全部落位：动画到帧数上限还没收敛时直接归位，
    // 否则会永久停在半空，数字就一直是糊的
    function snapAll() {
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.cx = p.tx;
        p.cy = p.ty;
        p.settled = true;
      }
      draw(ctx, radius);
    }
    function step() {
      var moving = false;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        if (p.settled) continue;
        // 横向必须自己收回 tx：初始抖动（±18px）只用来制造「从上面撒下来」的散开感，
        // 不收回来的话每个点会永久偏在 tx 旁边，而点距只有 2r≈7.5px，
        // 整个字形会被抖散成一团，看不出是什么数字。
        p.cx += (p.tx - p.cx) * 0.18;
        p.vy += 1.05;
        p.cy += p.vy;
        if (p.cy >= p.ty) {
          p.cy = p.ty;
          p.vy = -p.vy * 0.55;
          if (Math.abs(p.vy) < 1.6) { p.cx = p.tx; p.cy = p.ty; p.settled = true; }
          else moving = true;
        } else {
          moving = true;
        }
      }
      draw(ctx, radius);
      frames++;
      if (!moving) return;
      if (frames < 320) rafId = requestAnimationFrame(step);
      else snapAll();
    }
    rafId = requestAnimationFrame(step);
  }

  // 把一串字符转成点阵字形列表
  function toGlyphs(text) {
    var chars = String(text).split("");
    var out = [];
    for (var i = 0; i < chars.length; i++) {
      var gi = glyphIndex(chars[i]);
      if (gi >= 0) out.push(GLYPHS[gi]);
    }
    return out;
  }

  // 同一个字形内相邻两个点的间隙（单位：半径）。
  // 点距默认就是 2r（相切），再叠 0.22r 的描边后点会直接粘在一起 ——
  // 位数少（半径大）时看不出来，11 位数字这种半径被压到 4px 的情况，
  // 一整行就糊成一条色带。留出 0.7r 的空隙后每个点都独立可见。
  var DOT_GAP = 0.7;

  // canvas 内四周留给描边的余量。描边宽约 1px，会超出点的外沿半个像素，
  // 不留这 1px 会被画布边界切掉。四边都留同样的 1px，不影响「四边等距」。
  var INK_PAD = 1;
  // 字形之间的间距（单位：半径），决定「13.30」这种相邻字符别粘一起
  var GAP_RATIO = 2.4;
  // 半径上下限：小于 2.2px 的点在 1x 屏上分不出单个点，大于 9.5px 会撑破玻璃板
  var MIN_R = 2.2, MAX_R = 9.5;

  // 这一串字占多少列（每个字形宽度不同：数字 7 列、逗号 2 列）
  function glyphCols(glyphs) {
    var cols = 0;
    for (var g = 0; g < glyphs.length; g++) cols += glyphs[g][0].length;
    return cols;
  }

  // 按可用宽度反解半径，思路和主页时钟一样：宽度 / 总列数 = 每列多宽，
  // 一列就是一个点的直径（2r），字形之间再额外留 gapRatio·r。
  // 末尾的 - DOT_GAP 是个修正：按列数算会把「每个字形的最后一个点后面
  // 不需要点间距」也算进去，多算的总量恰好是一个 DOT_GAP·r（与字数无关），
  // 不减掉的话右边会比左边多出约 3px，四边就不齐了。
  function solveRadius(glyphs, targetW, gapRatio) {
    var cols = glyphCols(glyphs);
    var gaps = Math.max(0, glyphs.length - 1);
    return targetW / (cols * (2 + DOT_GAP) + gaps * gapRatio - DOT_GAP);
  }

  /*
   * 目标：数字点阵的四边到玻璃板内边距的距离完全相等。
   *
   * 做法不是「画完再居中」，而是反解尺寸：
   *   玻璃板内容宽 cw 已知，直接拿它当 canvas 的目标宽度；
   *   再用这个宽度反解半径 r，让「列数 × 点距 + 字形间距」正好等于它。
   *   canvas 高度则由 r 唯一决定（10 行字形），玻璃板高度跟着 canvas 长。
   *
   * 这样点阵的墨迹左右各贴内容区边界、上下也各贴边界，
   * 四个方向剩下的就是玻璃板自己的 padding —— 天然相等，不依赖居中。
   * 单位角标是绝对定位的浮层，完全不参与这套计算。
   */
  function layout() {
    var cw = figure.clientWidth;
    if (!cw) return;

    // 角标文本先落地，避免首帧角标是空的
    if (unitEl && !unitEl.textContent) unitEl.textContent = FULL.unit;
    // 数字用满整个内容区：角标是纯视觉浮层，完全不参与计算。
    // 这样墨迹四边到玻璃板边框的距离都等于玻璃板的 padding，天然等距。
    var targetW = cw;

    // 优先画完整数字；完整数字被压得太小（点会粘成一片）时退回缩写，
    // 完整值由下面那行小字兜住，信息不丢。
    var fullGlyphs = toGlyphs(FULL.text);
    var radius = solveRadius(fullGlyphs, targetW, GAP_RATIO);
    var glyphs = fullGlyphs;
    var useFull = radius >= MIN_R;
    if (!useFull) {
      glyphs = toGlyphs(SHORT.text);
      radius = solveRadius(glyphs, targetW, GAP_RATIO);
    }
    if (!glyphs.length) return;
    radius = Math.max(MIN_R, Math.min(radius, MAX_R));

    if (unitEl) unitEl.textContent = useFull ? FULL.unit : SHORT.unit;
    canvas.setAttribute("data-mode", useFull ? "full" : "short");
    // 完整数字已经画在主位，小字那行就不必重复；退回缩写时才用这行兜住精确值
    if (exactEl) exactEl.textContent = useFull ? "" : group(tokens) + " tokens";

    var cols = glyphCols(glyphs);
    var gaps = Math.max(0, glyphs.length - 1);
    // 点距：横向和纵向都留出 DOT_GAP·r，否则相邻两行的点会粘连，
    // 数字的横杠（7 的顶横、0 的上下沿）会糊成实心条
    var pitch = 2 * radius + DOT_GAP * radius;
    var width = cols * pitch + gaps * GAP_RATIO * radius - DOT_GAP * radius;
    // 10 行字形：9 个行距 + 最后一行自己的直径
    var height = 9 * pitch + 2 * radius;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    // 画布四周各留 INK_PAD，给描边溢出半个像素的余量，不被边界切掉
    var cssW = width + INK_PAD * 2, cssH = height + INK_PAD * 2;

    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 墨迹左上角固定落在 (INK_PAD, INK_PAD)，不居中 —— 居中会引入
    // 亚像素偏移，四边边距就不再严格相等
    var originX = INK_PAD;
    var originY = INK_PAD;

    particles = [];
    var x = originX;
    for (var k = 0; k < glyphs.length; k++) {
      var gl = glyphs[k];
      for (var row = 0; row < gl.length; row++) {
        for (var col = 0; col < gl[row].length; col++) {
          if (gl[row][col] !== 1) continue;
          var tx = x + radius + pitch * col;
          var ty = originY + radius + pitch * row;
          var t = Math.max(0, Math.min(1, (tx - originX) / (width || 1)));
          particles.push({
            tx: tx, ty: ty,
            cx: tx + (Math.random() - 0.5) * 36,
            cy: -24 - Math.random() * 280,
            vy: 0,
            settled: false,
            color: PALETTE[Math.round(t * (PALETTE.length - 1))]
          });
        }
      }
      x += gl[0].length * pitch + GAP_RATIO * radius;
    }

    cancelAnimationFrame(rafId);
    draw(ctx, radius);
    startFall(ctx, radius);
  }

  layout();

  if (window.ResizeObserver) {
    var timer = 0;
    new ResizeObserver(function () {
      var w = figure.clientWidth;
      if (w === lastWidth) return;
      lastWidth = w;
      clearTimeout(timer);
      timer = setTimeout(function () { layout(); }, 140);
    }).observe(figure);
  } else {
    window.addEventListener("resize", layout);
  }

  // ---- 展开 / 收起 ----
  var rendered = false;

  toggle.addEventListener("click", function () {
    var open = card.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open && !rendered) {
      rendered = true;
      renderView("heatmap");
    }
  });

  // ---- 四个维度 ----
  var tabs = card.querySelectorAll(".token-tab");
  Array.prototype.forEach.call(tabs, function (btn) {
    btn.addEventListener("click", function () {
      Array.prototype.forEach.call(tabs, function (b) {
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });
      renderView(btn.getAttribute("data-view"));
    });
  });

  // 格子尺寸自适应：数据只有几周时 13px 的格子会缩在左上角，
  // 按可用宽度把格子放大，上限 22px（再大就不像贡献图了）。
  function fitHeat() {
    var sc = view.querySelector(".heat-scroll");
    if (!sc) return;
    var weeks = parseInt(sc.getAttribute("data-weeks"), 10) || 0;
    if (!weeks) return;
    var avail = sc.clientWidth - 30; // 扣掉左侧星期列（24px）与间距
    var cell = Math.floor((avail - (weeks - 1) * 3) / weeks);
    cell = Math.max(8, Math.min(cell, 20));
    sc.style.setProperty("--heat-cell", cell + "px");
  }

  function renderView(kind) {
    if (kind === "heatmap") {
      view.innerHTML = heatmapHTML();
      fitHeat();
      return;
    }
    else if (kind === "projects") view.innerHTML = listHTML(D.projects, D.projectsTotal, "个项目", "会话");
    else if (kind === "models") view.innerHTML = listHTML(D.models, D.modelsTotal, "个模型", "会话", modelLabel);
    else if (kind === "commits") view.innerHTML = commitsHTML();
  }

  // ---- 时间热力图（照 GitHub 贡献图的样子：一列一周，一列 7 格 = 周日到周六）----
  var DAY_MS = 86400000;
  var WEEK_LABEL = ["日", "一", "二", "三", "四", "五", "六"];

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  // 统一用 UTC 做日期算术，避免本地时区把日期算错一天
  function dateToMs(s) {
    var p = String(s).split("-");
    return Date.UTC(+p[0], +p[1] - 1, +p[2]);
  }

  function msToDate(ms) {
    var d = new Date(ms);
    return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1) + "-" + pad2(d.getUTCDate());
  }

  function heatmapHTML() {
    var daily = D.daily || [];
    if (!daily.length) return '<p class="token-empty">暂无热力图数据。</p>';

    var byDate = {};
    var max = 0;
    var firstMs = Infinity;
    var lastMs = -Infinity;
    for (var i = 0; i < daily.length; i++) {
      var it = daily[i];
      var ms = dateToMs(it.d);
      byDate[it.d] = it;
      if (it.t > max) max = it.t;
      if (ms < firstMs) firstMs = ms;
      if (ms > lastMs) lastMs = ms;
    }
    if (!max) return '<p class="token-empty">暂无热力图数据。</p>';

    // 照 GitHub 的做法：末日所在周的周六为准往前推满一年（53 周），
    // 即使只有几周数据也画完整的矩形 —— 没消耗的日子画最浅一档，
    // 否则格子会缩在左上角，右边空一大片。
    var endMs = lastMs + (6 - new Date(lastMs).getUTCDay()) * DAY_MS;
    var naturalWeeks = Math.round((endMs - (firstMs - new Date(firstMs).getUTCDay() * DAY_MS)) / DAY_MS / 7) + 1;
    var weeks = Math.max(naturalWeeks, 53);
    var startMs = endMs - (weeks - 1) * 7 * DAY_MS;

    function levelOf(v) {
      if (!v) return 0;
      var p = v / max;
      if (p < 0.05) return 1;
      if (p < 0.15) return 2;
      if (p < 0.35) return 3;
      if (p < 0.65) return 4;
      return 5;
    }

    // 月份标签：逐列看该列的周日落在哪个月，月份一变就打一个标签。
    // 不能把早期列夹到 firstMs —— 那样左侧几十列都会算成同一个月，
    // 标签会全部堆在一起、右侧还会冒出莫名其妙的月份。
    var marks = [];
    var lastMonth = -1;
    for (var w = 0; w < weeks; w++) {
      var pd = new Date(startMs + w * 7 * DAY_MS);
      var mo = pd.getUTCMonth();
      if (mo !== lastMonth) {
        marks.push({ w: w, y: pd.getUTCFullYear(), m: mo });
        lastMonth = mo;
      }
    }

    var html = '<div class="heat-scroll" data-weeks="' + weeks + '"><div class="heat-inner">';

    // 顶部月份行：列宽、间距必须与下面的格子完全一致，否则标签对不齐
    html += '<div class="heat-months" style="grid-template-columns:repeat(' + weeks + ',var(--heat-cell))">';
    var firstDrawn = true;
    for (var k = 0; k < marks.length; k++) {
      var mk = marks[k];
      var span = (k + 1 < marks.length ? marks[k + 1].w : weeks) - mk.w;
      // 首尾月份常常只剩一两列，文字塞不下会被裁成半截（「11月」变「1月」），
      // 直接不画 —— GitHub 也是这么处理的
      if (span < 2) continue;
      var text = (mk.m + 1) + "月";
      // 一年里月份会重复出现两次（跨年），只在 1 月和首个标签上带年份；
      // 但年份很占宽，只在跨度够 4 列时才加，否则会压到相邻标签上
      if ((firstDrawn || mk.m === 0) && span >= 4) text = mk.y + "年" + text;
      firstDrawn = false;
      html += '<span class="heat-month" style="grid-column:' + (mk.w + 1) + " / span " + span + '">' + text + "</span>";
    }
    html += "</div>";

    html += '<div class="heat-body">';
    // 左侧星期行：照 GitHub 只标一 / 三 / 五
    html += '<div class="heat-days">';
    for (var wd = 0; wd < 7; wd++) {
      html += '<span>' + (wd === 1 || wd === 3 || wd === 5 ? WEEK_LABEL[wd] : "") + "</span>";
    }
    html += "</div>";

    // 7 行 = 周日到周六，按列（一周一列）自动流下去
    html += '<div class="heat-grid" style="grid-template-columns:repeat(' + weeks + ',var(--heat-cell));grid-template-rows:repeat(7,var(--heat-cell))">';
    for (var cw = 0; cw < weeks; cw++) {
      for (var cd = 0; cd < 7; cd++) {
        var cms = startMs + (cw * 7 + cd) * DAY_MS;
        var key = msToDate(cms);
        // 照 GitHub 的做法：整块矩形是完整的，没消耗的日子也画格子，
        // 只是用最浅的一档，鼠标悬停仍然能看到「这一天没有消耗记录」。
        var rec = byDate[key];
        var v = rec ? rec.t : 0;
        var inRange = cms >= firstMs && cms <= lastMs;
        html += '<span class="heat-cell heat-l' + levelOf(v) + '" data-date="' + key +
          '" data-tokens="' + v + '" data-req="' + (rec ? (rec.r || 0) : 0) + '"' +
          (inRange ? "" : ' data-out="1"') + "></span>";
      }
    }
    html += "</div></div>";

    html += "</div></div>";

    html += '<div class="heat-legend"><span>少</span>';
    for (var lv = 0; lv <= 5; lv++) html += '<i class="heat-cell heat-l' + lv + '"></i>';
    html += '<span>多</span><span class="heat-note">每格 = 一天，峰值 ' + fmt(max) + "</span></div>";
    return html;
  }

  // ---- 悬停提示：跟着鼠标走，靠近右/下边缘时自动翻到另一侧 ----
  var tipEl = null;

  function tipShow(cell) {
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.className = "heat-tip";
      document.body.appendChild(tipEl);
    }
    var d = new Date(dateToMs(cell.getAttribute("data-date")));
    var tokens = Number(cell.getAttribute("data-tokens")) || 0;
    var req = Number(cell.getAttribute("data-req")) || 0;
    var head = d.getUTCFullYear() + "年" + (d.getUTCMonth() + 1) + "月" +
      d.getUTCDate() + "日 周" + WEEK_LABEL[d.getUTCDay()];
    var body;
    if (tokens) body = group(tokens) + " tokens · " + group(req) + " 次请求";
    else if (cell.getAttribute("data-out") === "1") body = "不在统计区间内";
    else body = "这一天没有消耗记录";
    tipEl.innerHTML = '<b>' + esc(head) + "</b><i>" + esc(body) + "</i>";
    tipEl.classList.add("is-on");
  }

  function tipMove(ev) {
    if (!tipEl || !tipEl.classList.contains("is-on")) return;
    var pad = 14;
    var w = tipEl.offsetWidth;
    var h = tipEl.offsetHeight;
    var x = ev.clientX + pad;
    var y = ev.clientY + pad;
    if (x + w > window.innerWidth - 8) x = ev.clientX - w - pad;
    if (y + h > window.innerHeight - 8) y = ev.clientY - h - pad;
    tipEl.style.left = Math.max(8, x) + "px";
    tipEl.style.top = Math.max(8, y) + "px";
  }

  function tipHide() {
    if (tipEl) tipEl.classList.remove("is-on");
  }

  document.addEventListener("mouseover", function (ev) {
    var cell = ev.target && ev.target.closest ? ev.target.closest(".heat-cell[data-date]") : null;
    if (cell) { tipShow(cell); tipMove(ev); }
  });
  document.addEventListener("mousemove", function (ev) {
    if (ev.target && ev.target.closest && ev.target.closest(".heat-cell[data-date]")) tipMove(ev);
    else tipHide();
  });
  document.addEventListener("mouseleave", tipHide, true);

  function listHTML(items, totalCount, unitLabel, subLabel, labelFn) {
    if (!items || !items.length) return '<p class="token-empty">暂无数据。</p>';
    var max = items[0].t || 1;
    var html = '<ul class="token-list">';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var pct = Math.max(1.5, (it.t / max) * 100);
      var nm = labelFn ? labelFn(it.n) : it.n;
      html += '<li class="token-row">' +
        '<div class="token-row-head">' +
          '<span class="token-row-rank">' + (i + 1) + "</span>" +
          '<span class="token-row-name" title="' + esc(it.n) + '">' + esc(nm) + "</span>" +
          '<span class="token-row-val">' + fmt(it.t) + "</span>" +
        "</div>" +
        '<div class="token-bar"><i style="width:' + pct.toFixed(2) + '%"></i></div>' +
        '<div class="token-row-sub">' + (it.s || 0) + " " + subLabel + "</div>" +
        "</li>";
    }
    html += "</ul>";
    if (totalCount > items.length) {
      html += '<p class="token-more">共 ' + totalCount + " " + unitLabel +
        "，此处列出消耗最多的 " + items.length + " 个。</p>";
    }
    return html;
  }

  function commitsHTML() {
    var items = D.commits;
    if (!items || !items.length) return '<p class="token-empty">暂无提交记录。</p>';
    var max = items[0].t || 1;
    var html = '<ul class="token-list">';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var pct = Math.max(1.5, (it.t / max) * 100);
      html += '<li class="token-row">' +
        '<div class="token-row-head">' +
          '<span class="token-row-rank">' + (i + 1) + "</span>" +
          '<span class="token-row-name" title="' + esc(it.s) + '"><code>' + esc(it.h) + "</code> " + esc(it.s) + "</span>" +
          '<span class="token-row-val">' + fmt(it.t) + "</span>" +
        "</div>" +
        '<div class="token-bar"><i style="width:' + pct.toFixed(2) + '%"></i></div>' +
        '<div class="token-row-sub">' + esc(it.d || "") + "</div>" +
        "</li>";
    }
    html += "</ul>";
    if (D.commitsTotal > items.length) {
      html += '<p class="token-more">共 ' + D.commitsTotal + " 次提交，此处列出消耗最多的 " +
        items.length + " 个。</p>";
    }
    return html;
  }
})();
