/**
 * Author: Sidharth Sathesh
 *
 * client/script.js — Humanized client with stitched incoming chunks
 * - Smooth local drawing (midpoint-quadratic)
 * - Sends stroke-chunk and stroke-final
 * - Stitches incoming chunks per user to avoid dotted remote strokes
 * - Cursor indicators, undo/redo, color/width UI
 */

(function () {
  window.addEventListener('load', () => {
    // SOCKET SETUP
    const socket = (typeof io === 'function') ? io() : null;

    // DOM REFERENCES
    const canvas = document.getElementById('main');
    const cursorLayer = document.getElementById('cursors');
    const colorInput = document.getElementById('color');
    const widthInput = document.getElementById('width');
    const undoBtn = document.getElementById('undo');
    const redoBtn = document.getElementById('redo');
    const usersEl = document.getElementById('users');
    const toolButtons = document.querySelectorAll('.tool-btn');
    const swatches = document.getElementById('swatches');
    const colorPreview = document.getElementById('colorPreview');
    const openColor = document.getElementById('openColor');

    if (!canvas) {
      console.error('❌ Canvas element not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    const cursorCtx = (cursorLayer && cursorLayer.getContext) ? cursorLayer.getContext('2d') : null;

    // Ensure event routing: main canvas gets pointer events, cursor layer doesn't
    canvas.style.pointerEvents = 'auto';
    if (cursorLayer) cursorLayer.style.pointerEvents = 'none';
    canvas.style.zIndex = 0;
    if (cursorLayer) cursorLayer.style.zIndex = 1;

    // CANVAS SIZE
    const DPR = window.devicePixelRatio || 1;
    function fitCanvas() {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      if (cursorLayer) {
        cursorLayer.width = canvas.width;
        cursorLayer.height = canvas.height;
        cursorCtx && cursorCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
      }
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    window.addEventListener('resize', fitCanvas);
    fitCanvas();

    // LOCAL STATE
    const myId = 'u-' + Math.random().toString(36).slice(2, 9);
    let tool = 'brush';
    let color = (colorInput && colorInput.value) ? colorInput.value : '#000';
    let width = (widthInput && Number(widthInput.value)) ? Number(widthInput.value) : 4;
    let opLog = [];
    let undone = [];
    const remoteCursors = new Map();

    // DRAW HELPERS
    function drawOp(context, op) {
      if (!op || !Array.isArray(op.points) || op.points.length === 0) return;
      context.save();

      if (op.tool === 'eraser') {
        context.globalCompositeOperation = 'destination-out';
      } else {
        context.globalCompositeOperation = 'source-over';
        context.strokeStyle = op.color || '#000';
      }
      context.lineWidth = op.width || 4;
      context.lineCap = 'round';
      context.lineJoin = 'round';

      const pts = op.points;
      if (pts.length === 1) {
        context.beginPath();
        context.arc(pts[0].x, pts[0].y, Math.max(1, (op.width || 4) / 2), 0, Math.PI * 2);
        context.fillStyle = op.color || '#000';
        context.fill();
      } else {
        context.beginPath();
        context.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          const p0 = pts[i - 1];
          const p1 = pts[i];
          const mx = (p0.x + p1.x) / 2;
          const my = (p0.y + p1.y) / 2;
          context.quadraticCurveTo(p0.x, p0.y, mx, my);
        }
        context.stroke();
      }
      context.restore();
    }

    function redrawAll() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const op of opLog) {
        if (op.visible === false) continue;
        drawOp(ctx, op);
      }
    }

    // DRAWING EVENTS (local)
    let drawing = false;
    let stroke = [];
    let last = null;
    canvas.style.touchAction = 'none';

    canvas.addEventListener('pointerdown', (e) => {
      drawing = true;
      const r = canvas.getBoundingClientRect();
      stroke = [{ x: e.clientX - r.left, y: e.clientY - r.top, t: Date.now() }];
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      last = stroke[0];
    });

    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;

      // broadcast cursor
      if (socket && socket.connected) socket.emit('cursor', { userId: myId, x, y, color });

      if (!drawing) return;
      const p = { x, y, t: Date.now() };
      stroke.push(p);
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (tool === 'eraser') ctx.globalCompositeOperation = 'destination-out';
      else ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = tool === 'eraser' ? '#000' : color;
      // smoothing: quad to midpoint
      const mx = (last.x + p.x) / 2;
      const my = (last.y + p.y) / 2;
      ctx.quadraticCurveTo(last.x, last.y, mx, my);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx, my);
      last = p;

      // send small updates (chunk)
      if (stroke.length >= 5 && socket && socket.connected) {
        const sendPts = stroke.slice(0, stroke.length - 3);
        stroke = stroke.slice(stroke.length - 3);
        const op = {
          id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          userId: myId,
          tool,
          color,
          width,
          points: sendPts,
          visible: true
        };
        socket.emit('stroke-chunk', { userId: myId, op });
      }
    });

    canvas.addEventListener('pointerup', (e) => {
      if (!drawing) return;
      drawing = false;
      if (stroke.length > 0) {
        const op = {
          id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          userId: myId,
          tool,
          color,
          width,
          points: stroke.slice(),
          visible: true
        };
        opLog.push(op);
        if (socket && socket.connected) socket.emit('stroke-final', { userId: myId, op });
      }
      stroke = [];
      last = null;
    });

    // UI HANDLERS
    toolButtons.forEach(b =>
      b.addEventListener('click', () => {
        tool = b.dataset.tool;
        toolButtons.forEach(btn => btn.classList.toggle('active', btn === b));
      })
    );

    swatches?.addEventListener('click', (e) => {
      const sw = e.target.closest('.sw');
      if (!sw) return;
      color = sw.dataset.color;
      if (colorInput) colorInput.value = color;
      if (colorPreview) colorPreview.style.background = color;
      swatches.querySelectorAll('.sw')?.forEach(s => s.classList.toggle('selected', s === sw));
    });

    colorInput?.addEventListener('input', (e) => {
      color = e.target.value;
      if (colorPreview) colorPreview.style.background = color;
    });

    openColor?.addEventListener('click', () => colorInput?.click());
    widthInput?.addEventListener('input', (e) => (width = Number(e.target.value)));

    undoBtn?.addEventListener('click', () => {
      let lastId = null;
      for (let i = opLog.length - 1; i >= 0; i--) {
        if (opLog[i].visible !== false) {
          lastId = opLog[i].id;
          break;
        }
      }
      if (socket && socket.connected) socket.emit('undo', { id: lastId });
    });

    redoBtn?.addEventListener('click', () => {
      const id = undone.pop();
      if (socket && socket.connected && id) socket.emit('redo', { id });
    });
    // 💾 SAVE CANVAS AS IMAGE
    const saveBtn = document.getElementById('save');
    saveBtn?.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = `drawing-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });


    // CURSORS
    function renderCursors() {
      if (!cursorCtx || !cursorLayer) return;
      cursorCtx.clearRect(0, 0, cursorLayer.width, cursorLayer.height);
      const now = Date.now();
      for (const [uid, c] of remoteCursors.entries()) {
        if (c.expires && c.expires < now) {
          remoteCursors.delete(uid);
          continue;
        }
        cursorCtx.beginPath();
        cursorCtx.arc(c.x, c.y, 5, 0, Math.PI * 2);
        cursorCtx.fillStyle = c.color || '#f00';
        cursorCtx.fill();
      }
    }
    setInterval(renderCursors, 60);

    // --- Stitching map for incoming chunks (avoids dotted remote strokes) ---
    const partialStrokeMap = new Map(); // userId -> { points: [...], lastTs }

    // SOCKET EVENTS (with stitched op handler)
    if (socket) {
      socket.on('connect', () => {
        socket.emit('join', { room: 'default', userId: myId, color });
      });

      socket.on('init-state', ({ opLog: serverOps } = {}) => {
        opLog = Array.isArray(serverOps) ? serverOps.slice() : [];
        redrawAll();
      });

      socket.on('op', (op) => {
        // validate
        if (!op || !op.id) return;

        // If undo/redo toggles visibility, handle that immediately
        if (typeof op.visible !== 'undefined' && op.points == null) {
          // find existing op & toggle
          const existing = opLog.find(o => o.id === op.id);
          if (existing) {
            existing.visible = op.visible !== false;
            if (op.visible === false) undone.push(op.id);
            redrawAll();
          }
          return;
        }

        // stitch/draw incoming op (chunk or final)
        const uid = op.userId || 'unknown';
        const isFinal = !!op.id && String(op.id).startsWith('s-'); // our final ops use s- prefix

        if (Array.isArray(op.points) && op.points.length > 0) {
          // If we already have a local op with same id, just update visibility
          const localExisting = opLog.find(o => o.id === op.id);
          if (localExisting) {
            localExisting.visible = op.visible !== false;
            return;
          }

          const partial = partialStrokeMap.get(uid);

          if (partial && Array.isArray(partial.points) && partial.points.length > 0) {
            // draw a smooth connector from partial tail to new incoming points
            const connector = [];
            // include last tail point so curve starts smoothly
            const lastTail = partial.points[partial.points.length - 1];
            connector.push({ x: lastTail.x, y: lastTail.y });
            for (const p of op.points) connector.push({ x: p.x, y: p.y });

            try {
              drawOp(ctx, {
                tool: op.tool,
                color: op.color,
                width: op.width,
                points: connector,
                visible: true
              });
            } catch (e) {
              console.error('draw connector error', e);
            }

            // update partial tail to last few points for future connectors
            const tail = connector.slice(-3);
            partialStrokeMap.set(uid, { points: tail, lastTs: Date.now() });
          } else {
            // no partial: draw the op as-is
            try {
              drawOp(ctx, op);
            } catch (e) {
              console.error('draw op error', e);
            }
            const tail = op.points.slice(-3);
            partialStrokeMap.set(uid, { points: tail, lastTs: Date.now() });
          }

          // store op in opLog so undo/redo works (chunks and finals)
          opLog.push(op);

          // If this op is marked final, remove partial for that user (stroke complete)
          if (isFinal) partialStrokeMap.delete(uid);
        } else {
          // fallback: store and redraw if it is weird op
          opLog.push(op);
          redrawAll();
        }

        // cleanup old partials (>3s)
        const now = Date.now();
        for (const [k, v] of partialStrokeMap.entries()) {
          if (v.lastTs && now - v.lastTs > 3000) partialStrokeMap.delete(k);
        }
      });

      socket.on('cursor', (c) => {
        remoteCursors.set(c.userId, { ...c, expires: Date.now() + 1500 });
      });

      socket.on('users', (list) => {
        usersEl.textContent = 'Users: ' + (Array.isArray(list) && list.length ? list.map(u => u.userId).join(', ') : '—');
      });
    } else {
      console.log('socket.io client not found — running local-only.');
    }

    console.log('✅ Canvas ready! Draw anywhere.');
  });
})();
